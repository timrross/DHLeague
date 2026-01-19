import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { and, asc, eq, inArray } from "drizzle-orm";
import {
  raceResultImports,
  raceResults,
  raceScores,
  raceSnapshots,
  races,
  riderCostUpdates,
  seasons,
  teamMembers,
  teams,
  users,
} from "@shared/schema";
import { db, pool } from "../db";
import { resetDatabase } from "./dbReset";
import { loadSeedFile, upsertRiders } from "./seed-utils";
import { setFeatureFlags } from "../services/features";
import { lockRace } from "../services/game/lockRace";
import { upsertRaceResults } from "../services/game/races";
import { settleRace } from "../services/game/settleRace";
import { upsertTeamRoster } from "../services/game/teams";
import { countTransfers, type TransferRoster } from "../services/game/transfers";
import { useJokerCardForUser } from "../services/game/joker";
import { getEditingWindow } from "../services/game/editingWindow";
import { toDbTeamType } from "../services/game/normalize";
import { now as clockNow } from "../utils/clock";
import type { ResultStatus } from "../services/game/config";

type ScenarioMeta = {
  name: string;
  seed?: string;
  featureFlags?: {
    juniorTeamEnabled?: boolean;
  };
};

type ScenarioUser = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
};

type ScenarioSeedData = {
  season: {
    name: string;
    startAt: string;
    endAt: string;
  };
  ridersFixture: string;
  users: ScenarioUser[];
};

type ScenarioRound = {
  roundId: string;
  name: string;
  location: string;
  country: string;
  discipline?: string;
  startAt: string;
  lockAt: string;
  teamsBeforeLock?: Record<string, Record<string, string>>;
  finalResults: Record<string, string>;
  postRoundActions?: {
    transfers?: Record<string, Record<string, string>>;
    joker?: Record<string, { teamType: string }>;
  };
};

type ScenarioAssertions = {
  expectedScoreboard?: string;
  expectedRoundAudit?: Record<string, string>;
};

type ScenarioDefinition = {
  meta: ScenarioMeta;
  seedData: ScenarioSeedData;
  rounds: ScenarioRound[];
  assertions?: ScenarioAssertions;
};

type TeamFixture = {
  teamType: string;
  name?: string;
  starters: Array<{ slotIndex: number; uciId: string }>;
  bench: { uciId: string } | null;
};

type ResultsFixture = {
  roundId?: string;
  event?: string;
  isFinal?: boolean;
  results: Array<{
    uciId: string;
    status: string;
    position: number | null;
    qualificationPosition?: number | null;
  }>;
};

type RoundAudit = {
  roundId: string;
  raceId: number;
  users: Array<{
    userId: string;
    teamType: string;
    snapshot: {
      totalCostAtLock: number;
      starters: Array<{
        uciId: string;
        gender: string;
        costAtLock: number | null;
      }>;
      bench: { uciId: string; gender: string; costAtLock: number | null } | null;
    };
    score: {
      totalPoints: number;
      starters: Array<{
        slotIndex: number | null;
        uciId: string;
        status: string;
        position: number | null;
        finalPoints: number;
      }>;
      bench: {
        uciId: string;
        status: string;
        position: number | null;
        finalPoints: number;
      } | null;
      substitution: {
        applied: boolean;
        benchUciId: string | null;
        replacedStarterIndex: number | null;
        reason: string;
      };
    };
    seasonTotal: number;
    transfersRemaining: number | null;
    jokerUsed: boolean;
  }>;
};

type ScoreboardOutput = {
  seasonId: number;
  seasonName: string;
  users: Array<{
    userId: string;
    totalPoints: number;
    rounds: Array<{ roundId: string; points: number }>;
  }>;
};

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
};

const setTestNow = (iso: string) => {
  process.env.TEST_NOW_ISO = iso;
};

const resolveFixturePath = (scenarioPath: string, ref: string) => {
  if (path.isAbsolute(ref)) {
    return ref;
  }
  return path.resolve(path.dirname(scenarioPath), ref);
};

const readJson = async <T>(filePath: string): Promise<T> => {
  const contents = await fs.readFile(filePath, "utf-8");
  return JSON.parse(contents) as T;
};

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

