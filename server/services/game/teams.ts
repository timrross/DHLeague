import { and, eq, inArray } from "drizzle-orm";
import { teamMembers, teams, users, type Team, type TeamMember } from "@shared/schema";
import { db } from "../../db";
import { FEATURES } from "../features";
import { BUDGETS } from "./config";
import { getEditingWindow } from "./editingWindow";
import { normalizeTeamType, toDbTeamType } from "./normalize";
import { fetchRiderProfiles } from "./riderProfiles";
import { countTransfers, type TransferRoster } from "./transfers";
import { UserFacingError } from "./errors";
import {
  validateTeam,
  type TeamBenchInput,
  type TeamStarterInput,
  type TeamValidationError,
} from "./validateTeam";

export type TeamRosterInput = {
  name?: string;
  starters: TeamStarterInput[];
  bench: TeamBenchInput;
};

export type TeamRoster = {
  team: Team;
  starters: TeamMember[];
  bench: TeamMember | null;
};

export type UserTeamsForSeason = {
  seasonId: number;
  teams: TeamRoster[];
};

export class TeamRosterValidationError extends Error {
  readonly errors: TeamValidationError[];

  constructor(errors: TeamValidationError[]) {
    super("Team roster validation failed");
    this.errors = errors;
  }
}

const buildDefaultTeamName = (userId: string, teamType: string, seasonId: number) =>
  `${userId}-${teamType}-${seasonId}`;

export async function getUserTeamsForSeason(
  userId: string,
  seasonId: number,
): Promise<UserTeamsForSeason> {
  const teamRows = await db
    .select()
    .from(teams)
    .where(and(eq(teams.userId, userId), eq(teams.seasonId, seasonId)));

  if (!teamRows.length) {
    return { seasonId, teams: [] };
  }

  const teamIds = teamRows.map((team) => team.id);
  const memberRows = await db
    .select()
    .from(teamMembers)
    .where(inArray(teamMembers.teamId, teamIds));

  const membersByTeam = new Map<number, TeamMember[]>();
  for (const member of memberRows) {
    const list = membersByTeam.get(member.teamId) ?? [];
    list.push(member);
    membersByTeam.set(member.teamId, list);
  }

  const teamsWithMembers: TeamRoster[] = teamRows.map((team) => {
    const members = membersByTeam.get(team.id) ?? [];
    const starters = members
      .filter((member) => member.role === "STARTER")
      .sort((a, b) => (a.starterIndex ?? 0) - (b.starterIndex ?? 0));
    const bench = members.find((member) => member.role === "BENCH") ?? null;

    return { team, starters, bench };
  });

  return { seasonId, teams: teamsWithMembers };
}

