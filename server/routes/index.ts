import { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, isAuthenticated } from "../replitAuth";
import { isAdmin } from "../middleware/auth.middleware";
import ridersRoutes from "./riders.routes";
import adminRoutes from "./admin.routes";
import teamsRoutes from "./teams.routes";
import racesRoutes from "./races.routes";
import authRoutes from "./auth.routes";
import leaderboardRoutes from "./leaderboard.routes";
import { upload, processImage, downloadImage } from "../imageUpload";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  app.use("/api/admin", adminRoutes);
  app.use("/api/riders", ridersRoutes);
  app.use("/api/teams", teamsRoutes);
  app.use("/api/races", racesRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/leaderboard", leaderboardRoutes);

  // Static file serving
  app.use("/uploads", (req, res, next) => {
    const filePath = path.join(
      process.cwd(),
      "public/uploads",
      path.basename(req.url),
    );
    res.sendFile(filePath, (err) => {
      if (err) {
        next();
      }
    });
  });

  // Image upload endpoint (handles both file uploads and URL downloads)
  app.post(
    "/api/upload-image",
    isAuthenticated,
    isAdmin,
    upload.single("file"),
    processImage,
    downloadImage,
    async (req: any, res) => {
      try {
        // Return the processed image path
        if (req.body.image) {
          res.json({ imageUrl: req.body.image });
        } else {
          res
            .status(400)
            .json({ message: "No image was uploaded or provided via URL" });
        }
      } catch (error) {
        console.error("Error uploading image:", error);
        res.status(500).json({
          message: "Failed to upload image",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // Create and return the HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