const mapEventToResultSet = (event: string) => {
  const normalized = event.trim().toUpperCase();
  if (normalized === "EM") {
    return { gender: "male", category: "elite" } as const;
  }
  if (normalized === "EW") {
    return { gender: "female", category: "elite" } as const;
  }
  if (normalized === "JM") {
    return { gender: "male", category: "junior" } as const;
  }
  if (normalized === "JW") {
    return { gender: "female", category: "junior" } as const;
  }
  throw new Error(`Unsupported event code: ${event}`);
};

type RaceStatus = "scheduled" | "locked" | "provisional" | "final" | "settled";

const assertRaceStatus = async (
  raceId: number,
  expectedStatus: RaceStatus,
  context: string,
) => {
  const [race] = await db.select().from(races).where(eq(races.id, raceId));
  if (!race) {
    throw new Error(`Race ${raceId} not found when asserting status (${context})`);
  }
  if (race.gameStatus !== expectedStatus) {
    throw new Error(
      `Race status assertion failed (${context}): expected "${expectedStatus}", got "${race.gameStatus}"`,
    );
  }
};

const assertJokerApplied = async (
  userId: string,
  teamType: string,
  seasonId: number,
  context: string,
) => {
  // Verify team still exists
  const dbTeamType = toDbTeamType(teamType as "ELITE" | "JUNIOR");
  const [team] = await db
    .select()
    .from(teams)
    .where(
      and(
        eq(teams.userId, userId),
        eq(teams.seasonId, seasonId),
        eq(teams.teamType, dbTeamType),
      ),
    );

  if (!team) {
    throw new Error(`Joker assertion failed (${context}): team was deleted instead of roster being cleared`);
  }

  // Verify roster is empty
  const members = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.teamId, team.id));

  if (members.length > 0) {
    throw new Error(
      `Joker assertion failed (${context}): expected empty roster, found ${members.length} members`,
    );
  }

  // Verify user joker state
  const [userRow] = await db.select().from(users).where(eq(users.id, userId));
  if (!userRow) {
    throw new Error(`Joker assertion failed (${context}): user not found`);
  }
  if (!userRow.jokerCardUsed) {
    throw new Error(`Joker assertion failed (${context}): jokerCardUsed should be true`);
  }
  if (userRow.jokerActiveTeamType !== dbTeamType) {
    throw new Error(
      `Joker assertion failed (${context}): jokerActiveTeamType expected "${dbTeamType}", got "${userRow.jokerActiveTeamType}"`,
    );
  }
};

const collectRoster = async (teamId: number): Promise<TransferRoster<string>> => {
  const members = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));

  const starters = members
    .filter((member) => member.role === "STARTER")
    .sort((a, b) => (a.starterIndex ?? 0) - (b.starterIndex ?? 0))
    .map((member) => member.uciId);
  const bench = members.find((member) => member.role === "BENCH");

  return {
    starters,
    benchId: bench?.uciId ?? null,
  };
};

const assertTransfers = async (params: {
  userId: string;
  seasonId: number;
  teamType: string;
  previousTeam: typeof teams.$inferSelect;
  previousRoster: TransferRoster<string>;
  nextRoster: TransferRoster<string>;
  nextTeam: typeof teams.$inferSelect;
}) => {
  const { userId, seasonId, teamType, previousTeam, previousRoster, nextRoster, nextTeam } = params;
  const editingWindow = await getEditingWindow(seasonId);
  if (!editingWindow.nextRace) {
    return;
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) {
    return;
  }

  const dbTeamType = toDbTeamType(teamType);
  const jokerActive =
    user.jokerActiveRaceId === editingWindow.nextRace.id &&
    user.jokerActiveTeamType === dbTeamType;

  const priorTransfersUsed =
    previousTeam.currentRaceId === editingWindow.nextRace.id
      ? previousTeam.swapsUsed ?? 0
      : 0;
  const transferCount = countTransfers(previousRoster, nextRoster);
  const enforceTransfers = editingWindow.hasSettledRounds && !jokerActive;
  const expectedUsed = enforceTransfers ? priorTransfersUsed + transferCount : 0;
  const expectedRemaining = enforceTransfers ? Math.max(0, 2 - expectedUsed) : 2;

  if (nextTeam.swapsUsed !== expectedUsed || nextTeam.swapsRemaining !== expectedRemaining) {
    throw new Error(
      `Transfer mismatch for ${userId} (${teamType}): expected ${expectedUsed}/${expectedRemaining}, got ${nextTeam.swapsUsed}/${nextTeam.swapsRemaining}`,
    );
  }
};

