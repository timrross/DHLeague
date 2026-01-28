import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatRiderDisplayName } from "@shared/utils";
import { formatRaceDateRange } from "@/components/race-label";

type RiderSummary = {
  id: number | null;
  uciId: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  gender: string | null;
  team: string | null;
};

type TeamPerformanceMember = {
  role: "starter" | "bench";
  slotIndex: number | null;
  status: string | null;
  position: number | null;
  points: number | null;
  rider: RiderSummary;
};

type TeamPerformanceRound = {
  raceId: number;
  raceName: string;
  location: string;
  country: string;
  startDate: string;
  endDate: string;
  gameStatus: string;
  totalPoints: number | null;
  roster: {
    starters: TeamPerformanceMember[];
    bench: TeamPerformanceMember | null;
    substitution: {
      applied: boolean;
      benchUciId: string | null;
      replacedStarterIndex: number | null;
      reason: string;
    } | null;
  };
};

type TeamPerformanceSummary = {
  teamId: number;
  teamName: string;
  teamType: "elite" | "junior";
  totalPoints: number;
  rounds: TeamPerformanceRound[];
};

const formatPoints = (value: number | null) =>
  value === null ? "Pending" : `${value} pts`;

const formatStatus = (value: string | null) =>
  value ? value.toUpperCase() : "PENDING";

const getDisplayName = (rider: RiderSummary) =>
  formatRiderDisplayName(rider) || rider.name;

const getSlotLabel = (slotIndex: number | null) =>
  slotIndex === null ? "—" : `#${slotIndex + 1}`;

type TeamPerformancePanelProps = {
  teamType: "elite" | "junior";
  className?: string;
};

export default function TeamPerformancePanel({
  teamType,
  className,
}: TeamPerformancePanelProps) {
  const [expandedRounds, setExpandedRounds] = useState<number[]>([]);

  const { data, isLoading, isError } = useQuery<TeamPerformanceSummary | null>({
    queryKey: ["/api/teams/user/performance", teamType],
    queryFn: () =>
      apiRequest<TeamPerformanceSummary | null>(
        `/api/teams/user/performance?teamType=${teamType}`,
      ),
    enabled: Boolean(teamType),
  });

  const rounds = data?.rounds ?? [];

  const toggleRound = (raceId: number) => {
    setExpandedRounds((prev) =>
      prev.includes(raceId)
        ? prev.filter((id) => id !== raceId)
        : [...prev, raceId],
    );
  };

  const latestRoundId = useMemo(() => {
    if (!rounds.length) return null;
    return rounds[rounds.length - 1].raceId;
  }, [rounds]);

  const showEmptyState = !isLoading && !isError && rounds.length === 0;

  return (
    <Card className={className}>
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Team Performance</CardTitle>
          <Badge variant="secondary">Season total</Badge>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-semibold text-secondary">
            {data?.totalPoints ?? 0} pts
          </span>
        </div>
        <p className="text-xs text-gray-500">
          Each round uses the locked snapshot from race day. Roster changes
          after a round will not affect past scores.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            Loading team performance...
          </div>
        )}

        {isError && (
          <p className="text-sm text-red-600">
            Unable to load team performance right now.
          </p>
        )}

        {showEmptyState && (
          <p className="text-sm text-gray-600">
            No locked rounds yet. Team snapshots appear after a race locks.
          </p>
        )}

        {!isLoading &&
          !isError &&
          rounds.map((round) => {
            const isExpanded = expandedRounds.includes(round.raceId);
            const isLatest = round.raceId === latestRoundId;

            const substitution = round.roster.substitution;
            const bench = round.roster.bench;
            const replacedStarter =
              substitution?.replacedStarterIndex !== null &&
              substitution?.replacedStarterIndex !== undefined
                ? round.roster.starters[substitution.replacedStarterIndex]
                : null;

            return (
              <div
                key={round.raceId}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleRound(round.raceId)}
                  className="w-full text-left px-4 py-3 bg-white hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-secondary truncate">
                        {round.location}, {round.country}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {round.raceName} •{" "}
                        {formatRaceDateRange(round.startDate, round.endDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="capitalize">
                        {round.gameStatus}
                      </Badge>
                      <span className="text-sm font-semibold text-secondary whitespace-nowrap">
                        {formatPoints(round.totalPoints)}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                  </div>
                  {isLatest && !isExpanded && (
                    <p className="text-xs text-primary mt-2">
                      Latest round
                    </p>
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 py-4 bg-gray-50 border-t border-gray-100 space-y-4">
                    <div>
                      <p className="text-xs uppercase text-gray-500 mb-2">
                        Starters
                      </p>
                      <div className="overflow-x-auto bg-white rounded-md border border-gray-100">
                        <table className="min-w-full text-left text-sm">
                          <thead className="bg-gray-100 text-xs uppercase text-gray-500">
                            <tr>
                              <th className="py-2 px-3">Slot</th>
                              <th className="py-2 px-3">Rider</th>
                              <th className="py-2 px-3">Status</th>
                              <th className="py-2 px-3">Pos</th>
                              <th className="py-2 px-3">Points</th>
                            </tr>
                          </thead>
                          <tbody>
                            {round.roster.starters.map((starter) => (
                              <tr
                                key={`${starter.role}-${starter.rider.uciId}`}
                                className="border-t border-gray-100"
                              >
                                <td className="py-2 px-3 font-semibold">
                                  {getSlotLabel(starter.slotIndex)}
                                </td>
                                <td className="py-2 px-3">
                                  <div className="font-semibold text-secondary">
                                    {getDisplayName(starter.rider)}
                                  </div>
                                  {starter.rider.team && (
                                    <div className="text-xs text-gray-500">
                                      {starter.rider.team}
                                    </div>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-gray-600">
                                  {formatStatus(starter.status)}
                                </td>
                                <td className="py-2 px-3 text-gray-600">
                                  {starter.position ?? "—"}
                                </td>
                                <td className="py-2 px-3 font-semibold text-secondary">
                                  {starter.points ?? "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs uppercase text-gray-500 mb-2">
                        Bench
                      </p>
                      {bench ? (
                        <div className="bg-white rounded-md border border-gray-100 p-3 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-secondary">
                              {getDisplayName(bench.rider)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Status: {formatStatus(bench.status)}
                            </p>
                          </div>
                          <div className="text-sm font-semibold text-secondary">
                            {bench.points ?? "—"} pts
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">
                          No bench rider captured for this round.
                        </p>
                      )}
                    </div>

                    {substitution?.applied && bench && (
                      <div className="text-xs text-gray-600 bg-white border border-gray-100 rounded-md p-3">
                        {getDisplayName(bench.rider)} auto-subbed for{" "}
                        {replacedStarter
                          ? getDisplayName(replacedStarter.rider)
                          : `starter ${getSlotLabel(substitution.replacedStarterIndex)}`}
                        . Points applied to the starter slot.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </CardContent>
    </Card>
  );
}
