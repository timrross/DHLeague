import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type TeamWithRiders } from "@shared/schema";
import type { MyPerformanceResponse } from "./myTeamApi";

export type UserInfo = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
};

export type UserTeamsResponse = {
  user: UserInfo;
  eliteTeam: TeamWithRiders | null;
  juniorTeam: TeamWithRiders | null;
};

export type UserPerformanceResponse = MyPerformanceResponse & {
  user: UserInfo;
};

type QueryOptions<T> = Omit<UseQueryOptions<T>, "queryKey" | "queryFn">;

export function getUserTeams(userId: string, seasonId?: number) {
  const url = seasonId
    ? `/api/users/${userId}/teams?seasonId=${seasonId}`
    : `/api/users/${userId}/teams`;
  return apiRequest<UserTeamsResponse>(url);
}

export function getUserPerformance(userId: string, seasonId?: number) {
  const url = seasonId
    ? `/api/users/${userId}/performance?seasonId=${seasonId}`
    : `/api/users/${userId}/performance`;
  return apiRequest<UserPerformanceResponse>(url);
}

export function useUserTeamsQuery(
  userId: string,
  seasonId?: number,
  options?: QueryOptions<UserTeamsResponse>,
) {
  return useQuery<UserTeamsResponse>({
    queryKey: ["/api/users", userId, "teams", seasonId ?? "active"],
    queryFn: () => getUserTeams(userId, seasonId),
    enabled: !!userId,
    ...options,
  });
}

export function useUserPerformanceQuery(
  userId: string,
  seasonId?: number,
  options?: QueryOptions<UserPerformanceResponse>,
) {
  return useQuery<UserPerformanceResponse>({
    queryKey: ["/api/users", userId, "performance", seasonId ?? "active"],
    queryFn: () => getUserPerformance(userId, seasonId),
    enabled: !!userId,
    ...options,
  });
}