const saveTeamFromFixture = async (params: {
  scenarioPath: string;
  seasonId: number;
  userId: string;
  fixturePath: string;
}) => {
  const fixture = await readJson<TeamFixture>(resolveFixturePath(params.scenarioPath, params.fixturePath));
  const starters = fixture.starters.map((starter) => ({
    uciId: starter.uciId,
    starterIndex: starter.slotIndex,
  }));
  const bench = fixture.bench ? { uciId: fixture.bench.uciId } : null;

  const existingTeam = await db
    .select()
    .from(teams)
    .where(and(eq(teams.userId, params.userId), eq(teams.seasonId, params.seasonId), eq(teams.teamType, toDbTeamType(fixture.teamType))))
    .limit(1);

  const previousTeam = existingTeam[0] ?? null;
  const previousRoster = previousTeam ? await collectRoster(previousTeam.id) : null;

  const result = await upsertTeamRoster(params.userId, params.seasonId, fixture.teamType, {
    name: fixture.name,
    starters,
    bench,
  });

  const nextRoster: TransferRoster<string> = {
    starters: result.starters.map((starter) => starter.uciId),
    benchId: result.bench?.uciId ?? null,
  };

  if (previousTeam && previousRoster) {
    await assertTransfers({
      userId: params.userId,
      seasonId: params.seasonId,
      teamType: fixture.teamType,
      previousTeam,
      previousRoster,
      nextRoster,
      nextTeam: result.team,
    });
  }

  return result;
};

const ingestResults = async (params: {
  scenarioPath: string;
  raceId: number;
  event: string;
  fixturePath: string;
}) => {
  const fixture = await readJson<ResultsFixture>(resolveFixturePath(params.scenarioPath, params.fixturePath));
  const now = clockNow();
  const normalizedResults = fixture.results.map((result) => ({
    ...result,
    status: String(result.status ?? "").toUpperCase() as ResultStatus,
  }));

  const outcome = await upsertRaceResults({
    raceId: params.raceId,
    results: normalizedResults,
    isFinal: fixture.isFinal ?? true,
  });

  const { gender, category } = mapEventToResultSet(params.event);
  await db
    .insert(raceResultImports)
    .values({
      raceId: params.raceId,
      gender,
      category,
      discipline: "DHI",
      sourceUrl: params.fixturePath,
      isFinal: fixture.isFinal ?? true,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        raceResultImports.raceId,
        raceResultImports.gender,
        raceResultImports.category,
        raceResultImports.discipline,
      ],
      set: {
        sourceUrl: params.fixturePath,
        isFinal: fixture.isFinal ?? true,
        updatedAt: now,
      },
    });

  return outcome;
};

