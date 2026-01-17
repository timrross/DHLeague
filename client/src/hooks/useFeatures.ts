import { useFeaturesQuery } from "@/services/featuresApi";

export function useFeatures() {
  const query = useFeaturesQuery();

  return {
    juniorTeamEnabled: query.data?.juniorTeamEnabled ?? false,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
