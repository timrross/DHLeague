import { useQuery } from "@tanstack/react-query";
import { Race } from "@shared/schema";
import RaceSchedule from "@/components/race-schedule";
import { SidebarAd } from "@/components/ui/google-ad";

export default function Races() {
  const { data: races, isLoading } = useQuery({
    queryKey: ['/api/races'],
  });

  return (
    <div className="min-h-screen bg-neutral">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Main content */}
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-secondary mb-6">2025 RACE SCHEDULE</h2>
            
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <RaceSchedule races={races as Race[]} />
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