export async function upsertTeamRoster(
  userId: string,
  seasonId: number,
  teamTypeInput: string,
  roster: TeamRosterInput,
): Promise<TeamRoster> {
  const teamType = normalizeTeamType(teamTypeInput);
  if (teamType === "JUNIOR" && !FEATURES.JUNIOR_TEAM_ENABLED) {
    throw new UserFacingError("Junior team is disabled", 404);
  }
  const dbTeamType = toDbTeamType(teamType);
  const budgetCap = BUDGETS[teamType];
  const editingWindow = await getEditingWindow(seasonId);
  if (!editingWindow.editingOpen || !editingWindow.nextRace) {
    throw new UserFacingError("Team is locked for the upcoming race.", 400);
  }
  const nextRaceId = editingWindow.nextRace.id;

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) {
    throw new UserFacingError("User not found", 404);
  }

  if (user.jokerActiveRaceId && user.jokerActiveRaceId !== nextRaceId) {
    await db
      .update(users)
      .set({ jokerActiveRaceId: null, jokerActiveTeamType: null })
      .where(eq(users.id, userId));
  }

  const jokerActive =
    user.jokerActiveRaceId === nextRaceId &&
    user.jokerActiveTeamType === dbTeamType;

  const uciIds = [
    ...roster.starters.map((starter) => starter.uciId),
    ...(roster.bench ? [roster.bench.uciId] : []),
  ];

  const ridersByUciId = await fetchRiderProfiles(uciIds);

  return await db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(teams)
      .where(
        and(
          eq(teams.userId, userId),
          eq(teams.seasonId, seasonId),
          eq(teams.teamType, dbTeamType),
        ),
      )
      .limit(1);

    const nextName = roster.name?.trim() || buildDefaultTeamName(userId, dbTeamType, seasonId);
    let team: Team;
    let previousRoster: TransferRoster<string> | null = null;
    let priorTransfersUsed = 0;
    const previousCostByUciId = new Map<string, number>();

    if (!existing.length) {
      const [created] = await tx
        .insert(teams)
        .values({
          userId,
          seasonId,
          teamType: dbTeamType,
          name: nextName,
          budgetCap,
          createdAt: new Date(),
          updatedAt: new Date(),
          swapsUsed: 0,
          swapsRemaining: 2,
          currentRaceId: nextRaceId,
        })
        .returning();
      team = created;
    } else {
      team = existing[0];
      priorTransfersUsed =
        team.currentRaceId === nextRaceId ? team.swapsUsed ?? 0 : 0;
      const existingMembers = await tx
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.teamId, team.id));
      const previousStarters = existingMembers
        .filter((member) => member.role === "STARTER")
        .map((member) => member.uciId);
      const previousBench = existingMembers.find((member) => member.role === "BENCH");
      previousRoster = {
        starters: previousStarters,
        benchId: previousBench?.uciId ?? null,
      };
      for (const member of existingMembers) {
        if (member.costAtSave !== null && member.costAtSave !== undefined) {
          previousCostByUciId.set(member.uciId, member.costAtSave);
        }
      }
      const updatePayload: Partial<Team> = {
        updatedAt: new Date(),
        budgetCap,
        currentRaceId: nextRaceId,
      };
      if (roster.name) {
        updatePayload.name = nextName;
      }
      await tx.update(teams).set(updatePayload).where(eq(teams.id, team.id));
      team = { ...team, ...updatePayload } as Team;
    }

    const budgetOverrides = new Map<string, number>();
    for (const starter of roster.starters) {
      const rider = ridersByUciId.get(starter.uciId);
      if (!rider) continue;
      const previousCost = previousCostByUciId.get(starter.uciId);
      if (previousCost !== undefined) {
        budgetOverrides.set(starter.uciId, Math.min(previousCost, rider.cost));
      }
    }
    if (roster.bench) {
      const rider = ridersByUciId.get(roster.bench.uciId);
      if (rider) {
        const previousCost = previousCostByUciId.get(roster.bench.uciId);
        if (previousCost !== undefined) {
          budgetOverrides.set(roster.bench.uciId, Math.min(previousCost, rider.cost));
        }
      }
    }

    const validation = validateTeam(
      teamType,
      roster.starters,
      roster.bench,
      ridersByUciId,
      budgetCap,
      { budgetOverrides },
    );

    if (!validation.ok) {
      throw new TeamRosterValidationError(validation.errors);
    }

    if (previousRoster) {
      const transferCount = countTransfers(
        previousRoster,
        {
          starters: roster.starters.map((starter) => starter.uciId),
          benchId: roster.bench?.uciId ?? null,
        },
      );
      const enforceTransfers = editingWindow.hasSettledRounds && !jokerActive;
      if (enforceTransfers && priorTransfersUsed + transferCount > 2) {
        throw new UserFacingError("No transfers remaining for this round.", 400);
      }
      const nextTransfersUsed = enforceTransfers
        ? priorTransfersUsed + transferCount
        : 0;
      const nextTransfersRemaining = enforceTransfers
        ? Math.max(0, 2 - nextTransfersUsed)
        : 2;
      await tx
        .update(teams)
        .set({
          swapsUsed: nextTransfersUsed,
          swapsRemaining: nextTransfersRemaining,
          currentRaceId: nextRaceId,
          updatedAt: new Date(),
        })
        .where(eq(teams.id, team.id));
      team = {
        ...team,
        swapsUsed: nextTransfersUsed,
        swapsRemaining: nextTransfersRemaining,
        currentRaceId: nextRaceId,
      } as Team;
    }

    await tx.delete(teamMembers).where(eq(teamMembers.teamId, team.id));

    for (const starter of roster.starters) {
      const rider = ridersByUciId.get(starter.uciId);
      if (!rider) continue;
      await tx.insert(teamMembers).values({
        teamId: team.id,
        uciId: starter.uciId,
        role: "STARTER",
        starterIndex: starter.starterIndex,
        gender: rider.gender,
        costAtSave: budgetOverrides.get(starter.uciId) ?? rider.cost,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    if (roster.bench) {
      const rider = ridersByUciId.get(roster.bench.uciId);
      if (rider) {
        await tx.insert(teamMembers).values({
          teamId: team.id,
          uciId: roster.bench.uciId,
          role: "BENCH",
          starterIndex: null,
          gender: rider.gender,
          costAtSave: budgetOverrides.get(roster.bench.uciId) ?? rider.cost,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    const members = await tx
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.teamId, team.id));

    const starters = members
      .filter((member) => member.role === "STARTER")
      .sort((a, b) => (a.starterIndex ?? 0) - (b.starterIndex ?? 0));
    const bench = members.find((member) => member.role === "BENCH") ?? null;

    return { team, starters, bench };
  });
}
