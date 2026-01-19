import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { raceSnapshots, races, teamMembers, teams } from "@shared/schema";
import { BUDGETS, GAME_VERSION, type TeamType } from "./config";
import { FEATURES } from "../features";
import { hashPayload } from "./hashing";
import { toDbTeamType } from "./normalize";
import { validateTeam, type TeamStarterInput } from "./validateTeam";
import { fetchRiderProfiles } from "./riderProfiles";
import { now as clockNow } from "../../utils/clock";
import { UserFacingError } from "./errors";

export type LockRaceOptions = {
  force?: boolean;
};

const LOCK_LEAD_MS = 48 * 60 * 60 * 1000;

const buildSnapshotPayload = (params: {
  raceId: number;
  userId: string;
  teamType: TeamType;
  starters: Array<{ uciId: string; gender: string; costAtLock: number }>;
  bench: { uciId: string; gender: string; costAtLock: number } | null;
  totalCostAtLock: number;
}) => ({
  gameVersion: GAME_VERSION,
  raceId: params.raceId,
  userId: params.userId,
  teamType: params.teamType,
  starters: params.starters,
  bench: params.bench,
  totalCostAtLock: params.totalCostAtLock,
});

const getLockAt = (startDate: Date, storedLockAt?: Date | null) => {
  if (storedLockAt) {
    return new Date(storedLockAt);
  }
  return new Date(startDate.getTime() - LOCK_LEAD_MS);
};

export async function lockRace(raceId: number, options: LockRaceOptions = {}) {
  const { force = false } = options;

  return await db.transaction(async (tx) => {
    const [race] = await tx.select().from(races).where(eq(races.id, raceId));

    if (!race) {
      throw new UserFacingError(`Race ${raceId} not found`, 404);
    }

    const now = clockNow();
    const lockAt = getLockAt(new Date(race.startDate), race.lockAt ?? null);

    let didLock = false;

    if (!force && now < lockAt) {
      const status = race.gameStatus ?? "scheduled";
      return {
        raceId,
        lockedTeams: 0,
        skippedTeams: 0,
        lockAt,
        status,
        locked: status === "locked",
      };
    }

    if (race.gameStatus === "scheduled") {
      await tx
        .update(races)
        .set({ gameStatus: "locked" })
        .where(eq(races.id, raceId));
      didLock = true;
    }

    let lockedTeams = 0;
    let skippedTeams = 0;

    const teamTypes = FEATURES.JUNIOR_TEAM_ENABLED
      ? (Object.keys(BUDGETS) as TeamType[])
      : (["ELITE"] as TeamType[]);

    for (const teamType of teamTypes) {
      const dbTeamType = toDbTeamType(teamType);
      const budgetCap = BUDGETS[teamType];

      const teamRows = await tx
        .select()
        .from(teams)
        .where(
          and(
            eq(teams.seasonId, race.seasonId),
            eq(teams.teamType, dbTeamType),
          ),
        );

      if (!teamRows.length) {
        continue;
      }

      const teamIds = teamRows.map((team) => team.id);
      const memberRows = await tx
        .select()
        .from(teamMembers)
        .where(inArray(teamMembers.teamId, teamIds));

      const membersByTeam = new Map<number, typeof memberRows>();
      for (const member of memberRows) {
        const list = membersByTeam.get(member.teamId) ?? [];
        list.push(member);
        membersByTeam.set(member.teamId, list);
      }

      const uciIds = memberRows.map((member) => member.uciId);
      const ridersByUciId = await fetchRiderProfiles(uciIds, tx);

      const existingSnapshots = await tx
        .select()
        .from(raceSnapshots)
        .where(
          and(
            eq(raceSnapshots.raceId, raceId),
            eq(raceSnapshots.teamType, teamType),
          ),
        );
      const snapshotByKey = new Map(
        existingSnapshots.map((snapshot) => [
          `${snapshot.userId}:${snapshot.teamType}`,
          snapshot,
        ]),
      );

      for (const team of teamRows) {
        const members = membersByTeam.get(team.id) ?? [];
        const startersInput: TeamStarterInput[] = members
          .filter((member) => member.role === "STARTER")
          .map((member) => ({
            uciId: member.uciId,
            starterIndex: member.starterIndex ?? -1,
          }))
          .sort((a, b) => a.starterIndex - b.starterIndex);

        const benchMember = members.find((member) => member.role === "BENCH");
        const benchInput = benchMember ? { uciId: benchMember.uciId } : null;

        const validation = validateTeam(
          teamType,
          startersInput,
          benchInput,
          ridersByUciId,
          budgetCap,
        );

        if (!validation.ok) {
          skippedTeams += 1;
          continue;
        }

        const starters = startersInput.map((starter) => {
          const rider = ridersByUciId.get(starter.uciId);
          if (!rider) {
            throw new Error(
              `Rider ${starter.uciId} not found after validation passed`,
            );
          }
          return {
            uciId: starter.uciId,
            gender: rider.gender,
            costAtLock: rider.cost,
          };
        });

        let bench: { uciId: string; gender: string; costAtLock: number } | null =
          null;
        if (benchInput) {
          const benchRider = ridersByUciId.get(benchInput.uciId);
          if (!benchRider) {
            throw new Error(
              `Bench rider ${benchInput.uciId} not found after validation passed`,
            );
          }
          bench = {
            uciId: benchInput.uciId,
            gender: benchRider.gender,
            costAtLock: benchRider.cost,
          };
        }

        const totalCostAtLock =
          starters.reduce((sum, starter) => sum + starter.costAtLock, 0) +
          (bench ? bench.costAtLock : 0);

        const payload = buildSnapshotPayload({
          raceId,
          userId: team.userId,
          teamType,
          starters,
          bench,
          totalCostAtLock,
        });
        const snapshotHash = hashPayload(payload);

        const key = `${team.userId}:${teamType}`;
        const existing = snapshotByKey.get(key);

        if (!existing) {
          await tx.insert(raceSnapshots).values({
            raceId,
            userId: team.userId,
            teamType,
            startersJson: starters,
            benchJson: bench,
            totalCostAtLock,
            snapshotHash,
            createdAt: now,
          });
          lockedTeams += 1;
          continue;
        }

        if (existing.snapshotHash === snapshotHash) {
          continue;
        }

        if (!force) {
          throw new UserFacingError(
            `Snapshot mismatch for user ${team.userId} (${teamType}). Team changed after lock.`,
            409,
          );
        }

        await tx
          .update(raceSnapshots)
          .set({
            startersJson: starters,
            benchJson: bench,
            totalCostAtLock,
            snapshotHash,
          })
          .where(eq(raceSnapshots.id, existing.id));
        lockedTeams += 1;
      }
    }

    const status = didLock ? "locked" : race.gameStatus ?? "scheduled";
    return {
      raceId,
      lockedTeams,
      skippedTeams,
      lockAt,
      status,
      locked: status === "locked",
    };
  });
}