const buildRoundAudit = async (params: {
  roundId: string;
  raceId: number;
  userOrder: string[];
  cumulativeTotals: Map<string, number>;
  teamTypes: string[];
}): Promise<RoundAudit> => {
  const snapshots = await db
    .select()
    .from(raceSnapshots)
    .where(eq(raceSnapshots.raceId, params.raceId));
  const scores = await db
    .select()
    .from(raceScores)
    .where(eq(raceScores.raceId, params.raceId));

  const snapshotByKey = new Map(
    snapshots.map((snapshot) => [`${snapshot.userId}:${snapshot.teamType}`, snapshot]),
  );
  const scoreByKey = new Map(
    scores.map((score) => [`${score.userId}:${score.teamType}`, score]),
  );

  const usersForRound = params.userOrder.flatMap((userId) =>
    params.teamTypes.map((teamType) => ({ userId, teamType })),
  );

  const userRows = await db
    .select()
    .from(users)
    .where(inArray(users.id, params.userOrder));
  const userById = new Map(userRows.map((user) => [user.id, user]));

  const teamRows = await db
    .select()
    .from(teams)
    .where(inArray(teams.userId, params.userOrder));
  const teamByKey = new Map(teamRows.map((team) => [`${team.userId}:${team.teamType}`, team]));

  const usersAudit = usersForRound.map(({ userId, teamType }) => {
    const snapshot = snapshotByKey.get(`${userId}:${teamType}`);
    const score = scoreByKey.get(`${userId}:${teamType}`);
    const team = teamByKey.get(`${userId}:${toDbTeamType(teamType)}`);
    const user = userById.get(userId);

    const starters = parseJson<Array<{ uciId: string; gender: string; costAtLock?: number | null }>>(
      snapshot?.startersJson,
      [],
    );
    const bench = parseJson<{ uciId: string; gender: string; costAtLock?: number | null } | null>(
      snapshot?.benchJson,
      null,
    );
    const breakdown = parseJson<{
      starters: Array<{
        slotIndex: number | null;
        uciId: string;
        status: string;
        position: number | null;
        finalPoints: number;
      }>;
      bench: {
        uciId: string;
        status: string;
        position: number | null;
        finalPoints: number;
      } | null;
      substitution: {
        applied: boolean;
        benchUciId: string | null;
        replacedStarterIndex: number | null;
        reason: string;
      };
    } | null>(score?.breakdownJson, null);

    const startersBreakdown = (breakdown?.starters ?? [])
      .slice()
      .sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0))
      .map((starter) => ({
        slotIndex: starter.slotIndex ?? null,
        uciId: starter.uciId,
        status: starter.status,
        position: starter.position ?? null,
        finalPoints: starter.finalPoints,
      }));

    const benchBreakdown = breakdown?.bench
      ? {
          uciId: breakdown.bench.uciId,
          status: breakdown.bench.status,
          position: breakdown.bench.position ?? null,
          finalPoints: breakdown.bench.finalPoints,
        }
      : null;

    const totalPoints = score?.totalPoints ?? 0;
    const seasonTotal = (params.cumulativeTotals.get(userId) ?? 0) + totalPoints;
    params.cumulativeTotals.set(userId, seasonTotal);

    return {
      userId,
      teamType,
      snapshot: {
        totalCostAtLock: snapshot?.totalCostAtLock ?? 0,
        starters: starters.map((starter) => ({
          uciId: starter.uciId,
          gender: starter.gender,
          costAtLock: starter.costAtLock ?? null,
        })),
        bench: bench
          ? {
              uciId: bench.uciId,
              gender: bench.gender,
              costAtLock: bench.costAtLock ?? null,
            }
          : null,
      },
      score: {
        totalPoints,
        starters: startersBreakdown,
        bench: benchBreakdown,
        substitution: breakdown?.substitution ?? {
          applied: false,
          benchUciId: bench?.uciId ?? null,
          replacedStarterIndex: null,
          reason: "NO_SCORE",
        },
      },
      seasonTotal,
      transfersRemaining: team?.swapsRemaining ?? null,
      jokerUsed: user?.jokerCardUsed ?? false,
    };
  });

  return {
    roundId: params.roundId,
    raceId: params.raceId,
    users: usersAudit,
  };
};

const buildScoreboard = (params: {
  seasonId: number;
  seasonName: string;
  rounds: ScenarioRound[];
  roundTotals: Map<string, Map<string, number>>;
  userOrder: string[];
}): ScoreboardOutput => {
  const usersOutput = params.userOrder.map((userId) => {
    const rounds = params.rounds.map((round) => ({
      roundId: round.roundId,
      points: params.roundTotals.get(round.roundId)?.get(userId) ?? 0,
    }));
    const totalPoints = rounds.reduce((sum, round) => sum + round.points, 0);
    return { userId, totalPoints, rounds };
  });

  usersOutput.sort((a, b) => b.totalPoints - a.totalPoints || a.userId.localeCompare(b.userId));

  return {
    seasonId: params.seasonId,
    seasonName: params.seasonName,
    users: usersOutput,
  };
};

