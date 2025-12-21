import { Race } from "@shared/schema";
import RaceCard from "@/components/race-card";
import { Card } from "@/components/ui/card";

interface RaceScheduleProps {
  races: Race[];
}

export default function RaceSchedule({ races }: RaceScheduleProps) {
  // Sort races by date
  const sortedRaces = [...races].sort((a, b) => 
    new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  return (
    <Card className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-secondary text-white">
            <tr>
              <th className="py-3 px-4 text-left font-heading font-bold">#</th>
              <th className="py-3 px-4 text-left font-heading font-bold">
                RACE
              </th>
              <th className="py-3 px-4 text-left font-heading font-bold">
                STATUS
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRaces.map((race, index) => (
              <RaceCard key={race.id} race={race} index={index} />
            ))}

            {races.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-gray-500">
                  No races scheduled at the moment. Check back later.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
