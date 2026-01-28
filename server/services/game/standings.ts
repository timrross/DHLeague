import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { raceScores, races, teams } from "@shared/schema";

export type RaceLeaderboardEntry = {
  rank: number;
  userId: string;
  teamType: string;
  totalPoints: number;
};

export type SeasonStandingEntry = {
  rank: number;
  userId: string;
  totalPoints: number;
  raceWins: number;
  highestSingleRaceScore: number;
  podiumFinishes: number;
  earliestTeamCreatedAt: Date | null;
};

export async function getRaceLeaderboard(
  raceId: number,
): Promise<RaceLeaderboardEntry[]> {
  const scores = await db
    .select({
      userId: raceScores.userId,
      teamType: raceScores.teamType,
      totalPoints: raceScores.totalPoints,
    })
    .from(raceScores)
    .where(eq(raceScores.raceId, raceId))
    .orderBy(desc(raceScores.totalPoints), asc(raceScores.userId));

  return scores.map((entry, index) => ({
    rank: index + 1,
    userId: entry.userId,
    teamType: entry.teamType,
    totalPoints: entry.totalPoints,
  }));
}

export async function getSeasonStandings(
  seasonId: number,
  teamType?: "elite" | "junior",
): Promise<SeasonStandingEntry[]> {
  // Get all teams for the season (to include teams with 0 points)
  const teamWhere = teamType
    ? and(eq(teams.seasonId, seasonId), eq(teams.teamType, teamType))
    : eq(teams.seasonId, seasonId);
  const teamRows = await db
    .select({
      userId: teams.userId,
      createdAt: teams.createdAt,
    })
    .from(teams)
    .where(teamWhere);

  // Build map of earliest team creation date per user
  const earliestByUser = new Map<string, Date>();
  const allUserIds = new Set<string>();
  for (const row of teamRows) {
    allUserIds.add(row.userId);
    if (!row.createdAt) continue;
    const existing = earliestByUser.get(row.userId);
    if (!existing || row.createdAt < existing) {
      earliestByUser.set(row.userId, row.createdAt);
    }
  }

  // Get race scores for users who have them
  const scoreWhere = teamType
    ? and(eq(races.seasonId, seasonId), eq(raceScores.teamType, teamType))
    : eq(races.seasonId, seasonId);

  const scoreRows = await db
    .select({
      raceId: raceScores.raceId,
      userId: raceScores.userId,
      totalPoints: raceScores.totalPoints,
    })
    .from(raceScores)
    .innerJoin(races, eq(raceScores.raceId, races.id))
    .where(scoreWhere);

  const racesById = new Map<number, typeof scoreRows>();
  for (const row of scoreRows) {
    const list = racesById.get(row.raceId) ?? [];
    list.push(row);
    racesById.set(row.raceId, list);
  }

  // Initialize totals for ALL users with teams
  const totals = new Map<
    string,
    {
      totalPoints: number;
      raceWins: number;
      highestSingleRaceScore: number;
      podiumFinishes: number;
    }
  >();

  // Initialize all users with 0 stats
  for (const userId of allUserIds) {
    totals.set(userId, {
      totalPoints: 0,
      raceWins: 0,
      highestSingleRaceScore: 0,
      podiumFinishes: 0,
    });
  }

  // Add scores for users who have them
  for (const [, rows] of racesById) {
    const ordered = [...rows].sort((a, b) => {
      if (a.totalPoints !== b.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      return a.userId.localeCompare(b.userId);
    });

    ordered.forEach((row, index) => {
      const entry = totals.get(row.userId) ?? {
        totalPoints: 0,
        raceWins: 0,
        highestSingleRaceScore: 0,
        podiumFinishes: 0,
      };

      entry.totalPoints += row.totalPoints;
      entry.highestSingleRaceScore = Math.max(
        entry.highestSingleRaceScore,
        row.totalPoints,
      );

      if (index === 0) {
        entry.raceWins += 1;
      }

      if (index < 3) {
        entry.podiumFinishes += 1;
      }

      totals.set(row.userId, entry);
    });
  }

  const entries: SeasonStandingEntry[] = Array.from(totals.entries()).map(
    ([userId, stats]) => ({
      rank: 0,
      userId,
      totalPoints: stats.totalPoints,
      raceWins: stats.raceWins,
      highestSingleRaceScore: stats.highestSingleRaceScore,
      podiumFinishes: stats.podiumFinishes,
      earliestTeamCreatedAt: earliestByUser.get(userId) ?? null,
    }),
  );

  entries.sort((a, b) => {
    if (a.totalPoints !== b.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    if (a.raceWins !== b.raceWins) {
      return b.raceWins - a.raceWins;
    }
    if (a.highestSingleRaceScore !== b.highestSingleRaceScore) {
      return b.highestSingleRaceScore - a.highestSingleRaceScore;
    }
    if (a.podiumFinishes !== b.podiumFinishes) {
      return b.podiumFinishes - a.podiumFinishes;
    }
    if (a.earliestTeamCreatedAt && b.earliestTeamCreatedAt) {
      if (a.earliestTeamCreatedAt.getTime() !== b.earliestTeamCreatedAt.getTime()) {
        return a.earliestTeamCreatedAt.getTime() - b.earliestTeamCreatedAt.getTime();
      }
    } else if (a.earliestTeamCreatedAt && !b.earliestTeamCreatedAt) {
      return -1;
    } else if (!a.earliestTeamCreatedAt && b.earliestTeamCreatedAt) {
      return 1;
    }
    return a.userId.localeCompare(b.userId);
  });

  return entries.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}
