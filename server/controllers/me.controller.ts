import { type Response } from "express";
import { storage } from "../storage";
import { FEATURES } from "../services/features";
import { getTeamPerformance, type TeamPerformanceRound } from "../services/game/teamPerformance";

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

const normalizeUsername = (value: string) => value.trim().toLowerCase();

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

export async function getMyTeams(req: any, res: Response) {
  try {
    const userId = req.oidc?.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
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
      eliteTeam: eliteTeam ?? null,
      juniorTeam: FEATURES.JUNIOR_TEAM_ENABLED ? juniorTeam ?? null : null,
    });
  } catch (error) {
    console.error("Error fetching my teams:", error);
    res.status(500).json({ message: "Failed to fetch teams" });
  }
}

export async function getMyPerformance(req: any, res: Response) {
  try {
    const userId = req.oidc?.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
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
    console.error("Error fetching my performance:", error);
    res.status(500).json({ message: "Failed to fetch performance" });
  }
}

export async function updateMyUsername(req: any, res: Response) {
  try {
    const userId = req.oidc?.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const rawUsername =
      typeof req.body?.username === "string" ? req.body.username : "";
    const username = normalizeUsername(rawUsername);

    if (!USERNAME_PATTERN.test(username)) {
      return res.status(400).json({
        message:
          "Username must be 3-20 characters and contain only letters, numbers, or underscores.",
      });
    }

    const existingUser = await storage.getUser(userId);
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const conflict = await storage.getUserByUsername(username);
    if (conflict && conflict.id !== userId) {
      return res.status(409).json({ message: "Username already taken" });
    }

    const updated = await storage.updateUser(userId, { username });
    return res.json({ username: updated?.username ?? username });
  } catch (error) {
    console.error("Error updating username:", error);
    return res.status(500).json({ message: "Failed to update username" });
  }
}

export async function checkUsernameAvailability(req: any, res: Response) {
  try {
    const userId = req.oidc?.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const rawUsername =
      typeof req.query?.username === "string" ? req.query.username : "";
    const username = normalizeUsername(rawUsername);

    if (!USERNAME_PATTERN.test(username)) {
      return res.json({ available: false, normalized: username, reason: "invalid" });
    }

    const existing = await storage.getUserByUsername(username);
    if (!existing || existing.id === userId) {
      return res.json({ available: true, normalized: username });
    }

    return res.json({ available: false, normalized: username, reason: "taken" });
  } catch (error) {
    console.error("Error checking username availability:", error);
    return res.status(500).json({ message: "Failed to check username" });
  }
}
