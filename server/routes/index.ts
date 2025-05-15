import { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, isAuthenticated } from "../replitAuth";
import ridersRoutes from "./riders.routes";
import adminRoutes from "./admin.routes";
import teamsRoutes from "./teams.routes";
import racesRoutes from "./races.routes";
import authRoutes from "./auth.routes";
import leaderboardRoutes from "./leaderboard.routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  app.use("/api/admin", adminRoutes);
  app.use("/api/riders", ridersRoutes);
  app.use("/api/teams", teamsRoutes);
  app.use("/api/races", racesRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/leaderboard", leaderboardRoutes);

  // fallback for 404s
  app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
  });

  // Create and return the HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