const renderReport = (params: {
  scenarioName: string;
  scoreboard: ScoreboardOutput;
  roundAudits: RoundAudit[];
  roundCostUpdates: Map<string, Array<{ uciId: string; delta: number; updatedCost: number }>>;
}) => {
  const lines: string[] = [];
  lines.push(`# Season Scenario Report: ${params.scenarioName}`);
  lines.push("");
  lines.push("## Final Leaderboard");
  params.scoreboard.users.forEach((user, index) => {
    lines.push(`${index + 1}. ${user.userId} - ${user.totalPoints} pts`);
  });

  for (const round of params.roundAudits) {
    lines.push("");
    lines.push(`## ${round.roundId}`);
    const substitutions = round.users.filter((user) => user.score.substitution.applied);
    if (substitutions.length > 0) {
      lines.push("### Substitutions");
      substitutions.forEach((user) => {
        lines.push(
          `- ${user.userId} (${user.teamType}): bench ${user.score.substitution.benchUciId} replaced slot ${user.score.substitution.replacedStarterIndex}`,
        );
      });
    }

    const costUpdates = (params.roundCostUpdates.get(round.roundId) ?? []).filter(
      (update) => update.delta !== 0,
    );
    if (costUpdates.length > 0) {
      lines.push("### Rider Cost Updates");
      costUpdates.forEach((update) => {
        lines.push(`- ${update.uciId}: ${update.delta >= 0 ? "+" : ""}${update.delta} -> ${update.updatedCost}`);
      });
    }
  }

  return lines.join("\n");
};

const diffJson = (expected: unknown, actual: unknown, pathLabel = "$"): string | null => {
  if (expected === actual) return null;

  if (typeof expected !== "object" || expected === null || typeof actual !== "object" || actual === null) {
    return `${pathLabel}: expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`;
  }

  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual)) {
      return `${pathLabel}: expected array=${Array.isArray(expected)} but got array=${Array.isArray(actual)}`;
    }
    if (expected.length !== actual.length) {
      return `${pathLabel}: expected length ${expected.length} but got ${actual.length}`;
    }
    for (let i = 0; i < expected.length; i += 1) {
      const diff = diffJson(expected[i], actual[i], `${pathLabel}[${i}]`);
      if (diff) return diff;
    }
    return null;
  }

  const expectedKeys = Object.keys(expected as Record<string, unknown>).sort();
  const actualKeys = Object.keys(actual as Record<string, unknown>).sort();
  if (expectedKeys.join(",") !== actualKeys.join(",")) {
    return `${pathLabel}: expected keys ${expectedKeys.join(",")} but got ${actualKeys.join(",")}`;
  }

  for (const key of expectedKeys) {
    const diff = diffJson(
      (expected as Record<string, unknown>)[key],
      (actual as Record<string, unknown>)[key],
      `${pathLabel}.${key}`,
    );
    if (diff) return diff;
  }

  return null;
};

