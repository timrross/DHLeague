import express from "express";
import ridersRoutes from "../routes/riders.routes";

/**
 * Factory for the rider data service. This service owns rider CRUD and
 * data ingestion endpoints and is designed to be run independently for
 * scraping/testing while still embeddable in the monolith.
 */
export function createRiderDataService() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use("/riders", ridersRoutes);

  return app;
}

