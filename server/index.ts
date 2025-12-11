import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes/index";
import { setupVite, serveStatic, log } from "./vite";
import getRawBody from "raw-body";
import path from "path";
import fs from "fs";
//import { runMigrations } from "./migrations";

const app = express();
const isDevEnv = process.env.NODE_ENV?.toLowerCase() === "development";
// Special route for ads.txt - add before other middleware
app.get('/ads.txt', (req, res) => {
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

(async () => {
  // Run database migrations first
  //await runMigrations();

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
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
})();
