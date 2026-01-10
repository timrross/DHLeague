import { Request, Response } from "express";
import { listRaces } from "../services/game/races";
import { listSeasons } from "../services/game/seasons";

export async function listSeasonsAdmin(_req: Request, res: Response) {
  try {
    const seasons = await listSeasons();
    res.status(200).json(seasons);
  } catch (error) {
    console.error("Error listing seasons:", error);
    res.status(500).json({ message: "Failed to fetch seasons" });
  }
}

export async function listRacesAdmin(req: Request, res: Response) {
  try {
    const seasonIdParam = req.query.seasonId;
    let seasonId: number | undefined;

    if (seasonIdParam !== undefined) {
      const raw = Array.isArray(seasonIdParam)
        ? seasonIdParam[0]
        : seasonIdParam;
      const parsed = Number(raw);
      if (Number.isNaN(parsed)) {
        return res.status(400).json({ message: "Invalid season ID" });
      }
      seasonId = parsed;
    }

    const races = await listRaces(seasonId);
    res.status(200).json(races);
  } catch (error) {
    console.error("Error listing races:", error);
    res.status(500).json({ message: "Failed to fetch races" });
  }
}
