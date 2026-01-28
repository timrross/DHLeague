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
  teamMembers,
  races,
  type Race,
  type InsertRace,
  raceResults,
  type RaceResult,
  type TeamWithRiders,
  type RaceWithResults,
  teamSwaps,
  type InsertUser,
  friends,
  type Friend,
  type FriendWithUser,
  type PublicUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, asc, desc, sql, gte, lte, ilike, or, inArray } from "drizzle-orm";
import { getEditingWindow } from "./services/game/editingWindow";
import { getActiveSeasonId, getSeasonIdForDate } from "./services/game/seasons";
import { scoreRiderResult } from "./services/game/scoring/scoreTeamSnapshot";
import type { ResultStatus } from "./services/game/config";

export type RiderWithLastRoundPoints = Rider & {
  lastRoundPoints?: number;
};

export type RiderFilters = {
  gender?: string;
  category?: string;
  minCost?: number;
  maxCost?: number;
  team?: string;
  search?: string;
  active?: boolean;
};

export type RiderSortField = "name" | "cost" | "points" | "lastYearStanding" | "team";

export type RiderSortDirection = "asc" | "desc";

export type RaceInput = Omit<
  InsertRace,
  "seasonId" | "discipline" | "lockAt" | "gameStatus" | "needsResettle"
> &
  Partial<
    Pick<
      InsertRace,
      "seasonId" | "discipline" | "lockAt" | "gameStatus" | "needsResettle"
    >
  >;

