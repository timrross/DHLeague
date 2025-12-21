import { useMemo } from "react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Race } from "@shared/schema";
import { useRaceQuery, useRaceResultsQuery } from "@/services/riderDataApi";
import { formatRiderDisplayName } from "@shared/utils";
import RaceLabel from "@/components/race-label";

interface RaceDetailProps {
  id: number;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status?: Race["status"] }) {
  const statusClasses: Record<NonNullable<Race["status"]>, string> = {
    completed: "bg-green-100 text-green-800",
    next: "bg-blue-100 text-blue-800",
    ongoing: "bg-purple-100 text-purple-800",
    upcoming: "bg-yellow-100 text-yellow-800",
  } as const;

  if (!status) return null;

  return (
    <Badge className={`px-3 py-1 rounded-full text-sm font-semibold ${statusClasses[status]}`}>
      {status.toUpperCase()}
    </Badge>
  );
}

export default function RaceDetail({ id }: RaceDetailProps) {
  const [, navigate] = useLocation();

  const {
    data: race,
    isLoading: raceLoading,
    isError,
  } = useRaceQuery(id);

  const { data: results, isLoading: resultsLoading } = useRaceResultsQuery(id, {
    enabled: !!race,
  });

  const podium = useMemo(() => {
    if (!results || results.length === 0) return null;
    const sorted = [...results].sort((a, b) => a.position - b.position);
    return sorted.slice(0, 3);
  }, [results]);

  if (isError) {
    return (
      <div className="min-h-screen bg-neutral flex items-center justify-center">
        <Card className="max-w-xl w-full">
          <CardHeader>
            <CardTitle className="text-secondary">Race not found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">The race you are looking for does not exist or has been removed.</p>
            <button
              onClick={() => navigate("/races")}
              className="bg-primary text-white font-semibold px-4 py-2 rounded-md hover:bg-primary/90 transition"
            >
              Back to Races
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral">
      <div className="container mx-auto px-4 py-8 md:py-12">
        {raceLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          race && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-500 uppercase">UCI Downhill World Cup</p>
                      <RaceLabel
                        race={race}
                        titleClassName="text-3xl text-secondary"
                        dateClassName="text-sm opacity-70 text-secondary"
                        subtitleClassName="text-sm opacity-80 text-gray-600"
                      />
                    </div>
                    <StatusBadge status={race.status} />
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {race.imageUrl && (
                      <div className="aspect-video overflow-hidden rounded-lg">
                        <img
                          src={race.imageUrl}
                          alt={race.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 rounded-md p-4">
                        <p className="text-xs text-gray-500 uppercase">Start</p>
                        <p className="font-semibold text-secondary">{formatDate(race.startDate.toString())}</p>
                      </div>
                      <div className="bg-gray-50 rounded-md p-4">
                        <p className="text-xs text-gray-500 uppercase">Finish</p>
                        <p className="font-semibold text-secondary">{formatDate(race.endDate.toString())}</p>
                      </div>
                      <div className="bg-gray-50 rounded-md p-4">
                        <p className="text-xs text-gray-500 uppercase">Status</p>
                        <p className="font-semibold capitalize text-secondary">{race.status ?? "upcoming"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">Podium</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {resultsLoading ? (
                      <div className="flex justify-center items-center h-24">
                        <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : podium ? (
                      podium.map((result) => (
                        <div key={result.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                          <div>
                            <p className="font-semibold text-secondary">
                              {formatRiderDisplayName(result.rider) || result.rider.name}
                            </p>
                            <p className="text-xs text-gray-500">Position #{result.position}</p>
                          </div>
                          <Badge className="bg-primary text-white">{result.points} pts</Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-600">Results will appear here once the race is completed.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Full Results</CardTitle>
                </CardHeader>
                <CardContent>
                  {resultsLoading ? (
                    <div className="flex justify-center items-center h-48">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : results && results.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="py-3 px-4 text-xs text-gray-500 uppercase">Pos</th>
                            <th className="py-3 px-4 text-xs text-gray-500 uppercase">Rider</th>
                            <th className="py-3 px-4 text-xs text-gray-500 uppercase">Country</th>
                            <th className="py-3 px-4 text-xs text-gray-500 uppercase">Points</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results
                            .slice()
                            .sort((a, b) => a.position - b.position)
                            .map((result) => (
                              <tr key={result.id} className="border-b border-gray-100">
                                <td className="py-3 px-4 font-semibold">{result.position}</td>
                                <td className="py-3 px-4">
                                  <p className="font-semibold text-secondary">
                                    {formatRiderDisplayName(result.rider) || result.rider.name}
                                  </p>
                                </td>
                                <td className="py-3 px-4 text-gray-600">{result.rider.country}</td>
                                <td className="py-3 px-4 font-semibold text-secondary">{result.points}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-700">No results have been posted for this race yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )
        )}
      </div>
    </div>
  );
}
