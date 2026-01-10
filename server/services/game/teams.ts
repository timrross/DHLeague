import { and, eq, inArray } from "drizzle-orm";
import { teamMembers, teams, type Team, type TeamMember } from "@shared/schema";
import { db } from "../../db";
import { BUDGETS } from "./config";
import { normalizeTeamType, toDbTeamType } from "./normalize";
import { fetchRiderProfiles } from "./riderProfiles";
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
  const dbTeamType = toDbTeamType(teamType);
  const budgetCap = BUDGETS[teamType];

  const uciIds = [
    ...roster.starters.map((starter) => starter.uciId),
    ...(roster.bench ? [roster.bench.uciId] : []),
  ];

  const ridersByUciId = await fetchRiderProfiles(uciIds);
  const validation = validateTeam(
    teamType,
    roster.starters,
    roster.bench,
    ridersByUciId,
    budgetCap,
  );

  if (!validation.ok) {
    throw new TeamRosterValidationError(validation.errors);
  }

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
        })
        .returning();
      team = created;
    } else {
      team = existing[0];
      const updatePayload: Partial<Team> = {
        updatedAt: new Date(),
        budgetCap,
      };
      if (roster.name) {
        updatePayload.name = nextName;
      }
      await tx.update(teams).set(updatePayload).where(eq(teams.id, team.id));
      team = { ...team, ...updatePayload } as Team;
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
        costAtSave: rider.cost,
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
          costAtSave: rider.cost,
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
