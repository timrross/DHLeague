import { Request, Response } from "express";
import { inArray } from "drizzle-orm";
import { db } from "../db";
import { users } from "@shared/schema";
import { getActiveSeasonId } from "../services/game/seasons";
import { getSeasonStandings } from "../services/game/standings";

/**
 * Get the leaderboard data
 */
export async function getLeaderboard(_req: Request, res: Response) {
  try {
    const seasonId = await getActiveSeasonId();
    const standings = await getSeasonStandings(seasonId);

    const userIds = standings.map((entry) => entry.userId);
    const userRows = userIds.length
      ? await db.select().from(users).where(inArray(users.id, userIds))
      : [];
    const usersById = new Map(userRows.map((user) => [user.id, user]));

    const leaderboard = standings.map((entry) => ({
      rank: entry.rank,
      user: usersById.get(entry.userId) ?? {
        id: entry.userId,
        email: "",
        firstName: "",
        lastName: "",
        profileImageUrl: "",
        isAdmin: false,
        isActive: true,
        jokerCardUsed: false,
        createdAt: null,
        updatedAt: null,
      },
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
