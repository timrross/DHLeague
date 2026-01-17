import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatRaceDateRange } from "@/components/race-label";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatRiderDisplayName } from "@shared/utils";
import { type MyPerformanceResponse, type MyPerformanceRound } from "@/services/myTeamApi";

type PerformancePanelProps = {
  data: MyPerformanceResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  juniorEnabled: boolean;
};

const formatPoints = (value: number | null) =>
  value === null ? "Pending" : `${value} pts`;

const formatStatus = (value: string | null) =>
  value ? value.toUpperCase() : "PENDING";

const formatTeamLabel = (teamType: "elite" | "junior") =>
  teamType === "elite" ? "Elite" : "Junior";

export default function PerformancePanel({
  data,
  isLoading,
  isError,
  juniorEnabled,
}: PerformancePanelProps) {
  const [view, setView] = useState<"elite" | "combined" | "junior">("elite");
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  const availableTabs = juniorEnabled
    ? ["elite", "combined", "junior"]
    : ["elite", "combined"];

  useEffect(() => {
    if (!juniorEnabled && view === "junior") {
      setView("elite");
    }
  }, [juniorEnabled, view]);

  const rounds = data?.rounds ?? [];

  const filteredRounds = useMemo(() => {
    if (view === "combined") return rounds;
    return rounds.filter((round) => round.teamType === view);
  }, [rounds, view]);

  const totalPoints = useMemo(() => {
    if (!data) return 0;
    if (view === "combined") return data.totals.combined;
    if (view === "junior") return data.totals.junior;
    return data.totals.elite;
  }, [data, view]);

  const lastRoundPoints = useMemo(() => {
    if (!filteredRounds.length) return null;
    return filteredRounds[filteredRounds.length - 1].totalPoints ?? null;
  }, [filteredRounds]);

  const toggleRound = (key: string) => {
    setExpandedKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">Performance</CardTitle>
          <Tabs value={view} onValueChange={(value) => setView(value as typeof view)}>
            <TabsList>
              {availableTabs.map((tab) => (
                <TabsTrigger key={tab} value={tab} className="capitalize">
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Season Total
            </p>
            <p className="font-heading text-2xl font-bold text-secondary">
              {totalPoints} pts
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Last Round
            </p>
            <p className="text-base font-semibold text-secondary">
              {lastRoundPoints === null ? "—" : `${lastRoundPoints} pts`}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            Loading performance...
          </div>
        )}

        {isError && (
          <p className="text-sm text-red-600">
            Unable to load performance right now.
          </p>
        )}

        {!isLoading && !isError && filteredRounds.length === 0 && (
          <p className="text-sm text-gray-600">
            No locked rounds yet. Scores will appear after the first lock.
          </p>
        )}

        {!isLoading &&
          !isError &&
          filteredRounds.map((round) => {
            const key = `${round.teamType}-${round.raceId}`;
            const isExpanded = expandedKeys.includes(key);
            const substitution = round.roster.substitution;
            const bench = round.roster.bench;
            const replacedStarter =
              substitution?.replacedStarterIndex !== null &&
              substitution?.replacedStarterIndex !== undefined
                ? round.roster.starters[substitution.replacedStarterIndex]
                : null;

            return (
              <div key={key} className="rounded-lg border border-gray-200 bg-white">
                <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-secondary">
                      {round.location}, {round.country}
                    </p>
                    <p className="text-xs text-gray-500">
                      {round.raceName} • {formatRaceDateRange(round.startDate, round.endDate)}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <Badge variant="outline" className="capitalize">
                        {round.gameStatus}
                      </Badge>
                      <span className="uppercase tracking-wide">{round.discipline}</span>
                      <span>{formatTeamLabel(round.teamType)}</span>
                      {round.autoSubUsed && (
                        <Badge variant="secondary">Auto-sub used</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 md:flex-col md:items-end">
                    <span className="text-sm font-semibold text-secondary">
                      {formatPoints(round.totalPoints)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleRound(key)}
                    >
                      {isExpanded ? (
                        <>
                          Hide
                          <ChevronUp className="ml-1 h-4 w-4" />
                        </>
                      ) : (
                        <>
                          Details
                          <ChevronDown className="ml-1 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                        Starters
                      </p>
                      <div className="space-y-2">
                        {round.roster.starters.map((starter) => (
                          <div
                            key={`${starter.role}-${starter.rider.uciId}`}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                          >
                            <div>
                              <p className="font-semibold text-secondary">
                                {formatRiderDisplayName(starter.rider) || starter.rider.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                Status: {formatStatus(starter.status)} • Pos: {starter.position ?? "—"}
                              </p>
                            </div>
                            <span className="font-semibold text-secondary">
                              {starter.points ?? "—"} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                        Bench
                      </p>
                      {bench ? (
                        <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm flex items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-secondary">
                              {formatRiderDisplayName(bench.rider) || bench.rider.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              Status: {formatStatus(bench.status)}
                            </p>
                          </div>
                          <span className="font-semibold text-secondary">
                            {bench.points ?? "—"} pts
                          </span>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">
                          No bench rider captured for this round.
                        </p>
                      )}
                    </div>

                    {substitution?.applied && bench && (
                      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        {formatRiderDisplayName(bench.rider) || bench.rider.name} auto-subbed for{" "}
                        {replacedStarter
                          ? formatRiderDisplayName(replacedStarter.rider) || replacedStarter.rider.name
                          : `starter #${substitution.replacedStarterIndex ?? "—"}`}
                        .
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
