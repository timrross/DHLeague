import { useQuery } from "@tanstack/react-query";
import { Race } from "@shared/schema";
import RaceSchedule from "@/components/race-schedule";

export default function Races() {
  const { data: races, isLoading } = useQuery({
    queryKey: ['/api/races'],
  });

  return (
    <div className="min-h-screen bg-neutral">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <h2 className="text-2xl md:text-3xl font-heading font-bold text-secondary mb-6">2023 RACE SCHEDULE</h2>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <RaceSchedule races={races as Race[]} />
        )}
      </div>
    </div>
  );
}
