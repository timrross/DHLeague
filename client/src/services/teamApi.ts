import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type QueryOptions<T> = Omit<UseQueryOptions<T>, "queryKey" | "queryFn">;

export type TeamNameCheckResult = {
  available: boolean;
  reason?: string;
};

const teamEndpoints = {
  checkName: "/api/teams/check-name",
};

export async function checkTeamNameAvailability(
  name: string,
  excludeTeamId?: number
): Promise<TeamNameCheckResult> {
  const params = new URLSearchParams({ name });
  if (excludeTeamId) {
    params.set("excludeTeamId", String(excludeTeamId));
  }
  return apiRequest<TeamNameCheckResult>(`${teamEndpoints.checkName}?${params}`);
}

export function useTeamNameCheckQuery(
  name: string,
  excludeTeamId?: number,
  options?: QueryOptions<TeamNameCheckResult>
) {
  const trimmedName = name.trim();

  return useQuery<TeamNameCheckResult>({
    queryKey: [teamEndpoints.checkName, trimmedName, excludeTeamId],
    queryFn: () => checkTeamNameAvailability(trimmedName, excludeTeamId),
    enabled: trimmedName.length >= 3,
    staleTime: 30000, // Cache for 30 seconds
    ...options,
  });
}
