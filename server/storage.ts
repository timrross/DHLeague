import {
  users,
  type User,
  type UpsertUser,
  riders,
  type Rider,
  type InsertRider,
  teams,
  type Team,
  type InsertTeam,
  teamRiders,
  type TeamRider,
  type InsertTeamRider,
  races,
  type Race,
  type InsertRace,
  results,
  type Result,
  type InsertResult,
  type TeamWithRiders,
  type RaceWithResults,
  type LeaderboardEntry
} from "@shared/schema";
import { db } from "./db";
import { eq, and, asc, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Rider operations
  getRiders(): Promise<Rider[]>;
  getRider(id: number): Promise<Rider | undefined>;
  createRider(rider: InsertRider): Promise<Rider>;
  updateRider(id: number, rider: Partial<Rider>): Promise<Rider | undefined>;
  getRidersByGender(gender: string): Promise<Rider[]>;
  deleteAllRiders(): Promise<void>;
  
  // Team operations
  getTeam(id: number): Promise<Team | undefined>;
  getTeamWithRiders(id: number): Promise<TeamWithRiders | undefined>;
  getUserTeam(userId: string): Promise<TeamWithRiders | undefined>;
  createTeam(team: InsertTeam, riderIds: number[]): Promise<TeamWithRiders>;
  updateTeam(id: number, team: Partial<Team>, riderIds?: number[]): Promise<TeamWithRiders | undefined>;
  deleteTeam(id: number): Promise<boolean>;
  
  // Race operations
  getRaces(): Promise<Race[]>;
  getRace(id: number): Promise<Race | undefined>;
  getRaceWithResults(id: number): Promise<RaceWithResults | undefined>;
  createRace(race: InsertRace): Promise<Race>;
  updateRace(id: number, race: Partial<Race>): Promise<Race | undefined>;
  
  // Result operations
  getResults(raceId: number): Promise<(Result & { rider: Rider })[]>;
  addResult(result: InsertResult): Promise<Result>;
  updateTeamPoints(): Promise<void>;
  
  // Leaderboard operations
  getLeaderboard(): Promise<LeaderboardEntry[]>;
  
  // Admin operations
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, userData: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getUsersWithTeams(): Promise<(User & { team?: TeamWithRiders })[]>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Database is initialized in db.ts
    this.initializeSampleData();
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const result = await db
      .insert(users)
      .values({
        ...userData,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date()
        }
      })
      .returning();
    
    return result[0];
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    
    return result[0];
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      await db.transaction(async (tx) => {
        // Get user's team(s)
        const userTeams = await tx
          .select()
          .from(teams)
          .where(eq(teams.userId, id));
        
        // Delete team-rider associations and teams
        for (const team of userTeams) {
          await tx
            .delete(teamRiders)
            .where(eq(teamRiders.teamId, team.id));
          
          await tx
            .delete(teams)
            .where(eq(teams.id, team.id));
        }
        
        // Delete user
        await tx
          .delete(users)
          .where(eq(users.id, id));
      });
      
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }

  async getUsersWithTeams(): Promise<(User & { team?: TeamWithRiders })[]> {
    const allUsers = await this.getAllUsers();
    
    return await Promise.all(
      allUsers.map(async (user) => {
        const team = await this.getUserTeam(user.id);
        return {
          ...user,
          team
        };
      })
    );
  }

  // Rider operations
  async getRiders(): Promise<Rider[]> {
    return await db.select().from(riders);
  }

  async getRider(id: number): Promise<Rider | undefined> {
    const result = await db.select().from(riders).where(eq(riders.id, id));
    return result[0];
  }
  
  async getRiderByRiderId(riderId: string): Promise<Rider | undefined> {
    const result = await db.select().from(riders).where(eq(riders.riderId, riderId));
    return result[0];
  }

  async createRider(rider: InsertRider): Promise<Rider> {
    const result = await db.insert(riders).values(rider).returning();
    return result[0];
  }

  async updateRider(id: number, riderData: Partial<Rider>): Promise<Rider | undefined> {
    // Filter out undefined values that would cause "No values to set" error
    const cleanData: Record<string, any> = {};
    
    // Only keep fields with defined, non-null, non-empty values
    Object.keys(riderData).forEach(key => {
      const value = riderData[key as keyof Rider];
      if (value !== undefined && value !== null && value !== "") {
        cleanData[key] = value;
      }
    });
    
    // Log what we're updating with
    console.log(`Cleaned updateRider data for ID ${id}:`, cleanData);
    
    // If no fields to update, just return the existing rider
    if (Object.keys(cleanData).length === 0) {
      console.log(`No fields to update for rider ID ${id}, returning current rider`);
      const [existingRider] = await db
        .select()
        .from(riders)
        .where(eq(riders.id, id));
      return existingRider;
    }
    
    // Proceed with update since we have fields
    const result = await db
      .update(riders)
      .set(cleanData)
      .where(eq(riders.id, id))
      .returning();
    return result[0];
  }

  async getRidersByGender(gender: string): Promise<Rider[]> {
    return await db.select().from(riders).where(eq(riders.gender, gender));
  }
  
  async deleteAllRiders(): Promise<void> {
    // First, delete related results
    await db.delete(results);
    
    // Then delete team-rider associations
    await db.delete(teamRiders);
    
    // Finally delete all riders
    await db.delete(riders);
  }

  // Team operations
  async getTeam(id: number): Promise<Team | undefined> {
    const result = await db.select().from(teams).where(eq(teams.id, id));
    return result[0];
  }

  async getTeamWithRiders(id: number): Promise<TeamWithRiders | undefined> {
    const team = await this.getTeam(id);
    if (!team) return undefined;

    // Get team rider associations
    const teamRiderAssociations = await db
      .select()
      .from(teamRiders)
      .where(eq(teamRiders.teamId, id));
    
    // Get the actual riders
    const teamRidersList = await Promise.all(
      teamRiderAssociations.map(async (tr) => {
        return await this.getRider(tr.riderId);
      })
    );
    
    // Filter out any undefined riders
    const riderList = teamRidersList.filter(rider => rider !== undefined) as Rider[];
    
    // Calculate total cost
    const totalCost = riderList.reduce((sum, rider) => sum + rider.cost, 0);

    return {
      ...team,
      riders: riderList,
      totalCost
    };
  }

  async getUserTeam(userId: string): Promise<TeamWithRiders | undefined> {
    const userTeamResult = await db
      .select()
      .from(teams)
      .where(eq(teams.userId, userId));
    
    if (userTeamResult.length === 0) return undefined;
    
    const team = userTeamResult[0];
    return this.getTeamWithRiders(team.id);
  }

  async createTeam(teamData: InsertTeam, riderIds: number[]): Promise<TeamWithRiders> {
    // Validate team composition
    const selectedRiders = await Promise.all(
      riderIds.map(id => this.getRider(id))
    );
    
    // Filter out any undefined riders
    const riders = selectedRiders.filter(rider => rider !== undefined) as Rider[];
    
    const maleRiders = riders.filter(r => r.gender === 'male');
    const femaleRiders = riders.filter(r => r.gender === 'female');
    
    if (riders.length !== 6) {
      throw new Error('Team must have exactly 6 riders');
    }
    
    if (maleRiders.length > 4) {
      throw new Error('Team can have a maximum of 4 male riders');
    }
    
    if (femaleRiders.length < 2) {
      throw new Error('Team must have at least 2 female riders');
    }

    // Check budget
    const totalCost = riders.reduce((sum, rider) => sum + rider.cost, 0);
    if (totalCost > 2000000) {
      throw new Error('Team exceeds the budget of $2,000,000');
    }

    // Create team in transaction
    const team = await db.transaction(async (tx) => {
      // Create team
      const [newTeam] = await tx
        .insert(teams)
        .values({
          ...teamData,
          createdAt: new Date(),
          updatedAt: new Date(),
          totalPoints: 0
        })
        .returning();
      
      // Create team-rider associations
      for (const riderId of riderIds) {
        await tx
          .insert(teamRiders)
          .values({
            teamId: newTeam.id,
            riderId: riderId
          });
      }
      
      return newTeam;
    });

    // Return team with riders
    return {
      ...team,
      riders,
      totalCost
    };
  }

  async updateTeam(id: number, teamData: Partial<Team>, riderIds?: number[]): Promise<TeamWithRiders | undefined> {
    const team = await this.getTeam(id);
    if (!team) return undefined;

    // Update team in transaction if riderIds are provided
    if (riderIds && riderIds.length > 0) {
      // Validate team composition
      const selectedRiders = await Promise.all(
        riderIds.map(id => this.getRider(id))
      );
      
      // Filter out any undefined riders
      const riders = selectedRiders.filter(rider => rider !== undefined) as Rider[];
      
      const maleRiders = riders.filter(r => r.gender === 'male');
      const femaleRiders = riders.filter(r => r.gender === 'female');
      
      if (riders.length !== 6) {
        throw new Error('Team must have exactly 6 riders');
      }
      
      if (maleRiders.length > 4) {
        throw new Error('Team can have a maximum of 4 male riders');
      }
      
      if (femaleRiders.length < 2) {
        throw new Error('Team must have at least 2 female riders');
      }

      // Check budget
      const totalCost = riders.reduce((sum, rider) => sum + rider.cost, 0);
      if (totalCost > 2000000) {
        throw new Error('Team exceeds the budget of $2,000,000');
      }

      await db.transaction(async (tx) => {
        // Update team data
        await tx
          .update(teams)
          .set({
            ...teamData,
            updatedAt: new Date()
          })
          .where(eq(teams.id, id));
        
        // Delete existing team-rider associations
        await tx
          .delete(teamRiders)
          .where(eq(teamRiders.teamId, id));
        
        // Create new team-rider associations
        for (const riderId of riderIds) {
          await tx
            .insert(teamRiders)
            .values({
              teamId: id,
              riderId: riderId
            });
        }
      });
    } else {
      // Just update team data
      await db
        .update(teams)
        .set({
          ...teamData,
          updatedAt: new Date()
        })
        .where(eq(teams.id, id));
    }

    // Return updated team with riders
    return await this.getTeamWithRiders(id);
  }
  
  async deleteTeam(id: number): Promise<boolean> {
    try {
      await db.transaction(async (tx) => {
        // Delete team-rider associations first
        await tx
          .delete(teamRiders)
          .where(eq(teamRiders.teamId, id));
        
        // Then delete the team
        await tx
          .delete(teams)
          .where(eq(teams.id, id));
      });
      
      return true;
    } catch (error) {
      console.error("Error deleting team:", error);
      return false;
    }
  }

  // Race operations
  async getRaces(): Promise<Race[]> {
    return await db.select().from(races);
  }

  async getRace(id: number): Promise<Race | undefined> {
    const result = await db.select().from(races).where(eq(races.id, id));
    return result[0];
  }

  async getRaceWithResults(id: number): Promise<RaceWithResults | undefined> {
    const race = await this.getRace(id);
    if (!race) return undefined;
    
    const raceResults = await this.getResults(id);
    
    return {
      ...race,
      results: raceResults
    };
  }

  async createRace(race: InsertRace): Promise<Race> {
    // Process date strings for new races as well
    const processedRace = { ...race };
    
    if (typeof processedRace.startDate === 'string') {
      processedRace.startDate = new Date(processedRace.startDate);
    }
    
    if (typeof processedRace.endDate === 'string') {
      processedRace.endDate = new Date(processedRace.endDate);
    }
    
    const result = await db.insert(races).values(processedRace).returning();
    return result[0];
  }

  async updateRace(id: number, raceData: Partial<Race>): Promise<Race | undefined> {
    // Convert date strings to Date objects if they're strings
    const processedData: Partial<Race> = { ...raceData };
    
    if (typeof processedData.startDate === 'string') {
      processedData.startDate = new Date(processedData.startDate);
    }
    
    if (typeof processedData.endDate === 'string') {
      processedData.endDate = new Date(processedData.endDate);
    }
    
    const result = await db
      .update(races)
      .set(processedData)
      .where(eq(races.id, id))
      .returning();
    return result[0];
  }
  
  // Result operations
  async getResults(raceId: number): Promise<(Result & { rider: Rider })[]> {
    const raceResults = await db.select().from(results).where(eq(results.raceId, raceId));
    
    const resultsWithRiders = await Promise.all(
      raceResults.map(async (result) => {
        const rider = await this.getRider(result.riderId);
        return {
          ...result,
          rider: rider as Rider
        };
      })
    );
    
    return resultsWithRiders;
  }

  async addResult(result: InsertResult): Promise<Result> {
    const insertedResult = await db.insert(results).values(result).returning();
    return insertedResult[0];
  }

  async updateTeamPoints(): Promise<void> {
    // Get all teams
    const allTeams = await db.select().from(teams);
    
    // For each team, recalculate points
    for (const team of allTeams) {
      // Get the team's riders
      const teamWithRiders = await this.getTeamWithRiders(team.id);
      if (!teamWithRiders) continue;
      
      // Calculate total points by summing rider points
      const totalPoints = teamWithRiders.riders.reduce(
        (sum, rider) => sum + (rider.points || 0), 
        0
      );
      
      // Update team's total points
      await db
        .update(teams)
        .set({ totalPoints })
        .where(eq(teams.id, team.id));
    }
  }
  
  // Leaderboard operations
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    // Get all teams with their total points
    const allTeams = await db.select().from(teams).orderBy(desc(teams.totalPoints));
    
    // Build leaderboard
    const leaderboard: LeaderboardEntry[] = [];
    
    for (let i = 0; i < allTeams.length; i++) {
      const team = allTeams[i];
      const teamWithRiders = await this.getTeamWithRiders(team.id);
      if (!teamWithRiders) continue;
      
      const user = await this.getUser(team.userId);
      if (!user) continue;
      
      // For demonstration purposes, use a random value for lastRoundPoints
      const lastRoundPoints = Math.floor(Math.random() * 100);
      
      leaderboard.push({
        rank: i + 1,
        team: teamWithRiders,
        user,
        lastRoundPoints,
        totalPoints: team.totalPoints || 0
      });
    }
    
    return leaderboard;
  }

  // Data initialization for a new database
  private async initializeSampleData() {
    try {
      // Check if we already have riders in the database
      const existingRiders = await db.select().from(riders);
      if (existingRiders.length > 0) {
        console.log("Database already contains sample data. Skipping initialization.");
        return;
      }

      console.log("Initializing database with sample data...");
      
      // Import the generateRiderId function
      const { generateRiderId } = require("@shared/utils");
      
      // Sample riders data
      const sampleRiders: InsertRider[] = [
        { riderId: generateRiderId("Loic Bruni"), name: "Loic Bruni", gender: "male", team: "Specialized Gravity", cost: 350000, lastYearStanding: 1, image: "https://images.unsplash.com/photo-1564585222527-c2777a5bc6cb", country: "France", points: 215, form: JSON.stringify([2, 1, 4, 1, 3]) },
        { riderId: generateRiderId("Amaury Pierron"), name: "Amaury Pierron", gender: "male", team: "Commencal/Muc-Off", cost: 325000, lastYearStanding: 2, image: "https://pixabay.com/get/gdc9b1ef2b2aedf4e681de3e4b1dd19b13a845b393cefcdccd6744c7ab1ecb270558a49665ba44bb2200498d0c349df1303f138e60ab0d8883be61aea348bd266_1280.jpg", country: "France", points: 205, form: JSON.stringify([3, 6, 2, 1, 0]) },
        { riderId: generateRiderId("Troy Brosnan"), name: "Troy Brosnan", gender: "male", team: "Canyon Collective", cost: 280000, lastYearStanding: 3, image: "https://pixabay.com/get/g3a1af921072d00ed8251d3fe0d9eaeedfb61d355148715a2330a66168baf531a8f01cfc7aac1a2cab21a2271872ba386711d8b1dadd91c9a9928b09f0d99b440_1280.jpg", country: "Australia", points: 190, form: JSON.stringify([5, 4, 3, 1, 2]) },
        { riderId: generateRiderId("Finn Iles"), name: "Finn Iles", gender: "male", team: "Specialized Gravity", cost: 260000, lastYearStanding: 4, image: "https://pixabay.com/get/g751aa0d1ab1f9ca6d5508fdb09df26de0a85b3824bb4f9e9b77ad79275d045f226d7a01b000170bd1c6f1878663a0ef61fd89985a5c26c8412bc44582129ddb3_1280.jpg", country: "Canada", points: 175, form: JSON.stringify([8, 4, 3, 2, 4]) },
        { riderId: generateRiderId("Danny Hart"), name: "Danny Hart", gender: "male", team: "Cube Factory", cost: 180000, lastYearStanding: 5, image: "https://pixabay.com/get/g82d416b5bbc7820f8ea5af0c90bdf0829e8ad8f769a046921399f801203c7f8279dd2ab9c12a25bf7b72534d11000953079db6657a267d77c0d503cc805b703e_1280.jpg", country: "UK", points: 170, form: JSON.stringify([6, 7, 5, 3, 4]) },
        { riderId: generateRiderId("Laurie Greenland"), name: "Laurie Greenland", gender: "male", team: "MS Mondraker", cost: 220000, lastYearStanding: 6, image: "https://pixabay.com/get/gdc9b1ef2b2aedf4e681de3e4b1dd19b13a845b393cefcdccd6744c7ab1ecb270558a49665ba44bb2200498d0c349df1303f138e60ab0d8883be61aea348bd266_1280.jpg", country: "UK", points: 160, form: JSON.stringify([7, 5, 4, 6, 3]) },
        { riderId: generateRiderId("Dakotah Norton"), name: "Dakotah Norton", gender: "male", team: "INTENSE Factory", cost: 200000, lastYearStanding: 7, image: "https://pixabay.com/get/g3a1af921072d00ed8251d3fe0d9eaeedfb61d355148715a2330a66168baf531a8f01cfc7aac1a2cab21a2271872ba386711d8b1dadd91c9a9928b09f0d99b440_1280.jpg", country: "USA", points: 155, form: JSON.stringify([4, 8, 7, 5, 6]) },
        { riderId: generateRiderId("Bernard Kerr"), name: "Bernard Kerr", gender: "male", team: "Pivot Factory", cost: 170000, lastYearStanding: 8, image: "https://pixabay.com/get/g751aa0d1ab1f9ca6d5508fdb09df26de0a85b3824bb4f9e9b77ad79275d045f226d7a01b000170bd1c6f1878663a0ef61fd89985a5c26c8412bc44582129ddb3_1280.jpg", country: "UK", points: 150, form: JSON.stringify([9, 6, 5, 7, 5]) },
        { riderId: generateRiderId("Luca Shaw"), name: "Luca Shaw", gender: "male", team: "Santa Cruz Syndicate", cost: 180000, lastYearStanding: 9, image: "https://pixabay.com/get/g82d416b5bbc7820f8ea5af0c90bdf0829e8ad8f769a046921399f801203c7f8279dd2ab9c12a25bf7b72534d11000953079db6657a267d77c0d503cc805b703e_1280.jpg", country: "USA", points: 145, form: JSON.stringify([10, 7, 6, 8, 7]) },
        { riderId: generateRiderId("Loris Vergier"), name: "Loris Vergier", gender: "male", team: "Trek Factory", cost: 280000, lastYearStanding: 10, image: "https://pixabay.com/get/g3a1af921072d00ed8251d3fe0d9eaeedfb61d355148715a2330a66168baf531a8f01cfc7aac1a2cab21a2271872ba386711d8b1dadd91c9a9928b09f0d99b440_1280.jpg", country: "France", points: 138, form: JSON.stringify([1, 9, 8, 12, 3]) },
        { riderId: generateRiderId("Greg Minnaar"), name: "Greg Minnaar", gender: "male", team: "Santa Cruz Syndicate", cost: 260000, lastYearStanding: 11, image: "https://pixabay.com/get/g751aa0d1ab1f9ca6d5508fdb09df26de0a85b3824bb4f9e9b77ad79275d045f226d7a01b000170bd1c6f1878663a0ef61fd89985a5c26c8412bc44582129ddb3_1280.jpg", country: "South Africa", points: 130, form: JSON.stringify([12, 8, 10, 4, 15]) },
        { riderId: generateRiderId("Aaron Gwin"), name: "Aaron Gwin", gender: "male", team: "Intense Factory", cost: 240000, lastYearStanding: 12, image: "https://pixabay.com/get/g82d416b5bbc7820f8ea5af0c90bdf0829e8ad8f769a046921399f801203c7f8279dd2ab9c12a25bf7b72534d11000953079db6657a267d77c0d503cc805b703e_1280.jpg", country: "USA", points: 125, form: JSON.stringify([15, 10, 9, 6, 5]) },
        
        // Female riders
        { riderId: generateRiderId("Vali Höll"), name: "Vali Höll", gender: "female", team: "RockShox Trek", cost: 320000, lastYearStanding: 1, image: "https://pixabay.com/get/gdc9b1ef2b2aedf4e681de3e4b1dd19b13a845b393cefcdccd6744c7ab1ecb270558a49665ba44bb2200498d0c349df1303f138e60ab0d8883be61aea348bd266_1280.jpg", country: "Austria", points: 210, form: JSON.stringify([1, 1, 2, 3, 1]) },
        { riderId: generateRiderId("Camille Balanche"), name: "Camille Balanche", gender: "female", team: "Dorval AM", cost: 290000, lastYearStanding: 2, image: "https://pixabay.com/get/g3a1af921072d00ed8251d3fe0d9eaeedfb61d355148715a2330a66168baf531a8f01cfc7aac1a2cab21a2271872ba386711d8b1dadd91c9a9928b09f0d99b440_1280.jpg", country: "Switzerland", points: 195, form: JSON.stringify([2, 3, 1, 2, 4]) },
        { riderId: generateRiderId("Myriam Nicole"), name: "Myriam Nicole", gender: "female", team: "Commencal/Muc-Off", cost: 270000, lastYearStanding: 3, image: "https://pixabay.com/get/g751aa0d1ab1f9ca6d5508fdb09df26de0a85b3824bb4f9e9b77ad79275d045f226d7a01b000170bd1c6f1878663a0ef61fd89985a5c26c8412bc44582129ddb3_1280.jpg", country: "France", points: 180, form: JSON.stringify([3, 2, 4, 1, 2]) },
        { riderId: generateRiderId("Marine Cabirou"), name: "Marine Cabirou", gender: "female", team: "Scott Downhill", cost: 250000, lastYearStanding: 4, image: "https://pixabay.com/get/g82d416b5bbc7820f8ea5af0c90bdf0829e8ad8f769a046921399f801203c7f8279dd2ab9c12a25bf7b72534d11000953079db6657a267d77c0d503cc805b703e_1280.jpg", country: "France", points: 165, form: JSON.stringify([6, 4, 3, 5, 3]) },
        { riderId: generateRiderId("Tahnée Seagrave"), name: "Tahnée Seagrave", gender: "female", team: "Canyon Collective", cost: 230000, lastYearStanding: 5, image: "https://pixabay.com/get/gdc9b1ef2b2aedf4e681de3e4b1dd19b13a845b393cefcdccd6744c7ab1ecb270558a49665ba44bb2200498d0c349df1303f138e60ab0d8883be61aea348bd266_1280.jpg", country: "UK", points: 150, form: JSON.stringify([5, 6, 5, 4, 5]) },
        { riderId: generateRiderId("Nina Hoffmann"), name: "Nina Hoffmann", gender: "female", team: "Santa Cruz Syndicate", cost: 200000, lastYearStanding: 6, image: "https://pixabay.com/get/g3a1af921072d00ed8251d3fe0d9eaeedfb61d355148715a2330a66168baf531a8f01cfc7aac1a2cab21a2271872ba386711d8b1dadd91c9a9928b09f0d99b440_1280.jpg", country: "Germany", points: 140, form: JSON.stringify([4, 5, 7, 6, 6]) },
        { riderId: generateRiderId("Eleonora Farina"), name: "Eleonora Farina", gender: "female", team: "MS Mondraker", cost: 180000, lastYearStanding: 7, image: "https://pixabay.com/get/g751aa0d1ab1f9ca6d5508fdb09df26de0a85b3824bb4f9e9b77ad79275d045f226d7a01b000170bd1c6f1878663a0ef61fd89985a5c26c8412bc44582129ddb3_1280.jpg", country: "Italy", points: 130, form: JSON.stringify([7, 7, 6, 7, 8]) },
        { riderId: generateRiderId("Anna Newkirk"), name: "Anna Newkirk", gender: "female", team: "Canyon Collective", cost: 160000, lastYearStanding: 8, image: "https://pixabay.com/get/g82d416b5bbc7820f8ea5af0c90bdf0829e8ad8f769a046921399f801203c7f8279dd2ab9c12a25bf7b72534d11000953079db6657a267d77c0d503cc805b703e_1280.jpg", country: "USA", points: 120, form: JSON.stringify([8, 8, 9, 8, 7]) },
      ];
      
      // Insert sample riders
      for (const rider of sampleRiders) {
        await this.createRider(rider);
      }
      
      // Sample races data
      const sampleRaces: InsertRace[] = [
        {
          name: "Fort William",
          location: "Fort William",
          country: "United Kingdom",
          startDate: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
          endDate: new Date(new Date().getTime() + 9 * 24 * 60 * 60 * 1000),
          status: 'next'
        },
        {
          name: "Leogang",
          location: "Leogang",
          country: "Austria",
          startDate: new Date(new Date().getTime() + 21 * 24 * 60 * 60 * 1000), // 3 weeks from now
          endDate: new Date(new Date().getTime() + 23 * 24 * 60 * 60 * 1000),
          status: 'upcoming'
        },
        {
          name: "Val di Sole",
          location: "Val di Sole",
          country: "Italy", 
          startDate: new Date(new Date().getTime() + 35 * 24 * 60 * 60 * 1000), // 5 weeks from now
          endDate: new Date(new Date().getTime() + 37 * 24 * 60 * 60 * 1000),
          status: 'upcoming'
        },
        {
          name: "Lenzerheide",
          location: "Lenzerheide",
          country: "Switzerland",
          startDate: new Date(new Date().getTime() + 49 * 24 * 60 * 60 * 1000), // 7 weeks from now
          endDate: new Date(new Date().getTime() + 51 * 24 * 60 * 60 * 1000),
          status: 'upcoming'
        },
        {
          name: "Mont-Sainte-Anne",
          location: "Mont-Sainte-Anne",
          country: "Canada",
          startDate: new Date(new Date().getTime() + 63 * 24 * 60 * 60 * 1000), // 9 weeks from now
          endDate: new Date(new Date().getTime() + 65 * 24 * 60 * 60 * 1000),
          status: 'upcoming'
        }
      ];
      
      // Insert sample races
      for (const race of sampleRaces) {
        await this.createRace(race);
      }
      
      console.log("Sample data initialization completed.");
    } catch (error) {
      console.error("Error initializing sample data:", error);
    }
  }
}

export const storage = new DatabaseStorage();