export async function runScenario(scenarioPath: string) {
  const scenario = await readJson<ScenarioDefinition>(scenarioPath);
  const scenarioName = scenario.meta.name;

  const juniorEnabled = scenario.meta.featureFlags?.juniorTeamEnabled ?? false;
  process.env.FEATURE_JUNIOR_TEAM_ENABLED = juniorEnabled ? "true" : "false";
  setFeatureFlags({ JUNIOR_TEAM_ENABLED: juniorEnabled });
  const teamTypes = juniorEnabled ? ["ELITE", "JUNIOR"] : ["ELITE"];

  // Set test mode flag before reset to skip placeholder race seeding
  setTestNow(new Date().toISOString());

  await resetDatabase();

  const existingSeason = await db
    .select()
    .from(seasons)
    .orderBy(asc(seasons.id))
    .limit(1);
  let seasonId: number;
  if (existingSeason[0]) {
    seasonId = existingSeason[0].id;
    await db
      .update(seasons)
      .set({
        name: scenario.seedData.season.name,
        startAt: new Date(scenario.seedData.season.startAt),
        endAt: new Date(scenario.seedData.season.endAt),
      })
      .where(eq(seasons.id, seasonId));
  } else {
    const seasonInsert = await db
      .insert(seasons)
      .values({
        name: scenario.seedData.season.name,
        startAt: new Date(scenario.seedData.season.startAt),
        endAt: new Date(scenario.seedData.season.endAt),
      })
      .returning();
    seasonId = seasonInsert[0].id;
  }

  if (scenario.seedData.users.length > 0) {
    await db.insert(users).values(
      scenario.seedData.users.map((user) => ({
        id: user.id,
        email: user.email ?? `${user.id}@example.com`,
        firstName: user.firstName ?? user.id,
        lastName: user.lastName ?? "User",
      })),
    );
  }

  const ridersFixturePath = resolveFixturePath(scenarioPath, scenario.seedData.ridersFixture);
  const riders = await loadSeedFile<any>(ridersFixturePath);
  await upsertRiders(riders);

  const roundIds = new Map<string, number>();
  for (const round of scenario.rounds) {
    const startDate = new Date(round.startAt);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    const [created] = await db
      .insert(races)
      .values({
        seasonId,
        name: round.name,
        location: round.location,
        country: round.country,
        discipline: round.discipline ?? "DHI",
        startDate,
        endDate,
        lockAt: new Date(round.lockAt),
        gameStatus: "scheduled",
        needsResettle: false,
      })
      .returning();
    roundIds.set(round.roundId, created.id);
  }

  const outputBase = path.resolve(process.cwd(), "tmp", "scenario", scenarioName);
  await ensureDir(outputBase);
  await ensureDir(path.join(outputBase, "rounds"));

  const userOrder = scenario.seedData.users.map((user) => user.id);
  const cumulativeTotals = new Map<string, number>();
  const roundTotals = new Map<string, Map<string, number>>();
  const roundAudits: RoundAudit[] = [];
  const roundCostUpdates = new Map<string, Array<{ uciId: string; delta: number; updatedCost: number }>>();

  for (let i = 0; i < scenario.rounds.length; i += 1) {
    const round = scenario.rounds[i];
    const raceId = roundIds.get(round.roundId);
    if (!raceId) {
      throw new Error(`Missing race mapping for ${round.roundId}`);
    }

    const lockAt = new Date(round.lockAt);
    setTestNow(new Date(lockAt.getTime() - 60 * 60 * 1000).toISOString());

    if (round.teamsBeforeLock) {
      for (const [userId, teamEntries] of Object.entries(round.teamsBeforeLock)) {
        for (const fixturePath of Object.values(teamEntries)) {
          await saveTeamFromFixture({
            scenarioPath,
            seasonId,
            userId,
            fixturePath,
          });
        }
      }
    }

    setTestNow(new Date(lockAt.getTime() + 60 * 1000).toISOString());
    const lockResult = await lockRace(raceId);
    if (!lockResult.locked && lockResult.status !== "locked") {
      throw new Error(`Race ${round.roundId} did not lock as expected`);
    }
    await assertRaceStatus(raceId, "locked", `after locking ${round.roundId}`);

    const snapshots = await db
      .select()
      .from(raceSnapshots)
      .where(eq(raceSnapshots.raceId, raceId));
    if (round.teamsBeforeLock && snapshots.length === 0) {
      throw new Error(`No snapshots created for ${round.roundId}`);
    }

    const resultEntries = Object.entries(round.finalResults);
    if (resultEntries.length === 0) {
      throw new Error(`Round ${round.roundId} has no results fixtures`);
    }

    if (resultEntries[0]) {
      const [event, fixturePath] = resultEntries[0];
      await ingestResults({ scenarioPath, raceId, event, fixturePath });
      if (i === 0) {
        try {
          await settleRace(raceId);
          throw new Error(`Expected settlement to fail before all finals for ${round.roundId}`);
        } catch (error) {
          if (error instanceof Error && !/missing final results/i.test(error.message)) {
            throw error;
          }
        }
      }
    }

    for (const [event, fixturePath] of resultEntries.slice(1)) {
      await ingestResults({ scenarioPath, raceId, event, fixturePath });
    }
    await assertRaceStatus(raceId, "final", `after ingesting results for ${round.roundId}`);

    // Settle the race (this also applies rider cost updates internally)
    await settleRace(raceId);
    await assertRaceStatus(raceId, "settled", `after settling ${round.roundId}`);
    // Call again to verify idempotency
    await settleRace(raceId);
    await assertRaceStatus(raceId, "settled", `after idempotent re-settle of ${round.roundId}`);

    const nextRound = scenario.rounds[i + 1];
    if (round.postRoundActions && nextRound) {
      setTestNow(new Date(new Date(nextRound.lockAt).getTime() - 60 * 60 * 1000).toISOString());

      const transfers = round.postRoundActions.transfers ?? {};
      for (const [userId, teamEntries] of Object.entries(transfers)) {
        for (const fixturePath of Object.values(teamEntries)) {
          await saveTeamFromFixture({
            scenarioPath,
            seasonId,
            userId,
            fixturePath,
          });
        }
      }

      const jokers = round.postRoundActions.joker ?? {};
      for (const [userId, jokerConfig] of Object.entries(jokers)) {
        await useJokerCardForUser(userId, jokerConfig.teamType, seasonId);
        await assertJokerApplied(
          userId,
          jokerConfig.teamType,
          seasonId,
          `after joker for ${userId} in ${round.roundId}`,
        );
      }
    }

    const audit = await buildRoundAudit({
      roundId: round.roundId,
      raceId,
      userOrder,
      cumulativeTotals,
      teamTypes,
    });
    roundAudits.push(audit);

    const roundTotalMap = new Map<string, number>();
    audit.users.forEach((user) => {
      roundTotalMap.set(
        user.userId,
        (roundTotalMap.get(user.userId) ?? 0) + user.score.totalPoints,
      );
    });
    roundTotals.set(round.roundId, roundTotalMap);

    const costRows = await db
      .select()
      .from(riderCostUpdates)
      .where(eq(riderCostUpdates.raceId, raceId));
    roundCostUpdates.set(
      round.roundId,
      costRows
        .slice()
        .sort((a, b) => a.uciId.localeCompare(b.uciId))
        .map((row) => ({
          uciId: row.uciId,
          delta: row.delta,
          updatedCost: row.updatedCost,
        })),
    );

    const auditPath = path.join(outputBase, "rounds", `${round.roundId}.json`);
    await fs.writeFile(auditPath, JSON.stringify(audit, null, 2));
  }

  const scoreboard = buildScoreboard({
    seasonId,
    seasonName: scenario.seedData.season.name,
    rounds: scenario.rounds,
    roundTotals,
    userOrder,
  });
  await fs.writeFile(
    path.join(outputBase, "scoreboard.json"),
    JSON.stringify(scoreboard, null, 2),
  );

  const report = renderReport({
    scenarioName,
    scoreboard,
    roundAudits,
    roundCostUpdates,
  });
  await fs.writeFile(path.join(outputBase, "report.md"), report);

  if (scenario.assertions?.expectedScoreboard) {
    const expectedScoreboard = await readJson<ScoreboardOutput>(
      resolveFixturePath(scenarioPath, scenario.assertions.expectedScoreboard),
    );
    const diff = diffJson(expectedScoreboard, scoreboard);
    if (diff) {
      throw new Error(`Scoreboard mismatch: ${diff}`);
    }
  }

  if (scenario.assertions?.expectedRoundAudit) {
    for (const [roundId, fixturePath] of Object.entries(
      scenario.assertions.expectedRoundAudit,
    )) {
      const expectedAudit = await readJson<RoundAudit>(
        resolveFixturePath(scenarioPath, fixturePath),
      );
      const actualAudit = roundAudits.find((audit) => audit.roundId === roundId);
      if (!actualAudit) {
        throw new Error(`Missing audit output for ${roundId}`);
      }
      const diff = diffJson(expectedAudit, actualAudit);
      if (diff) {
        throw new Error(`Audit mismatch for ${roundId}: ${diff}`);
      }
    }
  }
}

async function main() {
  const scenarioPath = process.argv[2];
  if (!scenarioPath) {
    console.error("Usage: node server/scripts/runSeasonScenario.js <scenario.json>");
    process.exit(1);
  }

  await runScenario(path.resolve(process.cwd(), scenarioPath));
  console.log("Season scenario complete");
  await pool.end();
}

const isDirect = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirect) {
  main().catch((error) => {
    console.error("Season scenario failed", error);
    process.exit(1);
  });
}
