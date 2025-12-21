import {
  type LeaderboardEntry,
  type Rider,
  type TeamWithRiders,
  type User
} from "@shared/schema";
import { buildLeaderboardEntries } from "../storage";

export type PointSources = {
  race: Map<number, number>;
  extras?: Map<number, number>;
  [source: string]: Map<number, number> | undefined;
};

type SimulationRound = {
  label: string;
  sources: PointSources;
  aggregatedPoints: Map<number, number>;
};

type SimulationState = {
  users: Map<string, User>;
  riders: Map<number, Rider>;
  teams: TeamWithRiders[];
  rounds: SimulationRound[];
};

const cloneRider = (rider: Rider): Rider => ({ ...rider });

const cloneUser = (user: User): User => ({ ...user });

const aggregateSources = (sources: PointSources): Map<number, number> => {
  const aggregated = new Map<number, number>();

  Object.values(sources).forEach((sourceMap) => {
    if (!sourceMap) return;

    for (const [riderId, points] of sourceMap.entries()) {
      aggregated.set(riderId, (aggregated.get(riderId) ?? 0) + points);
    }
  });

  return aggregated;
};

export type SimulationHarness = ReturnType<typeof createSimulationHarness>;

export function createSimulationHarness() {
  const state: SimulationState = {
    users: new Map(),
    riders: new Map(),
    teams: [],
    rounds: []
  };

  const getLatestRoundPoints = (): Map<number, number> => {
    const latestRound = state.rounds.at(-1);
    return latestRound ? new Map(latestRound.aggregatedPoints) : new Map();
  };

  const recomputeTeamTotals = () => {
    state.teams.forEach((team) => {
      team.totalPoints = team.riders.reduce(
        (sum, rider) => sum + (rider.points ?? 0),
        0
      );
    });
  };

  const reset = () => {
    state.users.clear();
    state.riders.clear();
    state.teams = [];
    state.rounds = [];
  };

  const registerUserTeam = (user: User, team: TeamWithRiders) => {
    state.users.set(user.id, cloneUser(user));

    const resolvedRiders = team.riders.map((rider) => {
      const existing = state.riders.get(rider.id);

      if (existing) {
        return existing;
      }

      const riderCopy = cloneRider({ ...rider, points: rider.points ?? 0 });
      state.riders.set(riderCopy.id, riderCopy);
      return riderCopy;
    });

    const totalCost =
      team.totalCost ??
      resolvedRiders.reduce((sum, rider) => sum + (rider.cost ?? 0), 0);

    const teamEntry: TeamWithRiders = {
      ...team,
      totalPoints: team.totalPoints ?? 0,
      riders: resolvedRiders,
      totalCost
    };

    state.teams.push(teamEntry);
    recomputeTeamTotals();
  };

  const applyRound = (label: string, sources: PointSources) => {
    const aggregated = aggregateSources(sources);

    for (const [riderId, points] of aggregated.entries()) {
      const rider = state.riders.get(riderId);
      if (rider) {
        rider.points = (rider.points ?? 0) + points;
      }
    }

    state.rounds.push({
      label,
      sources,
      aggregatedPoints: aggregated
    });

    recomputeTeamTotals();
  };

  const buildLatestLeaderboard = (): LeaderboardEntry[] => {
    const teamsWithUsers = state.teams.map((team) => {
      const user = state.users.get(team.userId);

      if (!user) {
        throw new Error(`Missing user for team ${team.name}`);
      }

      return { team, user };
    });

    return buildLeaderboardEntries(teamsWithUsers, getLatestRoundPoints());
  };

  const computeTotals = (): Map<number, number> => {
    recomputeTeamTotals();
    return new Map(
      state.teams.map((team) => [team.id, team.totalPoints ?? 0])
    );
  };

  const runScenario = (
    rounds: { label: string; sources: PointSources }[]
  ): {
    leaderboard: LeaderboardEntry[];
    totals: Map<number, number>;
    lastRoundPoints: Map<number, number>;
  } => {
    rounds.forEach(({ label, sources }) => applyRound(label, sources));

    return {
      leaderboard: buildLatestLeaderboard(),
      totals: computeTotals(),
      lastRoundPoints: getLatestRoundPoints()
    };
  };

  return {
    reset,
    registerUserTeam,
    applyRound,
    buildLatestLeaderboard,
    computeTotals,
    runScenario
  };
}
