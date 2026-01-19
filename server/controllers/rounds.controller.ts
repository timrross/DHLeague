import { type Response } from "express";
import { storage } from "../storage";
import { FEATURES } from "../services/features";
import { now as clockNow } from "../utils/clock";

const CLOSED_STATUSES = new Set(["locked", "settled"]);

const isEditingOpen = (lockAt: Date | null | undefined, gameStatus?: string | null) => {
  if (!lockAt) return false;
  const status = (gameStatus ?? "").toLowerCase();
  if (CLOSED_STATUSES.has(status)) return false;
  return clockNow().getTime() < lockAt.getTime();
};

type RoundPayload = {
  raceId: number;
  name: string;
  location: string;
  country: string;
  discipline: string;
  startDate: Date;
  endDate: Date;
  lockAt: Date | null;
  gameStatus: string;
  status?: string;
  teamType: "elite" | "junior";
  editingOpen: boolean;
};

const buildRoundPayload = (race: any, teamType: "elite" | "junior"): RoundPayload | null => {
  if (!race) return null;
  const lockAt = race.lockAt ? new Date(race.lockAt) : null;
  const gameStatus = race.gameStatus ?? "scheduled";
  return {
    raceId: race.id,
    name: race.name,
    location: race.location,
    country: race.country,
    discipline: race.discipline,
    startDate: race.startDate,
    endDate: race.endDate,
    lockAt,
    gameStatus,
    status: race.status,
    teamType,
    editingOpen: isEditingOpen(lockAt, gameStatus),
  };
};

export async function getNextRounds(_req: any, res: Response) {
  try {
    const { nextRace } = await storage.getRaceStatusBuckets();
    const elite = buildRoundPayload(nextRace, "elite");
    const junior = FEATURES.JUNIOR_TEAM_ENABLED
      ? buildRoundPayload(nextRace, "junior")
      : null;

    res.json({ elite, junior });
  } catch (error) {
    console.error("Error fetching next rounds:", error);
    res.status(500).json({ message: "Failed to fetch next rounds" });
  }
}
