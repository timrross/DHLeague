import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export type FeaturesResponse = {
  juniorTeamEnabled: boolean;
};

type QueryOptions<T> = Omit<UseQueryOptions<T>, "queryKey" | "queryFn">;

export const featuresEndpoint = "/api/features";

export function getFeatures() {
  return apiRequest<FeaturesResponse>(featuresEndpoint);
}

export function useFeaturesQuery(options?: QueryOptions<FeaturesResponse>) {
  return useQuery<FeaturesResponse>({
    queryKey: [featuresEndpoint],
    queryFn: getFeatures,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}
