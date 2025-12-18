import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { Race, Rider, Result } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export type RaceResult = Result & { rider: Rider };

export const riderDataEndpoints = {
  riders: "/api/rider-data/riders",
  rider: (id: number | string) => `/api/rider-data/riders/${id}`,
  races: "/api/rider-data/races",
  race: (id: number | string) => `/api/rider-data/races/${id}`,
  raceResults: (id: number | string) => `/api/rider-data/races/${id}/results`,
};

type RidersResponse = Rider[] | { data?: Rider[] };

export type RiderQueryParams = {
  category?: string;
  page?: number;
  pageSize?: number;
};

type QueryOptions<T> = Omit<UseQueryOptions<T>, "queryKey" | "queryFn">;

function buildRidersUrl(params?: RiderQueryParams) {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set("category", params.category);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));
  const queryString = searchParams.toString();
  return queryString ? `${riderDataEndpoints.riders}?${queryString}` : riderDataEndpoints.riders;
}

export async function fetchRiders(params?: RiderQueryParams) {
  const response = await apiRequest<RidersResponse>(buildRidersUrl(params));
  if (Array.isArray(response)) {
    return response;
  }
  return response?.data ?? [];
}

export function fetchRider(id: number | string) {
  return apiRequest<Rider>(riderDataEndpoints.rider(id));
}

export function fetchRaces() {
  return apiRequest<Race[]>(riderDataEndpoints.races);
}

export function fetchRace(id: number | string) {
  return apiRequest<Race>(riderDataEndpoints.race(id));
}

export function fetchRaceResults(id: number | string) {
  return apiRequest<RaceResult[]>(riderDataEndpoints.raceResults(id));
}

export function useRidersQuery(options?: QueryOptions<Rider[]>) {
  return useQuery<Rider[]>({
    queryKey: [riderDataEndpoints.riders],
    queryFn: () => fetchRiders(),
    ...options,
  });
}

export function useRidersQueryWithParams(
  params: RiderQueryParams,
  options?: QueryOptions<Rider[]>,
) {
  const url = buildRidersUrl(params);
  return useQuery<Rider[]>({
    queryKey: [url],
    queryFn: () => fetchRiders(params),
    ...options,
  });
}

export function useRacesQuery(options?: QueryOptions<Race[]>) {
  return useQuery<Race[]>({
    queryKey: [riderDataEndpoints.races],
    queryFn: fetchRaces,
    ...options,
  });
}

export function useRaceQuery(id: number | string, options?: QueryOptions<Race>) {
  const enabled = Boolean(id) && (options?.enabled ?? true);
  return useQuery<Race>({
    queryKey: [riderDataEndpoints.race(id)],
    queryFn: () => fetchRace(id),
    ...options,
    enabled,
  });
}

export function useRaceResultsQuery(
  id: number | string,
  options?: QueryOptions<RaceResult[]>,
) {
  const enabled = Boolean(id) && (options?.enabled ?? true);
  return useQuery<RaceResult[]>({
    queryKey: [riderDataEndpoints.raceResults(id)],
    queryFn: () => fetchRaceResults(id),
    ...options,
    enabled,
  });
}
