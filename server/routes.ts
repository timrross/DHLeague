import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { uciApiService } from "./services/uciApi";
import { insertTeamSchema, insertTeamRiderSchema, teamSwaps } from "@shared/schema";
import { db } from "./db";
import { z } from "zod";
import { upload, processImage, downloadImage } from "./imageUpload";
import path from "path";

// Helper function to determine race status based on dates
function calculateRaceStatus(startDate: Date, endDate: Date): 'upcoming' | 'next' | 'ongoing' | 'completed' {
  const now = new Date();
  
  // If the race is already over
  if (now > endDate) {
    return 'completed';
  }
  
  // If the race is currently happening
  if (now >= startDate && now <= endDate) {
    return 'ongoing';
  }
  
  // Race is in the future, but we'll return 'upcoming' for now
  // The 'next' status will be determined when we have all races
  return 'upcoming';
}

// Helper function to update race statuses
async function updateRaceStatuses() {
  try {
    // Get all races
    const allRaces = await storage.getRaces();
    
    // Calculate status for each race based on dates
    allRaces.forEach(race => {
      const startDate = new Date(race.startDate);
      const endDate = new Date(race.endDate);
      
      // Calculate status based on dates
      race.status = calculateRaceStatus(startDate, endDate);
    });
    
    // Find the next upcoming race (the closest in the future)
    const upcomingRaces = allRaces.filter(race => race.status === 'upcoming');
    
    if (upcomingRaces.length > 0) {
      // Sort by start date (ascending)
      upcomingRaces.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      
      // Mark the first upcoming race as 'next'
      const nextRaceId = upcomingRaces[0].id;
      
      // Only update if needed to avoid unnecessary database calls
      if (upcomingRaces[0].status !== 'next') {
        await storage.updateRace(nextRaceId, { status: 'next' });
      }
    }
    
    return allRaces;
  } catch (error) {
    console.error("Error updating race statuses:", error);
    return null;
  }
}

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
  
  // Admin middleware to check if user is an admin
  const isAdmin = async (req: any, res: Response, next: Function) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Unauthorized. Admin access required." });
      }
      
      next();
    } catch (error) {
      console.error("Error checking admin status:", error);
      res.status(500).json({ message: "Server error" });
    }
  };
  
  // Admin routes
  
  // User management
  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const usersWithTeams = await storage.getUsersWithTeams();
      res.json(usersWithTeams);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  app.get('/api/admin/users/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const team = await storage.getUserTeam(userId);
      
      res.json({
        ...user,
        team
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  app.patch('/api/admin/users/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const userData = req.body;
      
      // Validate we're only updating allowed fields
      const allowedFields = ['isAdmin', 'isActive', 'firstName', 'lastName', 'email'];
      const updateData: Record<string, any> = {};
      
      for (const field of allowedFields) {
        if (field in userData) {
          updateData[field] = userData[field];
        }
      }
      
      // Check if there's at least one valid property to update
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ 
          message: 'No valid fields provided for update',
          error: 'At least one valid field must be provided'
        });
      }
      
      try {
        const updatedUser = await storage.updateUser(userId, updateData);
        
        if (!updatedUser) {
          return res.status(404).json({ message: "User not found" });
        }
        
        res.json(updatedUser);
      } catch (error: any) {
        if (error.message && error.message.includes("No values to set")) {
          return res.status(400).json({ 
            message: 'No valid fields provided for update',
            error: error.message
          });
        }
        throw error;  // Let the outer catch handle other errors
      }
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });
  
  app.delete('/api/admin/users/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      
      // Check if we're trying to delete the current user
      if (userId === req.user?.claims?.sub) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      const success = await storage.deleteUser(userId);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to delete user" });
      }
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });
  
  // Import data 
  app.post('/api/admin/import-races', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      
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
  
  // Delete all riders endpoint for admin
  app.delete('/api/admin/riders', isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.deleteAllRiders();
      res.json({ message: "All riders deleted successfully" });
    } catch (error) {
      console.error("Error deleting all riders:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post('/api/admin/import-riders', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      
      // Fetch riders from UCI API
      const uciRiders = await uciApiService.getMTBDownhillRiders();
      console.log(`Found ${uciRiders.length} UCI downhill riders`);
      
      // Map to our format
      const mappedRiders = await uciApiService.mapRiderData(uciRiders);
      
      // Add/update riders in database
      const results = [];
      for (const rider of mappedRiders) {
        // Skip riders with empty names (shouldn't happen, but just in case)
        if (!rider.name || rider.name.trim() === '') {
          continue;
        }
        
        // Check if rider already exists by name
        const existingRiders = await storage.getRiders();
        const existingRider = existingRiders.find(r => r.name === rider.name);
        
        if (existingRider) {
          // Update existing rider
          const updated = await storage.updateRider(existingRider.id, rider);
          results.push({ action: 'updated', rider: updated });
        } else {
          // Create new rider
          const created = await storage.createRider(rider);
          results.push({ action: 'created', rider: created });
        }
      }
      
      res.json({ 
        message: `Successfully processed ${results.length} riders`,
        details: results
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
      const riderId = Number(req.params.id);
      if (isNaN(riderId)) {
        return res.status(400).json({ message: 'Invalid rider ID' });
      }
      
      const rider = await storage.getRider(riderId);
      if (!rider) {
        return res.status(404).json({ message: 'Rider not found' });
      }
      
      res.json(rider);
    } catch (error) {
      console.error("Error fetching rider:", error);
      res.status(500).json({ message: "Failed to fetch rider" });
    }
  });
  
  // Static file serving
  app.use('/uploads', (req, res, next) => {
    const filePath = path.join(process.cwd(), 'public/uploads', path.basename(req.url));
    res.sendFile(filePath, (err) => {
      if (err) {
        next();
      }
    });
  });

  // Image upload endpoint (handles both file uploads and URL downloads)
  app.post('/api/upload-image', isAuthenticated, isAdmin, upload.single('file'), processImage, downloadImage, async (req: any, res) => {
    try {
      
      // Return the processed image path
      if (req.body.image) {
        res.json({ imageUrl: req.body.image });
      } else {
        res.status(400).json({ message: "No image was uploaded or provided via URL" });
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ 
        message: "Failed to upload image", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  app.post('/api/riders', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      
      const riderData = req.body;
      const newRider = await storage.createRider(riderData);
      res.status(201).json(newRider);
    } catch (error) {
      console.error("Error creating rider:", error);
      res.status(500).json({ 
        message: "Failed to create rider", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  app.put('/api/riders/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      
      const riderId = Number(req.params.id);
      if (isNaN(riderId)) {
        return res.status(400).json({ message: 'Invalid rider ID' });
      }
      
      const riderData = req.body;
      
      // Map any mismatched field names
      if (riderData.profileImageUrl !== undefined && riderData.image === undefined) {
        riderData.image = riderData.profileImageUrl;
      }
      
      // Map any numeric fields that might come as strings
      if (riderData.cost) riderData.cost = Number(riderData.cost);
      if (riderData.points) riderData.points = Number(riderData.points);
      if (riderData.lastYearStanding) riderData.lastYearStanding = Number(riderData.lastYearStanding);
      
      // Debug the data being sent
      console.log("Updating rider with data:", riderData);
      
      // Check if there's at least one valid property to update
      const hasValidFields = Object.values(riderData).some(val => val !== undefined && val !== null && val !== "");
      
      if (!hasValidFields) {
        return res.status(400).json({ 
          message: 'No valid fields provided for update',
          error: 'At least one field must have a value'
        });
      }
      
      try {
        const updatedRider = await storage.updateRider(riderId, riderData);
        
        if (!updatedRider) {
          return res.status(404).json({ message: 'Rider not found' });
        }
        
        res.json(updatedRider);
      } catch (error: any) {
        if (error.message && error.message.includes("No values to set")) {
          return res.status(400).json({ 
            message: 'No valid fields provided for update',
            error: error.message
          });
        }
        throw error;  // Let the outer catch handle other errors
      }
    } catch (error) {
      console.error("Error updating rider:", error);
      res.status(500).json({ 
        message: "Failed to update rider", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  app.delete('/api/riders/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      
      const riderId = Number(req.params.id);
      if (isNaN(riderId)) {
        return res.status(400).json({ message: 'Invalid rider ID' });
      }
      
      // Add a deleteRider method to the storage interface and implementation
      // For now, we'll return 501 Not Implemented
      res.status(501).json({ message: "Delete rider functionality not implemented yet" });
    } catch (error) {
      console.error("Error deleting rider:", error);
      res.status(500).json({ 
        message: "Failed to delete rider", 
        error: error instanceof Error ? error.message : String(error)
      });
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
      
      // Get the next race to determine lock status
      const races = await storage.getRaces();
      const nextRace = races.find(race => race.status === 'next');
      
      // Check if team should be locked (1 day before race)
      if (nextRace) {
        const oneDay = 24 * 60 * 60 * 1000;
        const lockDate = new Date(new Date(nextRace.startDate).getTime() - oneDay);
        
        // If we're past the lock date and the team is not already marked as locked
        if (new Date() >= lockDate && !team.isLocked) {
          // Lock the team for this race
          await storage.updateTeam(team.id, { 
            isLocked: true, 
            lockedAt: new Date(),
            currentRaceId: nextRace.id,
            swapsUsed: 0 // Reset swap count for new race
          });
          
          // Get the updated team
          const updatedTeam = await storage.getUserTeam(userId);
          return res.json(updatedTeam);
        }
      }
      
      res.json(team);
    } catch (error) {
      console.error("Error fetching user team:", error);
      res.status(500).json({ message: "Failed to fetch team" });
    }
  });
  
  // Team rider swap endpoint - only allowed when team is locked, limited to 2 swaps per race
  app.post('/api/teams/:id/swap', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const teamId = parseInt(req.params.id);
      
      // Validate request body
      if (!req.body.removedRiderId || !req.body.addedRiderId) {
        return res.status(400).json({ message: "Both removedRiderId and addedRiderId are required" });
      }
      
      const removedRiderId = parseInt(req.body.removedRiderId);
      const addedRiderId = parseInt(req.body.addedRiderId);
      
      // Get team and check ownership
      const team = await storage.getTeamWithRiders(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      if (team.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Check if team is locked (required for swaps)
      if (!team.isLocked) {
        return res.status(400).json({ 
          message: "Team is not locked. Swaps are only allowed during the locked period (1 day before race)." 
        });
      }
      
      // Check swap limit (maximum 2 per race)
      const swapsUsed = team.swapsUsed ?? 0;
      if (swapsUsed >= 2) {
        return res.status(400).json({ 
          message: "Maximum swap limit reached (2 per race)" 
        });
      }
      
      // Check if the removed rider is on the team
      const isRiderOnTeam = team.riders.some(r => r.id === removedRiderId);
      if (!isRiderOnTeam) {
        return res.status(400).json({ message: "Selected rider is not on your team" });
      }
      
      // Get added rider
      const addedRider = await storage.getRider(addedRiderId);
      if (!addedRider) {
        return res.status(404).json({ message: "Replacement rider not found" });
      }
      
      // Check if added rider is already on team
      const isAddedRiderOnTeam = team.riders.some(r => r.id === addedRiderId);
      if (isAddedRiderOnTeam) {
        return res.status(400).json({ message: "Replacement rider is already on your team" });
      }
      
      // Get removed rider (already verified to be on team)
      const removedRider = team.riders.find(r => r.id === removedRiderId);
      
      // Check gender balance
      const maleRiders = team.riders.filter(r => r.gender === 'male');
      const femaleRiders = team.riders.filter(r => r.gender === 'female');
      
      const isRemovingMale = removedRider?.gender === 'male';
      const isAddingMale = addedRider.gender === 'male';
      
      if (isRemovingMale && !isAddingMale && femaleRiders.length >= 4) {
        return res.status(400).json({ 
          message: "Cannot add more female riders. Maximum 4 allowed." 
        });
      }
      
      if (!isRemovingMale && isAddingMale && maleRiders.length >= 4) {
        return res.status(400).json({ 
          message: "Cannot add more male riders. Maximum 4 allowed." 
        });
      }
      
      // Check budget
      const currentCost = team.riders.reduce((total, r) => total + r.cost, 0);
      const newCost = currentCost - (removedRider?.cost || 0) + addedRider.cost;
      
      if (newCost > 2000000) {
        return res.status(400).json({ 
          message: "Swap exceeds budget limit of $2,000,000" 
        });
      }
      
      // Create a new array of riderIds with the swap applied
      const updatedRiderIds = team.riders
        .filter(r => r.id !== removedRiderId)
        .map(r => r.id);
      updatedRiderIds.push(addedRiderId);
      
      // Create a record of the swap
      const swapData = {
        teamId: team.id,
        raceId: team.currentRaceId || 0,
        removedRiderId,
        addedRiderId,
      };
      
      // Record the swap and update the team
      await db.transaction(async (tx) => {
        // Insert the swap record
        await tx.insert(teamSwaps).values(swapData);
        
        // Update the team with new riders and increment swap count
        await storage.updateTeam(
          team.id, 
          { swapsUsed: (team.swapsUsed || 0) + 1 }, 
          updatedRiderIds
        );
      });
      
      // Get updated team
      const updatedTeam = await storage.getTeamWithRiders(teamId);
      res.json(updatedTeam);
    } catch (error) {
      console.error("Error swapping rider:", error);
      res.status(500).json({ 
        message: "Failed to swap rider", 
        error: error instanceof Error ? error.message : String(error)
      });
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
      // First update race statuses based on current date and time
      const updatedRaces = await updateRaceStatuses();
      
      // If updating statuses failed, just fetch races directly
      const races = updatedRaces || await storage.getRaces();
      res.json(races);
    } catch (error) {
      console.error("Error fetching races:", error);
      res.status(500).json({ message: "Failed to fetch races" });
    }
  });
  
  app.get('/api/races/:id', async (req, res) => {
    try {
      const raceId = Number(req.params.id);
      if (isNaN(raceId)) {
        return res.status(400).json({ message: 'Invalid race ID' });
      }
      
      // Make sure statuses are updated
      await updateRaceStatuses();
      
      const race = await storage.getRace(raceId);
      if (!race) {
        return res.status(404).json({ message: 'Race not found' });
      }
      
      res.json(race);
    } catch (error) {
      console.error("Error fetching race:", error);
      res.status(500).json({ message: "Failed to fetch race" });
    }
  });
  
  app.get('/api/races/:id/results', async (req, res) => {
    try {
      const raceId = Number(req.params.id);
      if (isNaN(raceId)) {
        return res.status(400).json({ message: 'Invalid race ID' });
      }
      
      // Make sure statuses are updated
      await updateRaceStatuses();
      
      const raceWithResults = await storage.getRaceWithResults(raceId);
      if (!raceWithResults) {
        return res.status(404).json({ message: 'Race not found' });
      }
      
      res.json(raceWithResults);
    } catch (error) {
      console.error("Error fetching race results:", error);
      res.status(500).json({ message: "Failed to fetch race results" });
    }
  });
  
  app.post('/api/races', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      
      // Create a copy of the race data and remove any status
      // as status will be automatically determined by dates
      const raceData = { ...req.body };
      delete raceData.status;
      
      const newRace = await storage.createRace(raceData);
      
      // Update race statuses after creating a new race
      await updateRaceStatuses();
      
      // Get the updated race with the correct status
      const updatedRace = await storage.getRace(newRace.id);
      
      res.status(201).json(updatedRace || newRace);
    } catch (error) {
      console.error("Error creating race:", error);
      res.status(500).json({ 
        message: "Failed to create race", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  app.put('/api/races/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      
      const raceId = Number(req.params.id);
      if (isNaN(raceId)) {
        return res.status(400).json({ message: 'Invalid race ID' });
      }
      
      // Create a copy of the race data and remove any status
      // as status will be automatically determined by dates
      const raceData = { ...req.body };
      delete raceData.status;
      
      const updatedRace = await storage.updateRace(raceId, raceData);
      
      if (!updatedRace) {
        return res.status(404).json({ message: 'Race not found' });
      }
      
      // Update race statuses after updating the race
      await updateRaceStatuses();
      
      // Get the race again with its calculated status
      const raceWithStatus = await storage.getRace(raceId);
      
      res.json(raceWithStatus || updatedRace);
    } catch (error) {
      console.error("Error updating race:", error);
      res.status(500).json({ 
        message: "Failed to update race", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  app.post('/api/races/:id/results', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is an admin
      const userId = req.user.claims.sub;
      if (userId !== "42624609") {
        return res.status(403).json({ message: "Unauthorized. Admin access required." });
      }
      
      const raceId = Number(req.params.id);
      if (isNaN(raceId)) {
        return res.status(400).json({ message: 'Invalid race ID' });
      }
      
      const resultData = req.body;
      resultData.raceId = raceId;
      
      const newResult = await storage.addResult(resultData);
      
      // Update team points after adding a result
      await storage.updateTeamPoints();
      
      res.status(201).json(newResult);
    } catch (error) {
      console.error("Error adding race result:", error);
      res.status(500).json({ 
        message: "Failed to add race result", 
        error: error instanceof Error ? error.message : String(error)
      });
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
