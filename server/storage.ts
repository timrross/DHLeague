import {
  users,
  type User,
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
  type LeaderboardEntry,
  teamSwaps,
  type TeamSwap,
  type InsertTeamSwap,
  type InsertUser
} from "@shared/schema";
import { db } from "./db";
import { eq, and, asc, desc, sql, gte, lte, ilike, or } from "drizzle-orm";
import { generateRiderId } from "@shared/utils";

export type RiderFilters = {
  gender?: string;
  category?: string;
  minCost?: number;
  maxCost?: number;
  team?: string;
  search?: string;
};

export type RiderSortField = "name" | "cost" | "points" | "lastYearStanding" | "team";

export type RiderSortDirection = "asc" | "desc";
export function calculateRaceStatus(
  startDate: Date,
  endDate: Date,
  now: Date = new Date()
): "upcoming" | "ongoing" | "completed" {
  if (now < startDate) {
    return "upcoming";
  }

  if (now >= startDate && now <= endDate) {
    return "ongoing";
  }

  return "completed";
}

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: InsertUser): Promise<User>;
  
  // Rider operations
  getRiders(): Promise<Rider[]>;
  getRidersFiltered(
    filters: RiderFilters,
    options?: {
      limit?: number;
      offset?: number;
      sortBy?: RiderSortField;
      sortDir?: RiderSortDirection;
    }
  ): Promise<{ riders: Rider[]; total: number }>;
  getRider(id: number): Promise<Rider | undefined>;
  getRiderByRiderId(riderId: string): Promise<Rider | undefined>;
  createRider(rider: InsertRider): Promise<Rider>;
  updateRider(id: number, rider: Partial<Rider>): Promise<Rider | undefined>;
  getRidersByGender(gender: string): Promise<Rider[]>;
  deleteAllRiders(): Promise<void>;
  deleteRider(id: number): Promise<boolean>;
  
  // Team operations
  getTeam(id: number): Promise<Team | undefined>;
  getTeamWithRiders(id: number): Promise<TeamWithRiders | undefined>;
  getUserTeam(userId: string, teamType?: "elite" | "junior"): Promise<TeamWithRiders | undefined>;
  createTeam(team: InsertTeam, riderIds: number[]): Promise<TeamWithRiders>;
  updateTeam(id: number, team: Partial<Team>, riderIds?: number[]): Promise<TeamWithRiders | undefined>;
  deleteTeam(id: number): Promise<boolean>;
  
  // Race operations
  getRaces(): Promise<Race[]>;
  getRacesWithStatuses(now?: Date): Promise<Race[]>;
  getRaceStatusBuckets(now?: Date): Promise<{
    races: Race[];
    nextRace?: Race;
    upcomingRaces: Race[];
    ongoingRaces: Race[];
    completedRaces: Race[];
  }>;
  getRace(id: number): Promise<Race | undefined>;
  getRaceWithStatus(id: number, now?: Date): Promise<Race | undefined>;
  getRaceWithResults(id: number): Promise<RaceWithResults | undefined>;
  getRaceByNameAndStartDate(name: string, startDate: Date): Promise<Race | undefined>;
  createRace(race: InsertRace): Promise<Race>;
  updateRace(id: number, race: Partial<Race>): Promise<Race | undefined>;
  getRaceResultsStub(
    raceId: number,
    now?: Date
  ): Promise<
    | (Race & {
      results: (Result & { rider: Rider })[];
    })
    | undefined
  >;
  
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
  }

  private applyRaceStatuses(races: Race[], now: Date = new Date()): Race[] {
    const racesWithStatus = races.map((race) => {
      const startDate = new Date(race.startDate);
      const endDate = new Date(race.endDate);

      return {
        ...race,
        status: calculateRaceStatus(startDate, endDate, now)
      } as Race;
    });

    // Identify the next upcoming race (closest future start)
    const upcomingRaces = racesWithStatus
      .filter((race) => race.status === "upcoming")
      .sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );

    if (upcomingRaces[0]) {
      upcomingRaces[0].status = "next";
    }

    return racesWithStatus;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async upsertUser(userData: InsertUser): Promise<User> {
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
        const team = await this.getUserTeam(user.id, "elite");
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

  async getRidersFiltered(
    filters: RiderFilters,
    options: {
      limit?: number;
      offset?: number;
      sortBy?: RiderSortField;
      sortDir?: RiderSortDirection;
    } = {}
  ): Promise<{ riders: Rider[]; total: number }> {
    const whereClauses = [];

    if (filters.gender) {
      whereClauses.push(eq(riders.gender, filters.gender));
    }

    if (filters.category) {
      whereClauses.push(eq(riders.category, filters.category));
    }

    if (filters.team) {
      // Case-insensitive team match
      whereClauses.push(sql`LOWER(${riders.team}) = LOWER(${filters.team})`);
    }

    if (typeof filters.minCost === "number") {
      whereClauses.push(gte(riders.cost, filters.minCost));
    }

    if (typeof filters.maxCost === "number") {
      whereClauses.push(lte(riders.cost, filters.maxCost));
    }

    if (filters.search) {
      const pattern = `%${filters.search}%`;
      whereClauses.push(
        or(
          ilike(riders.name, pattern),
          ilike(riders.firstName, pattern),
          ilike(riders.lastName, pattern),
          ilike(riders.team, pattern)
        )
      );
    }

    const whereStatement =
      whereClauses.length > 0 ? and(...whereClauses) : undefined;

    const { limit = 50, offset = 0, sortBy = "name", sortDir = "asc" } = options;

    const sortColumnMap: Record<RiderSortField, any> = {
      name: riders.name,
      cost: riders.cost,
      points: riders.points,
      lastYearStanding: riders.lastYearStanding,
      team: riders.team
    };

    const orderBy = sortDir === "desc"
      ? desc(sortColumnMap[sortBy])
      : asc(sortColumnMap[sortBy]);

    const query = db.select().from(riders);
    const countQuery = db.select({ count: sql<number>`count(*)` }).from(riders);

    if (whereStatement) {
      query.where(whereStatement);
      countQuery.where(whereStatement);
    }

    query.orderBy(orderBy).limit(limit).offset(offset);

    const [ridersResult, totalResult] = await Promise.all([
      query,
      countQuery
    ]);

    const total = Number(totalResult[0]?.count ?? 0);

    return { riders: ridersResult, total };
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

    // Clear swap history (references riders)
    await db.delete(teamSwaps);

    // Finally delete all riders
    await db.delete(riders);
  }

  async deleteRider(id: number): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const existing = await tx.select().from(riders).where(eq(riders.id, id));

      if (existing.length === 0) {
        return false;
      }

      await tx.delete(results).where(eq(results.riderId, id));
      await tx.delete(teamRiders).where(eq(teamRiders.riderId, id));
      await tx
        .delete(teamSwaps)
        .where(or(eq(teamSwaps.removedRiderId, id), eq(teamSwaps.addedRiderId, id)));

      await tx.delete(riders).where(eq(riders.id, id));
      return true;
    });
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

  async getUserTeam(
    userId: string,
    teamType: "elite" | "junior" = "elite",
  ): Promise<TeamWithRiders | undefined> {
    const userTeamResult = await db
      .select()
      .from(teams)
      .where(and(eq(teams.userId, userId), eq(teams.teamType, teamType)));
    
    if (userTeamResult.length === 0) return undefined;
    
    const team = userTeamResult[0];
    return this.getTeamWithRiders(team.id);
  }

  async createTeam(teamData: InsertTeam, riderIds: number[]): Promise<TeamWithRiders> {
    const teamType = teamData.teamType === "junior" ? "junior" : "elite";

    const existingTeam = await db
      .select({ id: teams.id })
      .from(teams)
      .where(and(eq(teams.userId, teamData.userId), eq(teams.teamType, teamType)))
      .limit(1);

    if (existingTeam.length) {
      throw new Error(`User already has a ${teamType} team`);
    }

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

    const invalidCategory = riders.filter((r) => r.category !== teamType);
    if (invalidCategory.length) {
      throw new Error(
        `All riders must be ${teamType === "junior" ? "junior" : "elite"} riders`,
      );
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
          teamType,
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
    const teamType = team.teamType === "junior" ? "junior" : "elite";
    const { teamType: _ignoredTeamType, ...safeTeamData } = teamData as any;

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

      const invalidCategory = riders.filter((r) => r.category !== teamType);
      if (invalidCategory.length) {
        throw new Error(
          `All riders must be ${teamType === "junior" ? "junior" : "elite"} riders`,
        );
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
            ...safeTeamData,
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
          ...safeTeamData,
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

  async getRacesWithStatuses(now: Date = new Date()): Promise<Race[]> {
    const allRaces = await this.getRaces();
    return this.applyRaceStatuses(allRaces, now);
  }

  async getRaceStatusBuckets(now: Date = new Date()): Promise<{
    races: Race[];
    nextRace?: Race;
    upcomingRaces: Race[];
    ongoingRaces: Race[];
    completedRaces: Race[];
  }> {
    const racesWithStatus = await this.getRacesWithStatuses(now);
    const nextRace = racesWithStatus.find((race) => race.status === "next");

    return {
      races: racesWithStatus,
      nextRace,
      upcomingRaces: racesWithStatus.filter(
        (race) => race.status === "upcoming" || race.status === "next"
      ),
      ongoingRaces: racesWithStatus.filter((race) => race.status === "ongoing"),
      completedRaces: racesWithStatus.filter(
        (race) => race.status === "completed"
      )
    };
  }

  async getRace(id: number): Promise<Race | undefined> {
    const result = await db.select().from(races).where(eq(races.id, id));
    return result[0];
  }

  async getRaceByNameAndStartDate(name: string, startDate: Date): Promise<Race | undefined> {
    const result = await db
      .select()
      .from(races)
      .where(
        and(
          eq(races.name, name),
          eq(races.startDate, startDate)
        )
      );

    return result[0];
  }

  async getRaceWithStatus(
    id: number,
    now: Date = new Date()
  ): Promise<Race | undefined> {
    const races = await this.getRacesWithStatuses(now);
    return races.find((race) => race.id === id);
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

  async getRaceResultsStub(
    raceId: number,
    now: Date = new Date()
  ): Promise<
    | (Race & {
      results: (Result & { rider: Rider })[];
    })
    | undefined
  > {
    const raceWithStatus = await this.getRaceWithStatus(raceId, now);
    if (!raceWithStatus) return undefined;

    const raceResults = await this.getResults(raceId);

    return {
      ...raceWithStatus,
      results: raceResults
    };
  }
  
  // Result operations
  async getResults(raceId: number): Promise<(Result & { rider: Rider })[]> {
    const raceResults = await db
      .select({
        result: results,
        rider: riders
      })
      .from(results)
      .leftJoin(riders, eq(results.riderId, riders.id))
      .where(eq(results.raceId, raceId));

    const missingRiders = raceResults.filter(({ rider }) => !rider);
    if (missingRiders.length > 0) {
      const missingRiderIds = missingRiders.map(({ result }) => result.riderId).join(", ");
      console.warn(`Missing rider records for race ${raceId}: [${missingRiderIds}]`);
    }

    return raceResults
      .filter(({ rider }) => rider)
      .map(({ result, rider }) => ({
        ...result,
        rider: rider as Rider
      }));
  }

  async addResult(result: InsertResult): Promise<Result> {
    const insertedResult = await db.insert(results).values(result).returning();
    return insertedResult[0];
  }

  async updateTeamPoints(): Promise<void> {
    // Get all teams
    const allTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.teamType, "elite"));
    
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
    const allTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.teamType, "elite"))
      .orderBy(desc(teams.totalPoints));
    
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
}

export const storage = new DatabaseStorage();
