import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { uciApiService } from "./services/uciApi";
import { insertTeamSchema, insertTeamRiderSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Admin routes
  app.post('/api/admin/import-races', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is an admin (in this simple example, we're using a fixed ID)
      const userId = req.user.claims.sub;
      if (userId !== "42624609") {
        return res.status(403).json({ message: "Unauthorized. Admin access required." });
      }
      
      // Fetch races from UCI API
      const uciRaces = await uciApiService.getUpcomingMTBEvents();
      
      // Map to our race format
      const mappedRaces = uciApiService.mapRaceData(uciRaces);
      
      // Add/update races in database
      const results = [];
      for (const race of mappedRaces) {
        // Check if race already exists by name
        const existingRaces = await storage.getRaces();
        const existingRace = existingRaces.find(r => r.name === race.name);
        
        if (existingRace) {
          // Update existing race
          const updated = await storage.updateRace(existingRace.id, race);
          results.push({ action: 'updated', race: updated });
        } else {
          // Create new race
          const created = await storage.createRace(race);
          results.push({ action: 'created', race: created });
        }
      }
      
      res.json({ 
        message: `Successfully processed ${results.length} races`,
        details: results 
      });
    } catch (error) {
      console.error("Error importing races from UCI API:", error);
      res.status(500).json({ 
        message: "Failed to import races", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  app.post('/api/admin/import-riders', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is an admin
      const userId = req.user.claims.sub;
      if (userId !== "42624609") {
        return res.status(403).json({ message: "Unauthorized. Admin access required." });
      }
      
      // For now, return a placeholder response as the API endpoint may not be available
      // In a production app, we would:
      // 1. Fetch riders from UCI API
      // 2. Map to our format
      // 3. Add/update in database
      
      res.json({ 
        message: "Rider import simulation successful",
        note: "This is a placeholder. In production, real UCI API data would be fetched."
      });
    } catch (error) {
      console.error("Error importing riders from UCI API:", error);
      res.status(500).json({ 
        message: "Failed to import riders", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Rider routes
  app.get('/api/riders', async (req, res) => {
    try {
      const riders = await storage.getRiders();
      res.json(riders);
    } catch (error) {
      console.error("Error fetching riders:", error);
      res.status(500).json({ message: "Failed to fetch riders" });
    }
  });

  app.get('/api/riders/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const rider = await storage.getRider(id);
      
      if (!rider) {
        return res.status(404).json({ message: "Rider not found" });
      }
      
      res.json(rider);
    } catch (error) {
      console.error("Error fetching rider:", error);
      res.status(500).json({ message: "Failed to fetch rider" });
    }
  });

  app.get('/api/riders/gender/:gender', async (req, res) => {
    try {
      const gender = req.params.gender;
      
      if (gender !== 'male' && gender !== 'female') {
        return res.status(400).json({ message: "Gender must be 'male' or 'female'" });
      }
      
      const riders = await storage.getRidersByGender(gender);
      res.json(riders);
    } catch (error) {
      console.error("Error fetching riders by gender:", error);
      res.status(500).json({ message: "Failed to fetch riders" });
    }
  });

  // Team routes
  app.get('/api/teams/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const team = await storage.getUserTeam(userId);
      
      if (!team) {
        return res.status(404).json({ message: "No team found for user" });
      }
      
      res.json(team);
    } catch (error) {
      console.error("Error fetching user team:", error);
      res.status(500).json({ message: "Failed to fetch team" });
    }
  });

  app.post('/api/teams', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate team data
      const teamDataResult = insertTeamSchema.safeParse({
        ...req.body,
        userId
      });
      
      if (!teamDataResult.success) {
        return res.status(400).json({ 
          message: "Invalid team data", 
          errors: teamDataResult.error.errors 
        });
      }
      
      // Validate riders array
      const riderIdsSchema = z.array(z.number()).length(6);
      const riderIdsResult = riderIdsSchema.safeParse(req.body.riderIds);
      
      if (!riderIdsResult.success) {
        return res.status(400).json({ 
          message: "Invalid rider selection", 
          errors: riderIdsResult.error.errors 
        });
      }
      
      // Check if user already has a team
      const existingTeam = await storage.getUserTeam(userId);
      if (existingTeam) {
        return res.status(400).json({ message: "User already has a team" });
      }
      
      // Create team
      const team = await storage.createTeam(teamDataResult.data, riderIdsResult.data);
      res.status(201).json(team);
    } catch (error: any) {
      console.error("Error creating team:", error);
      res.status(error.message.includes('Team ') ? 400 : 500)
        .json({ message: error.message || "Failed to create team" });
    }
  });

  app.put('/api/teams/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const teamId = parseInt(req.params.id);
      
      // Check if team exists and belongs to user
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      if (team.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Update team name if provided
      const teamData: { name?: string } = {};
      if (req.body.name) {
        teamData.name = req.body.name;
      }
      
      // Update team riders if provided
      const riderIds = req.body.riderIds ? [...req.body.riderIds] : undefined;
      
      // Update team
      const updatedTeam = await storage.updateTeam(teamId, teamData, riderIds);
      
      if (!updatedTeam) {
        return res.status(500).json({ message: "Failed to update team" });
      }
      
      res.json(updatedTeam);
    } catch (error: any) {
      console.error("Error updating team:", error);
      res.status(error.message.includes('Team ') ? 400 : 500)
        .json({ message: error.message || "Failed to update team" });
    }
  });

  app.delete('/api/teams/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const teamId = parseInt(req.params.id);
      
      // Check if team exists and belongs to user
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      if (team.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Delete team
      const deleted = await storage.deleteTeam(teamId);
      
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete team" });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting team:", error);
      res.status(500).json({ message: "Failed to delete team" });
    }
  });

  // Race routes
  app.get('/api/races', async (req, res) => {
    try {
      const races = await storage.getRaces();
      res.json(races);
    } catch (error) {
      console.error("Error fetching races:", error);
      res.status(500).json({ message: "Failed to fetch races" });
    }
  });

  app.get('/api/races/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const race = await storage.getRace(id);
      
      if (!race) {
        return res.status(404).json({ message: "Race not found" });
      }
      
      res.json(race);
    } catch (error) {
      console.error("Error fetching race:", error);
      res.status(500).json({ message: "Failed to fetch race" });
    }
  });

  app.get('/api/races/:id/results', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const raceWithResults = await storage.getRaceWithResults(id);
      
      if (!raceWithResults) {
        return res.status(404).json({ message: "Race not found" });
      }
      
      res.json(raceWithResults);
    } catch (error) {
      console.error("Error fetching race results:", error);
      res.status(500).json({ message: "Failed to fetch race results" });
    }
  });

  // Leaderboard routes
  app.get('/api/leaderboard', async (req, res) => {
    try {
      // Update team points first to ensure leaderboard is accurate
      await storage.updateTeamPoints();
      
      const leaderboard = await storage.getLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
