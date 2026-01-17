import express from "express";
import path from "path";
import adminRoutes from "../routes/admin.routes";
import teamsRoutes from "../routes/teams.routes";
import racesRoutes from "../routes/races.routes";
import ridersRoutes from "../routes/riders.routes";
import authRoutes from "../routes/auth.routes";
import leaderboardRoutes from "../routes/leaderboard.routes";
import seasonsRoutes from "../routes/seasons.routes";
import featuresRoutes from "../routes/features.routes";
import meRoutes from "../routes/me.routes";
import roundsRoutes from "../routes/rounds.routes";
import { requireAuth } from "../auth";
import { isAdmin } from "../middleware/auth.middleware";
import { downloadImage, processImage, upload } from "../imageUpload";

/**
 * Factory for the fantasy league service. This app depends on the rider data
 * service for roster information and can be instantiated independently for
 * testing while still being mounted under the main server for local dev.
 */
export async function createFantasyLeagueService() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use("/admin", adminRoutes);
  app.use("/features", featuresRoutes);
  app.use("/me", meRoutes);
  app.use("/rounds", roundsRoutes);
  app.use("/teams", teamsRoutes);
  app.use("/races", racesRoutes);
  app.use("/seasons", seasonsRoutes);
  app.use("/riders", ridersRoutes);
  app.use("/auth", authRoutes);
  app.use("/leaderboard", leaderboardRoutes);

  const uploadsDir = path.resolve(process.cwd(), "uploads");
  const legacyUploadsDir = path.resolve(process.cwd(), "public/uploads");

  const staticOpts = {
    setHeaders: (res: any) => {
      res.setHeader("Cache-Control", "public, max-age=604800, immutable");
    },
  };

  app.use("/uploads", express.static(uploadsDir, staticOpts));
  app.use("/uploads", express.static(legacyUploadsDir, staticOpts));

  app.post(
    "/upload-image",
    requireAuth,
    isAdmin,
    upload.single("file"),
    processImage,
    downloadImage,
    async (req: any, res) => {
      try {
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

  return app;
}
