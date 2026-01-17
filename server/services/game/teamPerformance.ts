import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import {
  raceScores,
  raceSnapshots,
  races,
  riders,
  teams,
} from "@shared/schema";
import { getActiveSeasonId } from "./seasons";
import { normalizeTeamType, toDbTeamType } from "./normalize";
import type {
  RiderBreakdown,
  SubstitutionBreakdown,
  TeamScoreBreakdown,
} from "./scoring/scoreTeamSnapshot";

type SnapshotRider = {
  uciId: string;
  gender: "male" | "female";
};

export type RiderSummary = {
  id: number | null;
  uciId: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  gender: "male" | "female" | null;
  team: string | null;
};

export type TeamPerformanceMember = {
  role: "starter" | "bench";
  slotIndex: number | null;
  status: string | null;
  position: number | null;
  points: number | null;
  rider: RiderSummary;
};

export type TeamPerformanceRound = {
  raceId: number;
  raceName: string;
  location: string;
  country: string;
  discipline: string;
  startDate: Date;
  endDate: Date;
  gameStatus: string;
  totalPoints: number | null;
  roster: {
    starters: TeamPerformanceMember[];
    bench: TeamPerformanceMember | null;
    substitution: SubstitutionBreakdown | null;
  };
};

export type TeamPerformanceSummary = {
  teamId: number;
  teamName: string;
  teamType: "elite" | "junior";
  totalPoints: number;
  rounds: TeamPerformanceRound[];
};

const parseJsonValue = <T>(value: unknown, fallback: T): T => {
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

export async function getTeamPerformance(
  userId: string,
  teamTypeInput: string,
  seasonIdInput?: number,
): Promise<TeamPerformanceSummary | null> {
  const seasonId = seasonIdInput ?? (await getActiveSeasonId());
  const normalizedTeamType = normalizeTeamType(teamTypeInput);
  const dbTeamType = toDbTeamType(normalizedTeamType);

  const teamRows = await db
    .select()
    .from(teams)
    .where(
      and(
        eq(teams.userId, userId),
        eq(teams.teamType, dbTeamType),
        eq(teams.seasonId, seasonId),
      ),
    )
    .limit(1);

  if (!teamRows.length) {
    return null;
  }

  const team = teamRows[0];

  const performanceRows = await db
    .select({
      race: races,
      snapshot: raceSnapshots,
      score: raceScores,
    })
    .from(raceSnapshots)
    .innerJoin(races, eq(raceSnapshots.raceId, races.id))
    .leftJoin(
      raceScores,
      and(
        eq(raceScores.raceId, raceSnapshots.raceId),
        eq(raceScores.userId, raceSnapshots.userId),
        eq(raceScores.teamType, raceSnapshots.teamType),
      ),
    )
    .where(
      and(
        eq(raceSnapshots.userId, userId),
        eq(raceSnapshots.teamType, normalizedTeamType),
        eq(races.seasonId, seasonId),
      ),
    )
    .orderBy(races.startDate);

  const uciIds = new Set<string>();

  for (const row of performanceRows) {
    const starters = parseJsonValue<SnapshotRider[]>(
      row.snapshot.startersJson,
      [],
    );
    const bench = parseJsonValue<SnapshotRider | null>(
      row.snapshot.benchJson,
      null,
    );

    starters.forEach((starter) => uciIds.add(starter.uciId));
    if (bench?.uciId) {
      uciIds.add(bench.uciId);
    }

    if (row.score?.breakdownJson) {
      const breakdown = parseJsonValue<TeamScoreBreakdown | null>(
        row.score.breakdownJson,
        null,
      );
      breakdown?.starters.forEach((starter) => uciIds.add(starter.uciId));
      if (breakdown?.bench?.uciId) {
        uciIds.add(breakdown.bench.uciId);
      }
    }
  }

  const riderRows = uciIds.size
    ? await db
        .select({
          id: riders.id,
          uciId: riders.uciId,
          name: riders.name,
          firstName: riders.firstName,
          lastName: riders.lastName,
          gender: riders.gender,
          team: riders.team,
        })
        .from(riders)
        .where(inArray(riders.uciId, Array.from(uciIds)))
    : [];

  const ridersByUciId = new Map(
    riderRows.map((rider) => [rider.uciId, rider]),
  );

  const buildRiderSummary = (
    uciId: string,
    fallbackGender: string | null,
  ): RiderSummary => {
    const rider = ridersByUciId.get(uciId);
    return {
      id: rider?.id ?? null,
      uciId,
      name: rider?.name ?? uciId,
      firstName: rider?.firstName ?? null,
      lastName: rider?.lastName ?? null,
      gender: (rider?.gender ??
        fallbackGender ??
        null) as RiderSummary["gender"],
      team: rider?.team ?? null,
    };
  };

  const buildMemberFromBreakdown = (
    entry: RiderBreakdown,
    role: "starter" | "bench",
  ): TeamPerformanceMember => ({
    role,
    slotIndex: entry.slotIndex ?? null,
    status: entry.status ?? null,
    position: entry.position ?? null,
    points: entry.finalPoints ?? null,
    rider: buildRiderSummary(entry.uciId, entry.gender),
  });

  const buildMemberFromSnapshot = (
    entry: SnapshotRider,
    role: "starter" | "bench",
    slotIndex: number | null,
  ): TeamPerformanceMember => ({
    role,
    slotIndex,
    status: null,
    position: null,
    points: null,
    rider: buildRiderSummary(entry.uciId, entry.gender),
  });

  const rounds: TeamPerformanceRound[] = performanceRows.map((row) => {
    const starters = parseJsonValue<SnapshotRider[]>(
      row.snapshot.startersJson,
      [],
    );
    const bench = parseJsonValue<SnapshotRider | null>(
      row.snapshot.benchJson,
      null,
    );
    const breakdown = row.score?.breakdownJson
      ? parseJsonValue<TeamScoreBreakdown | null>(
          row.score.breakdownJson,
          null,
        )
      : null;

    const roster = breakdown
      ? {
          starters: breakdown.starters
            .slice()
            .sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0))
            .map((starter) => buildMemberFromBreakdown(starter, "starter")),
          bench: breakdown.bench
            ? buildMemberFromBreakdown(breakdown.bench, "bench")
            : null,
          substitution: breakdown.substitution ?? null,
        }
      : {
          starters: starters.map((starter, index) =>
            buildMemberFromSnapshot(starter, "starter", index),
          ),
          bench: bench ? buildMemberFromSnapshot(bench, "bench", null) : null,
          substitution: null,
        };

    return {
      raceId: row.race.id,
      raceName: row.race.name,
      location: row.race.location,
      country: row.race.country,
      discipline: row.race.discipline,
      startDate: row.race.startDate,
      endDate: row.race.endDate,
      gameStatus: row.race.gameStatus ?? "scheduled",
      totalPoints: row.score?.totalPoints ?? null,
      roster,
    };
  });

  const totalPoints = performanceRows.reduce(
    (sum, row) => sum + (row.score?.totalPoints ?? 0),
    0,
  );

  return {
    teamId: team.id,
    teamName: team.name,
    teamType: team.teamType as "elite" | "junior",
    totalPoints,
    rounds,
  };
}
