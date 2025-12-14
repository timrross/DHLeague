import express, { Router } from "express";
import ridersRoutes from "../routes/riders.routes";
import { getAllRaces, getNextRace, getRaceById, getRaceResults } from "../controllers/races.controller";

/**
 * Factory for the rider data service. This service owns rider CRUD and
 * data ingestion endpoints and is designed to be run independently for
 * scraping/testing while still embeddable in the monolith.
 */
export function createRiderDataService() {
  const app = express();
  const publicRaceRoutes = Router();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  publicRaceRoutes.get("/", getAllRaces);
  publicRaceRoutes.get("/next", getNextRace);
  publicRaceRoutes.get("/:id", getRaceById);
  publicRaceRoutes.get("/:id/results", getRaceResults);

  app.use("/riders", ridersRoutes);
  app.use("/races", publicRaceRoutes);

  return app;
}

