import RaceSchedule from "@/components/race-schedule";
import { SidebarAd } from "@/components/ui/google-ad";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRacesQuery } from "@/services/riderDataApi";
import { useMemo } from "react";

export default function Races() {
  const { data: races, isLoading, isError, error, refetch } = useRacesQuery();
  const scheduleLabel = useMemo(() => {
    if (!races || races.length === 0) {
      return `${new Date().getFullYear()} RACE SCHEDULE`;
    }

    const years = Array.from(
      new Set(races.map(race => new Date(race.startDate).getFullYear()))
    ).sort((a, b) => a - b);

    if (years.length === 1) {
      return `${years[0]} RACE SCHEDULE`;
    }

    return `${years[0]}-${years[years.length - 1]} RACE SCHEDULE`;
  }, [races]);

  return (
    <div className="min-h-screen bg-neutral">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Main content */}
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-secondary mb-6">{scheduleLabel}</h2>
            
            {isLoading && (
              <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {isError && (
              <Alert variant="destructive" className="mb-6">
                <AlertTitle>Unable to load races</AlertTitle>
                <AlertDescription>
                  {error instanceof Error ? error.message : "An unexpected error occurred while loading the race schedule."}
                </AlertDescription>
                <div className="mt-4">
                  <Button variant="outline" onClick={() => refetch()}>Try again</Button>
                </div>
              </Alert>
            )}

            {!isLoading && !isError && races && races.length > 0 && (
              <RaceSchedule races={races} />
            )}

            {!isLoading && !isError && races && races.length === 0 && (
              <Alert className="bg-gray-50">
                <AlertTitle>No races available</AlertTitle>
                <AlertDescription>
                  Check back soon for the latest race schedule updates.
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          {/* Sidebar with ad */}
          <div className="w-full md:w-72 lg:w-80 shrink-0">
            <div className="sticky top-24">
              <div className="bg-white bg-opacity-5 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-bold mb-2">Race Information</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Get the latest information about UCI Downhill World Cup races, including schedules, locations, and results.
                </p>
              </div>
              
              {/* Ad placement */}
              <SidebarAd client="" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
