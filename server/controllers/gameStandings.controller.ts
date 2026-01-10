import { Request, Response } from "express";
import { getSeasonStandings } from "../services/game/standings";

export async function getSeasonStandingsController(req: Request, res: Response) {
  try {
    const seasonId = Number(req.params.seasonId);
    if (Number.isNaN(seasonId)) {
      return res.status(400).json({ message: "Invalid season ID" });
    }

    const standings = await getSeasonStandings(seasonId);
    res.status(200).json({ seasonId, standings });
  } catch (error) {
    console.error("Error fetching season standings:", error);
    res.status(500).json({ message: "Failed to fetch season standings" });
  }
}
