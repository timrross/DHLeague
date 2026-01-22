import { type Request, type Response } from "express";
import { storage } from "../storage";
import { FEATURES } from "../services/features";
import { getTeamPerformance, type TeamPerformanceRound } from "../services/game/teamPerformance";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const parseSeasonId = (value: unknown) => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return undefined;
  return parsed;
};

type PerformanceRoundResponse = TeamPerformanceRound & {
  teamType: "elite" | "junior";
  category: "elite" | "junior";
  autoSubUsed: boolean;
};

const buildRoundResponse = (
  round: TeamPerformanceRound,
  teamType: "elite" | "junior",
): PerformanceRoundResponse => ({
  ...round,
  teamType,
  category: teamType,
  autoSubUsed: Boolean(round.roster.substitution?.applied),
});

export async function getUserTeams(req: Request, res: Response) {
  try {
    const userId = req.params.userId;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Check if user exists
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const seasonId = parseSeasonId(req.query.seasonId);

    const elitePromise = storage.getUserTeam(userId, "elite", seasonId);
    const juniorPromise = FEATURES.JUNIOR_TEAM_ENABLED
      ? storage.getUserTeam(userId, "junior", seasonId)
      : Promise.resolve(null);

    const [eliteTeam, juniorTeam] = await Promise.all([
      elitePromise,
      juniorPromise,
    ]);

    res.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      },
      eliteTeam: eliteTeam ?? null,
      juniorTeam: FEATURES.JUNIOR_TEAM_ENABLED ? juniorTeam ?? null : null,
    });
  } catch (error) {
    console.error("Error fetching user teams:", error);
    res.status(500).json({ message: "Failed to fetch teams" });
  }
}

export async function getUserPerformance(req: Request, res: Response) {
  try {
    const userId = req.params.userId;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Check if user exists
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const seasonId = parseSeasonId(req.query.seasonId);

    const elitePromise = getTeamPerformance(userId, "elite", seasonId);
    const juniorPromise = FEATURES.JUNIOR_TEAM_ENABLED
      ? getTeamPerformance(userId, "junior", seasonId)
      : Promise.resolve(null);

    const [elite, junior] = await Promise.all([elitePromise, juniorPromise]);

    const eliteRounds = elite?.rounds?.map((round) =>
      buildRoundResponse(round, "elite"),
    ) ?? [];
    const juniorRounds = junior?.rounds?.map((round) =>
      buildRoundResponse(round, "junior"),
    ) ?? [];

    const rounds = [...eliteRounds, ...juniorRounds].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );

    const eliteTotal = elite?.totalPoints ?? 0;
    const juniorTotal = junior?.totalPoints ?? 0;

    res.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      },
      totals: {
        elite: eliteTotal,
        junior: juniorTotal,
        combined: eliteTotal + juniorTotal,
      },
      elite,
      junior: FEATURES.JUNIOR_TEAM_ENABLED ? junior : null,
      rounds,
    });
  } catch (error) {
    console.error("Error fetching user performance:", error);
    res.status(500).json({ message: "Failed to fetch performance" });
  }
}
