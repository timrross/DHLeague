import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes/index";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import { ensureDatabaseSchema } from "./setupDatabase";
import path from "path";
import fs from "fs";

const loadLocalEnv = () => {
  if (process.env.NODE_ENV?.toLowerCase() !== "development") {
    return;
  }

  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const contents = fs.readFileSync(envPath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
};

loadLocalEnv();

const app = express();
const isDevEnv = process.env.NODE_ENV?.toLowerCase() === "development";
app.disable("x-powered-by");
const uploadsDir = path.resolve(process.cwd(), "uploads");
const legacyUploadsDir = path.resolve(process.cwd(), "public/uploads");
const flagsDir = path.resolve(process.cwd(), "src/assets/flags");
// Special route for ads.txt - add before other middleware
app.get('/ads.txt', (_req, res) => {
  const adsPath = path.join(process.cwd(), 'public', 'ads.txt');
  if (fs.existsSync(adsPath)) {
    res.setHeader('Content-Type', 'text/plain');
    fs.createReadStream(adsPath).pipe(res);
  } else {
    res.status(404).send('ads.txt not found');
  }
});

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const cacheStatic = {
  setHeaders: (res: any) => {
    res.setHeader("Cache-Control", "public, max-age=604800, immutable");
  },
};

app.use("/uploads", express.static(uploadsDir, cacheStatic));
app.use("/uploads", express.static(legacyUploadsDir, cacheStatic));
app.use("/assets/flags", express.static(flagsDir, cacheStatic));

(async () => {
  // Run database migrations first
  await ensureDatabaseSchema();
  setupAuth(app);

  const server = await registerRoutes(app);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const rawStatus =
      typeof err === "object" && err !== null && "status" in err
        ? (err as { status?: number }).status
        : typeof err === "object" && err !== null && "statusCode" in err
          ? (err as { statusCode?: number }).statusCode
          : undefined;

    const parsedStatus = Number(rawStatus);
    const status =
      Number.isInteger(parsedStatus) && parsedStatus > 0 ? parsedStatus : 500;
    const message =
      typeof err === "object" && err !== null && "message" in err
        ? String((err as { message?: string }).message)
        : "Internal Server Error";

    log(`[${status}] ${message}`, "error");
    if (err instanceof Error && err.stack) {
      console.error(err.stack);
    } else if (err) {
      console.error(err);
    }

    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (isDevEnv) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})().catch((error: unknown) => {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: string }).message)
      : "Unexpected server error";
  log(`Server failed to start: ${message}`, "startup");
  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  } else {
    console.error(error);
  }
  process.exit(1);
});
