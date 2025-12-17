import { useQuery, UseQueryOptions } from "@tanstack/react-query";
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

export async function fetchRiders() {
  const response = await apiRequest<RidersResponse>(riderDataEndpoints.riders);
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

export function useRidersQuery(options?: UseQueryOptions<Rider[]>) {
  return useQuery<Rider[]>({
    queryKey: [riderDataEndpoints.riders],
    queryFn: fetchRiders,
    ...options,
  });
}

export function useRacesQuery(options?: UseQueryOptions<Race[]>) {
  return useQuery<Race[]>({
    queryKey: [riderDataEndpoints.races],
    queryFn: fetchRaces,
    ...options,
  });
}

export function useRaceQuery(id: number | string, options?: UseQueryOptions<Race>) {
  return useQuery<Race>({
    queryKey: [riderDataEndpoints.race(id)],
    queryFn: () => fetchRace(id),
    enabled: Boolean(id) && options?.enabled !== false,
    ...options,
  });
}

export function useRaceResultsQuery(
  id: number | string,
  options?: UseQueryOptions<RaceResult[]>,
) {
  return useQuery<RaceResult[]>({
    queryKey: [riderDataEndpoints.raceResults(id)],
    queryFn: () => fetchRaceResults(id),
    enabled: Boolean(id) && options?.enabled !== false,
    ...options,
  });
}
