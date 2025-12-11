import { Express } from "express";
import { createServer, type Server } from "http";
import { createFantasyLeagueService } from "../apps/fantasyLeagueService";
import { createRiderDataService } from "../apps/riderDataService";

export async function registerRoutes(app: Express): Promise<Server> {
  const riderDataService = createRiderDataService();
  const fantasyLeagueService = await createFantasyLeagueService();

  app.use("/api/rider-data", riderDataService);
  // Prefer the explicit game prefix for clarity across services while
  // keeping the legacy mount for existing clients.
  app.use("/api/game", fantasyLeagueService);
  app.use("/api", fantasyLeagueService);

  // Create and return the HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
