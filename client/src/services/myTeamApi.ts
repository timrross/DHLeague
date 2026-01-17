import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type TeamWithRiders } from "@shared/schema";

export type PerformanceRider = {
  id: number | null;
  uciId: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  gender: "male" | "female" | null;
  team: string | null;
};

export type PerformanceMember = {
  role: "starter" | "bench";
  slotIndex: number | null;
  status: string | null;
  position: number | null;
  points: number | null;
  rider: PerformanceRider;
};

export type PerformanceRound = {
  raceId: number;
  raceName: string;
  location: string;
  country: string;
  discipline: string;
  startDate: string;
  endDate: string;
  gameStatus: string;
  totalPoints: number | null;
  roster: {
    starters: PerformanceMember[];
    bench: PerformanceMember | null;
    substitution: {
      applied: boolean;
      benchUciId: string | null;
      replacedStarterIndex: number | null;
      reason: string;
    } | null;
  };
};

export type PerformanceSummary = {
  teamId: number;
  teamName: string;
  teamType: "elite" | "junior";
  totalPoints: number;
  rounds: PerformanceRound[];
};

export type MyPerformanceRound = PerformanceRound & {
  teamType: "elite" | "junior";
  category: "elite" | "junior";
  autoSubUsed: boolean;
};

export type MyPerformanceResponse = {
  totals: {
    elite: number;
    junior: number;
    combined: number;
  };
  elite: PerformanceSummary | null;
  junior: PerformanceSummary | null;
  rounds: MyPerformanceRound[];
};

export type MyTeamsResponse = {
  eliteTeam: TeamWithRiders | null;
  juniorTeam: TeamWithRiders | null;
};

export type NextRound = {
  raceId: number;
  name: string;
  location: string;
  country: string;
  discipline: string;
  startDate: string;
  endDate: string;
  lockAt: string | null;
  gameStatus: string;
  status?: string;
  teamType: "elite" | "junior";
  editingOpen: boolean;
};

export type NextRoundsResponse = {
  elite: NextRound | null;
  junior: NextRound | null;
};

type QueryOptions<T> = Omit<UseQueryOptions<T>, "queryKey" | "queryFn">;

const myTeamEndpoints = {
  teams: "/api/me/teams",
  performance: "/api/me/performance",
  nextRounds: "/api/rounds/next",
};

const buildSeasonUrl = (base: string, seasonId?: number) => {
  if (!seasonId) return base;
  return `${base}?seasonId=${seasonId}`;
};

export function getMyTeams(seasonId?: number) {
  return apiRequest<MyTeamsResponse>(buildSeasonUrl(myTeamEndpoints.teams, seasonId));
}

export function getMyPerformance(seasonId?: number) {
  return apiRequest<MyPerformanceResponse>(buildSeasonUrl(myTeamEndpoints.performance, seasonId));
}

export function getNextRounds() {
  return apiRequest<NextRoundsResponse>(myTeamEndpoints.nextRounds);
}

export function useMyTeamsQuery(
  seasonId?: number,
  options?: QueryOptions<MyTeamsResponse>,
) {
  return useQuery<MyTeamsResponse>({
    queryKey: [myTeamEndpoints.teams, seasonId ?? "active"],
    queryFn: () => getMyTeams(seasonId),
    ...options,
  });
}

export function useMyPerformanceQuery(
  seasonId?: number,
  options?: QueryOptions<MyPerformanceResponse>,
) {
  return useQuery<MyPerformanceResponse>({
    queryKey: [myTeamEndpoints.performance, seasonId ?? "active"],
    queryFn: () => getMyPerformance(seasonId),
    ...options,
  });
}

export function useNextRoundsQuery(options?: QueryOptions<NextRoundsResponse>) {
  return useQuery<NextRoundsResponse>({
    queryKey: [myTeamEndpoints.nextRounds],
    queryFn: getNextRounds,
    ...options,
  });
}
