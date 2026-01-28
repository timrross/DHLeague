import { Request, Response } from "express";
import { inArray, eq, and } from "drizzle-orm";
import { db } from "../db";
import { teams, users } from "@shared/schema";
import { getActiveSeasonId } from "../services/game/seasons";
import { getSeasonStandings } from "../services/game/standings";

/**
 * Get the leaderboard data
 */
export async function getLeaderboard(_req: Request, res: Response) {
  try {
    const seasonId = await getActiveSeasonId();
    const teamType = "elite";
    const standings = await getSeasonStandings(seasonId, teamType);

    const userIds = standings.map((entry) => entry.userId);
    const [userRows, teamRows] = userIds.length
      ? await Promise.all([
          db.select().from(users).where(inArray(users.id, userIds)),
          db
            .select({
              userId: teams.userId,
              teamName: teams.name,
            })
            .from(teams)
            .where(and(eq(teams.seasonId, seasonId), eq(teams.teamType, teamType))),
        ])
      : [[], []];

    const usernamesById = new Map(
      userRows.map((user) => [user.id, user.username ?? null]),
    );
    const teamNameByUserId = new Map(
      teamRows.map((team) => [team.userId, team.teamName]),
    );

    const leaderboard = standings.map((entry) => ({
      rank: entry.rank,
      user: {
        id: entry.userId,
        username: usernamesById.get(entry.userId) ?? null,
      },
      teamName: teamNameByUserId.get(entry.userId) ?? null,
      totalPoints: entry.totalPoints,
      raceWins: entry.raceWins,
      highestSingleRaceScore: entry.highestSingleRaceScore,
      podiumFinishes: entry.podiumFinishes,
    }));

    res.json(leaderboard);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ message: "Failed to fetch leaderboard" });
  }
}
