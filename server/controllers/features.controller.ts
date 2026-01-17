import { type Response } from "express";
import { FEATURES } from "../services/features";

export function getFeatures(_req: any, res: Response) {
  res.json({ juniorTeamEnabled: FEATURES.JUNIOR_TEAM_ENABLED });
}
