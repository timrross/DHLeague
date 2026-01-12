import { Request, Response } from "express";
import { upsertRaceResults } from "../services/game/races";
import { lockRace } from "../services/game/lockRace";
import { settleRace } from "../services/game/settleRace";
import { getRaceLeaderboard as fetchRaceLeaderboard } from "../services/game/standings";
import { runGameTick } from "../services/game/tick";
import { unlockRace } from "../services/game/unlockRace";
import { importUciRaceResults } from "../services/game/uciResults";
import { UserFacingError } from "../services/game/errors";

const parseFlag = (value: unknown) =>
  value === true || value === "true" || value === "1" || value === 1;

const getErrorStatus = (error: unknown, fallback = 500) =>
  error instanceof UserFacingError ? error.status : fallback;

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export async function lockRaceAdmin(req: Request, res: Response) {
  try {
    const raceId = Number(req.params.raceId);
    if (Number.isNaN(raceId)) {
      return res.status(400).json({ message: "Invalid race ID" });
    }

    const force = parseFlag(req.body?.force ?? req.query?.force);
    const result = await lockRace(raceId, { force });
    res.status(200).json(result);
  } catch (error) {
    console.error("Error locking race:", error);
    res
      .status(getErrorStatus(error))
      .json({ message: getErrorMessage(error, "Failed to lock race") });
  }
}

export async function unlockRaceAdmin(req: Request, res: Response) {
  try {
    const raceId = Number(req.params.raceId);
    if (Number.isNaN(raceId)) {
      return res.status(400).json({ message: "Invalid race ID" });
    }

    const force = parseFlag(req.body?.force ?? req.query?.force);
    const result = await unlockRace(raceId, { force });
    res.status(200).json(result);
  } catch (error) {
    console.error("Error unlocking race:", error);
    res
      .status(getErrorStatus(error))
      .json({ message: getErrorMessage(error, "Failed to unlock race") });
  }
}

export async function importUciRaceResultsAdmin(req: Request, res: Response) {
  try {
    const raceId = Number(req.params.raceId);
    if (Number.isNaN(raceId)) {
      return res.status(400).json({ message: "Invalid race ID" });
    }

    const payload = req.body ?? {};
    const sourceUrl = String(payload.sourceUrl ?? "").trim();
    if (!sourceUrl) {
      return res.status(400).json({ message: "sourceUrl is required" });
    }

    const gender = payload.gender;
    if (gender !== "male" && gender !== "female") {
      return res.status(400).json({ message: "gender must be male or female" });
    }

    const category = payload.category;
    if (category !== "elite") {
      return res.status(400).json({ message: "category must be elite" });
    }

    const isFinal = parseFlag(payload.isFinal);
    const result = await importUciRaceResults({
      raceId,
      sourceUrl,
      gender,
      category,
      discipline: payload.discipline,
      isFinal,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error importing UCI race results:", error);
    res
      .status(getErrorStatus(error))
      .json({
        message: getErrorMessage(error, "Failed to import UCI race results"),
      });
  }
}

export async function upsertRaceResultsAdmin(req: Request, res: Response) {
  try {
    const raceId = Number(req.params.raceId);
    if (Number.isNaN(raceId)) {
      return res.status(400).json({ message: "Invalid race ID" });
    }

    const payload = req.body ?? {};
    const results = Array.isArray(payload) ? payload : payload.results;
    if (!Array.isArray(results)) {
      return res.status(400).json({ message: "results must be an array" });
    }

    const isFinal = parseFlag(payload.isFinal);
    const outcome = await upsertRaceResults({ raceId, results, isFinal });

    res.status(200).json(outcome);
  } catch (error) {
    console.error("Error upserting race results:", error);
    res
      .status(getErrorStatus(error))
      .json({ message: getErrorMessage(error, "Failed to update race results") });
  }
}

export async function settleRaceAdmin(req: Request, res: Response) {
  try {
    const raceId = Number(req.params.raceId);
    if (Number.isNaN(raceId)) {
      return res.status(400).json({ message: "Invalid race ID" });
    }

    const force = parseFlag(req.body?.force ?? req.query?.force);
    const allowProvisional = parseFlag(req.body?.allowProvisional ?? req.query?.allowProvisional);

    const result = await settleRace(raceId, { force, allowProvisional });
    res.status(200).json(result);
  } catch (error) {
    console.error("Error settling race:", error);
    res
      .status(getErrorStatus(error))
      .json({ message: getErrorMessage(error, "Failed to settle race") });
  }
}

export async function getRaceLeaderboard(req: Request, res: Response) {
  try {
    const raceId = Number(req.params.raceId ?? req.params.id);
    if (Number.isNaN(raceId)) {
      return res.status(400).json({ message: "Invalid race ID" });
    }

    const leaderboard = await fetchRaceLeaderboard(raceId);
    res.status(200).json({ raceId, leaderboard });
  } catch (error) {
    console.error("Error fetching race leaderboard:", error);
    res
      .status(getErrorStatus(error))
      .json({
        message: getErrorMessage(error, "Failed to fetch race leaderboard"),
      });
  }
}

export async function runGameTickAdmin(req: Request, res: Response) {
  try {
    const allowProvisional = parseFlag(
      req.body?.allowProvisional ?? req.query?.allowProvisional,
    );
    const forceLock = parseFlag(req.body?.forceLock ?? req.query?.forceLock);
    const forceSettle = parseFlag(req.body?.forceSettle ?? req.query?.forceSettle);

    const result = await runGameTick({
      allowProvisional,
      forceLock,
      forceSettle,
    });
    res.status(200).json(result);
  } catch (error) {
    console.error("Error running game tick:", error);
    res
      .status(getErrorStatus(error))
      .json({ message: getErrorMessage(error, "Failed to run game tick") });
  }
}
