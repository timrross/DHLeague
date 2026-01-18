import { asc, eq } from "drizzle-orm";
import { races, type Race } from "@shared/schema";
import { db } from "../../db";

const CLOSED_STATUSES = new Set(["locked", "settled"]);

export type EditingWindow = {
  nextRace: Race | null;
  lastStartedRace: Race | null;
  hasSettledRounds: boolean;
  editingOpen: boolean;
};

export async function getEditingWindow(
  seasonId: number,
  now: Date = new Date(),
): Promise<EditingWindow> {
  const raceRows = await db
    .select()
    .from(races)
    .where(eq(races.seasonId, seasonId))
    .orderBy(asc(races.startDate));

  if (!raceRows.length) {
    return {
      nextRace: null,
      lastStartedRace: null,
      hasSettledRounds: false,
      editingOpen: false,
    };
  }

  const hasSettledRounds = raceRows.some((race) => race.gameStatus === "settled");
  const lastStartedRace =
    raceRows.filter((race) => new Date(race.startDate) <= now).pop() ?? null;
  const nextRace =
    raceRows.find((race) => new Date(race.startDate) > now) ?? null;

  const readyForEdits = !lastStartedRace || lastStartedRace.gameStatus === "settled";
  const nextLockAt = nextRace?.lockAt ? new Date(nextRace.lockAt) : null;
  const nextStatus = String(nextRace?.gameStatus ?? "scheduled").toLowerCase();

  const editingOpen =
    Boolean(nextRace) &&
    readyForEdits &&
    Boolean(nextLockAt) &&
    now < (nextLockAt as Date) &&
    !CLOSED_STATUSES.has(nextStatus);

  return {
    nextRace,
    lastStartedRace,
    hasSettledRounds,
    editingOpen,
  };
}