async function resolveSeasonId(seasonId?: number): Promise<number> {
  if (seasonId) return seasonId;
  return await getActiveSeasonId();
}
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
      includeLastRoundPoints?: boolean;
    }
  ): Promise<{ riders: RiderWithLastRoundPoints[]; total: number }>;
  getRider(id: number): Promise<Rider | undefined>;
  getRiderByRiderId(riderId: string): Promise<Rider | undefined>;
  getRiderByUciId(uciId: string): Promise<Rider | undefined>;
  createRider(rider: InsertRider): Promise<Rider>;
  updateRider(id: number, rider: Partial<Rider>): Promise<Rider | undefined>;
  getRidersByGender(gender: string): Promise<Rider[]>;
  deleteAllRiders(): Promise<void>;
  deleteRider(id: number): Promise<boolean>;
  
  // Team operations
  getTeam(id: number): Promise<Team | undefined>;
  getTeamWithRiders(id: number): Promise<TeamWithRiders | undefined>;
  getUserTeam(
    userId: string,
    teamType?: "elite" | "junior",
    seasonId?: number,
  ): Promise<TeamWithRiders | undefined>;
  createTeam(
    team: InsertTeam,
    riderIds: number[],
    benchRiderId?: number | null,
  ): Promise<TeamWithRiders>;
  updateTeam(
    id: number,
    team: Partial<Team>,
    riderIds?: number[],
    benchRiderId?: number | null,
  ): Promise<TeamWithRiders | undefined>;
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
  createRace(race: RaceInput): Promise<Race>;
  updateRace(id: number, race: Partial<Race>): Promise<Race | undefined>;
  getRaceResults(raceId: number): Promise<(RaceResult & { rider: Rider; points: number })[]>;
  
  // Admin operations
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, userData: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getUsersWithTeams(): Promise<(User & { team?: TeamWithRiders })[]>;

  // Team name operations
  isTeamNameAvailable(name: string, excludeTeamId?: number): Promise<boolean>;

  // Friend operations
  getFriends(userId: string): Promise<FriendWithUser[]>;
  getFriendStatus(userId: string, otherUserId: string): Promise<"none" | "pending_sent" | "pending_received" | "accepted">;
  getPendingFriendRequests(userId: string): Promise<FriendWithUser[]>;
  sendFriendRequest(requesterId: string, addresseeId: string): Promise<Friend>;
  acceptFriendRequest(userId: string, requestId: number): Promise<Friend>;
  rejectFriendRequest(userId: string, requestId: number): Promise<boolean>;
  removeFriend(userId: string, friendId: number): Promise<boolean>;
  getPendingRequestCount(userId: string): Promise<number>;
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

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return result[0];
  }

  async findAvailableUsername(base: string, maxLength = 20): Promise<string> {
    const fallback = "user";
    const normalizedBase = (base || fallback).slice(0, maxLength);
    const safeBase = normalizedBase.length >= 3 ? normalizedBase : fallback;
    let candidate = safeBase;
    let suffix = 0;
    while (true) {
      const existing = await this.getUserByUsername(candidate);
      if (!existing) {
        return candidate;
      }
      suffix += 1;
      const suffixText = String(suffix);
      const trimmedBase = safeBase.slice(0, maxLength - suffixText.length);
      candidate = `${trimmedBase}${suffixText}`;
    }
  }

  async upsertUser(userData: InsertUser): Promise<User> {
    const updateValues: Partial<User> = {
      updatedAt: new Date(),
    };

    (Object.entries(userData) as Array<
      [keyof InsertUser, InsertUser[keyof InsertUser]]
    >).forEach(([key, value]) => {
      if (value !== undefined) {
        (updateValues as Record<string, unknown>)[key] = value;
      }
    });

    const result = await db
      .insert(users)
      .values({
        ...userData,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: users.id,
        set: updateValues,
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
      includeLastRoundPoints?: boolean;
    } = {}
  ): Promise<{ riders: RiderWithLastRoundPoints[]; total: number }> {
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

    if (typeof filters.active === "boolean") {
      whereClauses.push(eq(riders.active, filters.active));
    }

    const whereStatement =
      whereClauses.length > 0 ? and(...whereClauses) : undefined;

    const {
      limit = 50,
      offset = 0,
      sortBy = "name",
      sortDir = "asc",
      includeLastRoundPoints = false,
    } = options;

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

    if (!includeLastRoundPoints || ridersResult.length === 0) {
      return { riders: ridersResult, total };
    }

    const latestRaceRows = await db
      .select({ raceId: raceResults.raceId, startDate: races.startDate })
      .from(raceResults)
      .innerJoin(races, eq(raceResults.raceId, races.id))
      .orderBy(desc(races.startDate))
      .limit(1);

    const latestRaceId = latestRaceRows[0]?.raceId;
    if (!latestRaceId) {
      return {
        riders: ridersResult.map((rider) => ({
          ...rider,
          lastRoundPoints: 0,
        })),
        total,
      };
    }

    const riderUciIds = ridersResult.map((rider) => rider.uciId);
    const lastRoundResults = await db
      .select()
      .from(raceResults)
      .where(
        and(
          eq(raceResults.raceId, latestRaceId),
          inArray(raceResults.uciId, riderUciIds),
        ),
      );

    const pointsByUciId = new Map<string, number>();
    for (const result of lastRoundResults) {
      const scored = scoreRiderResult({
        uciId: result.uciId,
        status: result.status as ResultStatus,
        position: result.position ?? null,
        qualificationPosition: result.qualificationPosition ?? null,
      });
      pointsByUciId.set(result.uciId, scored.finalPoints);
    }

    return {
      riders: ridersResult.map((rider) => ({
        ...rider,
        lastRoundPoints: pointsByUciId.get(rider.uciId) ?? 0,
      })),
      total,
    };
  }

  async getRider(id: number): Promise<Rider | undefined> {
    const result = await db.select().from(riders).where(eq(riders.id, id));
    return result[0];
  }
  
  async getRiderByRiderId(riderId: string): Promise<Rider | undefined> {
    const result = await db.select().from(riders).where(eq(riders.riderId, riderId));
    return result[0];
  }

  async getRiderByUciId(uciId: string): Promise<Rider | undefined> {
    const result = await db.select().from(riders).where(eq(riders.uciId, uciId));
    return result[0];
  }

  async createRider(rider: InsertRider): Promise<Rider> {
    const result = await db.insert(riders).values(rider).returning();
    return result[0];
  }

  async updateRider(id: number, riderData: Partial<Rider>): Promise<Rider | undefined> {
    // Filter out undefined values that would cause "No values to set" error
    const cleanData: Record<string, any> = {};
    
    // Only keep fields that are explicitly provided
    Object.keys(riderData).forEach(key => {
      const value = riderData[key as keyof Rider];
      if (value !== undefined) {
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
    await db.delete(raceResults);

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

      await tx
        .delete(raceResults)
        .where(eq(raceResults.uciId, existing[0].uciId));
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

  private async getBenchRiderForTeam(teamId: number): Promise<Rider | null> {
    const benchRows = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.role, "BENCH")))
      .limit(1);

    if (!benchRows.length) {
      return null;
    }

    const benchRider = await this.getRiderByUciId(benchRows[0].uciId);
    return benchRider ?? null;
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
    
    const benchRider = await this.getBenchRiderForTeam(id);

    // Calculate total cost
    const totalCost =
      riderList.reduce((sum, rider) => sum + rider.cost, 0) +
      (benchRider?.cost ?? 0);

    return {
      ...team,
      riders: riderList,
      totalCost,
      benchRider,
    };
  }

  async getUserTeam(
    userId: string,
    teamType: "elite" | "junior" = "elite",
    seasonId?: number,
  ): Promise<TeamWithRiders | undefined> {
    const resolvedSeasonId = await resolveSeasonId(seasonId);
    const userTeamResult = await db
      .select()
      .from(teams)
      .where(
        and(
          eq(teams.userId, userId),
          eq(teams.teamType, teamType),
          eq(teams.seasonId, resolvedSeasonId),
        ),
      );
    
    if (userTeamResult.length === 0) return undefined;

    const team = userTeamResult[0];
    const roster = await this.getTeamWithRiders(team.id);
    if (!roster) return undefined;

    const editingWindow = await getEditingWindow(resolvedSeasonId);
    return {
      ...roster,
      isLocked: !editingWindow.editingOpen,
    };
  }

  async createTeam(
    teamData: InsertTeam,
    riderIds: number[],
    benchRiderId?: number | null,
  ): Promise<TeamWithRiders> {
    const teamType = teamData.teamType === "junior" ? "junior" : "elite";
    const seasonId = await resolveSeasonId(teamData.seasonId);
    const budgetCap =
      teamData.budgetCap ?? (teamType === "junior" ? 500000 : 2000000);

    const existingTeam = await db
      .select({ id: teams.id })
      .from(teams)
      .where(
        and(
          eq(teams.userId, teamData.userId),
          eq(teams.teamType, teamType),
          eq(teams.seasonId, seasonId),
        ),
      )
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
    
    if (maleRiders.length !== 4 || femaleRiders.length !== 2) {
      throw new Error('Team must have exactly 4 male and 2 female riders');
    }

    const invalidCategory = riders.filter((r) => r.category !== teamType);
    if (invalidCategory.length) {
      throw new Error(
        `All riders must be ${teamType === "junior" ? "junior" : "elite"} riders`,
      );
    }

    let benchRider: Rider | null = null;
    if (benchRiderId !== undefined && benchRiderId !== null) {
      benchRider = (await this.getRider(benchRiderId)) ?? null;
      if (!benchRider) {
        throw new Error("Bench rider not found");
      }
    }

    if (benchRider && riders.some((rider) => rider.id === benchRider?.id)) {
      throw new Error("Bench rider is already a starter");
    }

    if (benchRider && benchRider.category !== teamType) {
      throw new Error(
        `Bench rider must be ${teamType === "junior" ? "junior" : "elite"}`,
      );
    }

    // Check budget
    const totalCost =
      riders.reduce((sum, rider) => sum + rider.cost, 0) +
      (benchRider?.cost ?? 0);
    if (totalCost > budgetCap) {
      throw new Error(`Team exceeds the budget of ${budgetCap}`);
    }

    // Create team in transaction
    const team = await db.transaction(async (tx) => {
      // Create team
      const [newTeam] = await tx
        .insert(teams)
        .values({
          ...teamData,
          teamType,
          seasonId,
          budgetCap,
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

      const ridersById = new Map(riders.map((rider) => [rider.id, rider]));
      for (const [index, riderId] of riderIds.entries()) {
        const rider = ridersById.get(riderId);
        if (!rider) continue;
        await tx.insert(teamMembers).values({
          teamId: newTeam.id,
          uciId: rider.uciId,
          role: "STARTER",
          starterIndex: index,
          gender: rider.gender,
          costAtSave: rider.cost,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      if (benchRider) {
        await tx.insert(teamMembers).values({
          teamId: newTeam.id,
          uciId: benchRider.uciId,
          role: "BENCH",
          starterIndex: null,
          gender: benchRider.gender,
          costAtSave: benchRider.cost,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      
      return newTeam;
    });

    // Return team with riders
    return {
      ...team,
      riders,
      totalCost,
      benchRider,
    };
  }

  async updateTeam(
    id: number,
    teamData: Partial<Team>,
    riderIds?: number[],
    benchRiderId?: number | null,
  ): Promise<TeamWithRiders | undefined> {
    const team = await this.getTeam(id);
    if (!team) return undefined;
    const teamType = team.teamType === "junior" ? "junior" : "elite";
    const { teamType: _ignoredTeamType, ...safeTeamData } = teamData as any;

    // Update team in transaction if riderIds are provided
    if (riderIds && riderIds.length > 0) {
      const existingMembers = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.teamId, id));
      const previousCostByUciId = new Map<string, number>();
      for (const member of existingMembers) {
        if (member.costAtSave !== null && member.costAtSave !== undefined) {
          previousCostByUciId.set(member.uciId, member.costAtSave);
        }
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
      
      if (maleRiders.length !== 4 || femaleRiders.length !== 2) {
        throw new Error('Team must have exactly 4 male and 2 female riders');
      }

      const invalidCategory = riders.filter((r) => r.category !== teamType);
      if (invalidCategory.length) {
        throw new Error(
          `All riders must be ${teamType === "junior" ? "junior" : "elite"} riders`,
        );
      }

      let benchRider: Rider | null = null;
      if (benchRiderId === undefined) {
        benchRider = await this.getBenchRiderForTeam(id);
      } else if (benchRiderId !== null) {
        benchRider = (await this.getRider(benchRiderId)) ?? null;
        if (!benchRider) {
          throw new Error("Bench rider not found");
        }
      }

      if (benchRider && riders.some((rider) => rider.id === benchRider?.id)) {
        throw new Error("Bench rider is already a starter");
      }

      if (benchRider && benchRider.category !== teamType) {
        throw new Error(
          `Bench rider must be ${teamType === "junior" ? "junior" : "elite"}`,
        );
      }

      const costAtSaveByUciId = new Map<string, number>();
      const starterCostTotal = riders.reduce((sum, rider) => {
        const previousCost = previousCostByUciId.get(rider.uciId);
        const costAtSave = previousCost !== undefined
          ? Math.min(previousCost, rider.cost)
          : rider.cost;
        costAtSaveByUciId.set(rider.uciId, costAtSave);
        return sum + costAtSave;
      }, 0);

      const benchCostAtSave = benchRider
        ? (() => {
            const previousCost = previousCostByUciId.get(benchRider.uciId);
            const costAtSave = previousCost !== undefined
              ? Math.min(previousCost, benchRider.cost)
              : benchRider.cost;
            costAtSaveByUciId.set(benchRider.uciId, costAtSave);
            return costAtSave;
          })()
        : 0;

      // Check budget
      const totalCost = starterCostTotal + benchCostAtSave;
      const budgetCap =
        team.budgetCap ?? (teamType === "junior" ? 500000 : 2000000);
      if (totalCost > budgetCap) {
        throw new Error(`Team exceeds the budget of ${budgetCap}`);
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

        await tx
          .delete(teamMembers)
          .where(eq(teamMembers.teamId, id));

        const ridersById = new Map(riders.map((rider) => [rider.id, rider]));
        for (const [index, riderId] of riderIds.entries()) {
          const rider = ridersById.get(riderId);
          if (!rider) continue;
          await tx.insert(teamMembers).values({
            teamId: id,
            uciId: rider.uciId,
            role: "STARTER",
            starterIndex: index,
            gender: rider.gender,
            costAtSave: costAtSaveByUciId.get(rider.uciId) ?? rider.cost,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        if (benchRider) {
          await tx.insert(teamMembers).values({
            teamId: id,
            uciId: benchRider.uciId,
            role: "BENCH",
            starterIndex: null,
            gender: benchRider.gender,
            costAtSave: costAtSaveByUciId.get(benchRider.uciId) ?? benchRider.cost,
            createdAt: new Date(),
            updatedAt: new Date(),
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
        await tx
          .delete(teamMembers)
          .where(eq(teamMembers.teamId, id));

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

  async isTeamNameAvailable(name: string, excludeTeamId?: number): Promise<boolean> {
    const normalizedName = name.trim();
    if (!normalizedName) {
      return false;
    }

    const conditions = [eq(teams.name, normalizedName)];

    const result = await db
      .select({ id: teams.id })
      .from(teams)
      .where(excludeTeamId ? and(...conditions) : conditions[0])
      .limit(1);

    // If excludeTeamId is provided, check if the found team is the same one
    if (result.length > 0 && excludeTeamId && result[0].id === excludeTeamId) {
      return true; // The name belongs to the team being updated
    }

    return result.length === 0;
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
    
    const raceResults = await this.getRaceResults(id);
    
    return {
      ...race,
      results: raceResults
    };
  }

  async createRace(race: RaceInput): Promise<Race> {
    // Process date strings for new races as well
    const processedRace: RaceInput = { ...race };
    
    if (typeof processedRace.startDate === 'string') {
      processedRace.startDate = new Date(processedRace.startDate);
    }
    
    if (typeof processedRace.endDate === 'string') {
      processedRace.endDate = new Date(processedRace.endDate);
    }

    const startDate = processedRace.startDate as Date;
    const seasonId = processedRace.seasonId ?? await getSeasonIdForDate(startDate);
    const lockAt = processedRace.lockAt
      ? new Date(processedRace.lockAt)
      : new Date(startDate.getTime() - 48 * 60 * 60 * 1000);
    const discipline = (processedRace.discipline ?? "DHI").toUpperCase();

    const result = await db
      .insert(races)
      .values({
        ...processedRace,
        seasonId,
        discipline,
        lockAt,
        gameStatus: processedRace.gameStatus ?? "scheduled",
        needsResettle: processedRace.needsResettle ?? false,
      })
      .returning();

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

    if (processedData.startDate instanceof Date) {
      processedData.lockAt = new Date(processedData.startDate.getTime() - 48 * 60 * 60 * 1000);
      processedData.seasonId = await getSeasonIdForDate(processedData.startDate);
    }

    if (processedData.discipline) {
      processedData.discipline = processedData.discipline.toUpperCase();
    }
    
    const result = await db
      .update(races)
      .set(processedData)
      .where(eq(races.id, id))
      .returning();
    return result[0];
  }

  async getRaceResults(
    raceId: number
  ): Promise<(RaceResult & { rider: Rider; points: number })[]> {
    const raceResultRows = await db
      .select({
        result: raceResults,
        rider: riders
      })
      .from(raceResults)
      .leftJoin(riders, eq(raceResults.uciId, riders.uciId))
      .where(eq(raceResults.raceId, raceId));

    const missingRiders = raceResultRows.filter(({ rider }) => !rider);
    if (missingRiders.length > 0) {
      const missingUciIds = missingRiders.map(({ result }) => result.uciId).join(", ");
      console.warn(`Missing rider records for race ${raceId}: [${missingUciIds}]`);
    }

    return raceResultRows
      .filter(({ rider }) => rider)
      .map(({ result, rider }) => {
        const scored = scoreRiderResult({
          uciId: result.uciId,
          status: result.status as ResultStatus,
          position: result.position ?? null,
          qualificationPosition: result.qualificationPosition ?? null,
        });

        return {
          ...result,
          rider: rider as Rider,
          points: scored.finalPoints,
        };
      });
  }

  // Friend operations
  async getFriends(userId: string): Promise<FriendWithUser[]> {
    // Get accepted friendships where user is either requester or addressee
    const friendRows = await db
      .select()
      .from(friends)
      .where(
        and(
          eq(friends.status, "accepted"),
          or(
            eq(friends.requesterId, userId),
            eq(friends.addresseeId, userId)
          )
        )
      );

    // Get the other user's info for each friendship
    const friendsWithUsers: FriendWithUser[] = [];
    for (const friend of friendRows) {
      const otherUserId = friend.requesterId === userId ? friend.addresseeId : friend.requesterId;
      const user = await this.getUser(otherUserId);
      if (user) {
        const publicUser: PublicUser = {
          id: user.id,
          username: user.username ?? null,
        };
        friendsWithUsers.push({ ...friend, user: publicUser });
      }
    }

    return friendsWithUsers;
  }

  async getFriendStatus(
    userId: string,
    otherUserId: string
  ): Promise<"none" | "pending_sent" | "pending_received" | "accepted"> {
    // Check for any relationship between these users
    const relationship = await db
      .select()
      .from(friends)
      .where(
        or(
          and(eq(friends.requesterId, userId), eq(friends.addresseeId, otherUserId)),
          and(eq(friends.requesterId, otherUserId), eq(friends.addresseeId, userId))
        )
      )
      .limit(1);

    if (relationship.length === 0) {
      return "none";
    }

    const friend = relationship[0];
    if (friend.status === "accepted") {
      return "accepted";
    }

    // It's pending - determine direction
    if (friend.requesterId === userId) {
      return "pending_sent";
    }
    return "pending_received";
  }

  async getPendingFriendRequests(userId: string): Promise<FriendWithUser[]> {
    // Get pending requests where user is the addressee
    const pendingRows = await db
      .select()
      .from(friends)
      .where(
        and(
          eq(friends.addresseeId, userId),
          eq(friends.status, "pending")
        )
      );

    // Get requester info for each request
    const requestsWithUsers: FriendWithUser[] = [];
    for (const request of pendingRows) {
      const user = await this.getUser(request.requesterId);
      if (user) {
        const publicUser: PublicUser = {
          id: user.id,
          username: user.username ?? null,
        };
        requestsWithUsers.push({ ...request, user: publicUser });
      }
    }

    return requestsWithUsers;
  }

  async sendFriendRequest(requesterId: string, addresseeId: string): Promise<Friend> {
    // Check if relationship already exists
    const existing = await db
      .select()
      .from(friends)
      .where(
        or(
          and(eq(friends.requesterId, requesterId), eq(friends.addresseeId, addresseeId)),
          and(eq(friends.requesterId, addresseeId), eq(friends.addresseeId, requesterId))
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new Error("Friend relationship already exists");
    }

    const [newFriend] = await db
      .insert(friends)
      .values({
        requesterId,
        addresseeId,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return newFriend;
  }

  async acceptFriendRequest(userId: string, requestId: number): Promise<Friend> {
    // Verify this is a pending request to this user
    const request = await db
      .select()
      .from(friends)
      .where(
        and(
          eq(friends.id, requestId),
          eq(friends.addresseeId, userId),
          eq(friends.status, "pending")
        )
      )
      .limit(1);

    if (request.length === 0) {
      throw new Error("Friend request not found or already processed");
    }

    const [updated] = await db
      .update(friends)
      .set({
        status: "accepted",
        updatedAt: new Date(),
      })
      .where(eq(friends.id, requestId))
      .returning();

    return updated;
  }

  async rejectFriendRequest(userId: string, requestId: number): Promise<boolean> {
    // Verify this is a pending request to this user
    const request = await db
      .select()
      .from(friends)
      .where(
        and(
          eq(friends.id, requestId),
          eq(friends.addresseeId, userId),
          eq(friends.status, "pending")
        )
      )
      .limit(1);

    if (request.length === 0) {
      return false;
    }

    await db.delete(friends).where(eq(friends.id, requestId));
    return true;
  }

  async removeFriend(userId: string, friendId: number): Promise<boolean> {
    // Verify this is an accepted friendship where user is involved
    const friendship = await db
      .select()
      .from(friends)
      .where(
        and(
          eq(friends.id, friendId),
          eq(friends.status, "accepted"),
          or(
            eq(friends.requesterId, userId),
            eq(friends.addresseeId, userId)
          )
        )
      )
      .limit(1);

    if (friendship.length === 0) {
      return false;
    }

    await db.delete(friends).where(eq(friends.id, friendId));
    return true;
  }

  async getPendingRequestCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(friends)
      .where(
        and(
          eq(friends.addresseeId, userId),
          eq(friends.status, "pending")
        )
      );

    return Number(result[0]?.count ?? 0);
  }
}

export const storage = new DatabaseStorage();
