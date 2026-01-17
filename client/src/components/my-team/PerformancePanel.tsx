import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatRaceDateRange } from "@/components/race-label";
import PerformanceTrendMini from "@/components/my-team/PerformanceTrendMini";
import { ChevronDown, ChevronUp, LineChart } from "lucide-react";
import { formatRiderDisplayName } from "@shared/utils";
import { type MyPerformanceResponse, type NextRound } from "@/services/myTeamApi";

type PerformancePanelProps = {
  data: MyPerformanceResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  juniorEnabled: boolean;
  nextRound: NextRound | null;
  now: number;
};

const formatPoints = (value: number | null) =>
  value === null ? "Pending" : `${value} pts`;

const formatStatus = (value: string | null) =>
  value ? value.toUpperCase() : "PENDING";

const formatTeamLabel = (teamType: "elite" | "junior") =>
  teamType === "elite" ? "Elite" : "Junior";

const formatCountdown = (targetMs: number) => {
  if (targetMs <= 0) return "0m";
  const totalMinutes = Math.floor(targetMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(" ");
};

export default function PerformancePanel({
  data,
  isLoading,
  isError,
  juniorEnabled,
  nextRound,
  now,
}: PerformancePanelProps) {
  const [view, setView] = useState<"elite" | "combined" | "junior">("elite");
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  const availableTabs = juniorEnabled
    ? ["elite", "combined", "junior"]
    : ["elite"];

  useEffect(() => {
    if (!juniorEnabled && view !== "elite") {
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

  const hasScores = useMemo(
    () => filteredRounds.some((round) => round.totalPoints !== null),
    [filteredRounds],
  );

  const trendValues = useMemo(
    () => filteredRounds.map((round) => round.totalPoints),
    [filteredRounds],
  );

  const toggleRound = (key: string) => {
    setExpandedKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
  };

  const lockCountdown =
    nextRound?.lockAt
      ? `Next lock in ${formatCountdown(new Date(nextRound.lockAt).getTime() - now)}`
      : null;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-lg">Performance</CardTitle>
          {availableTabs.length > 1 && (
            <div className="flex flex-col items-end gap-1">
              <Tabs value={view} onValueChange={(value) => setView(value as typeof view)}>
                <TabsList>
                  {availableTabs.map((tab) => (
                    <TabsTrigger key={tab} value={tab} className="capitalize">
                      {tab}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <span className="text-xs text-gray-500">
                Combined = Elite + Junior team points
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-6">
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
              {lastRoundPoints === null ? "-" : `${lastRoundPoints} pts`}
            </p>
          </div>
          {hasScores && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Trend
              </p>
              <PerformanceTrendMini values={trendValues} className="mt-2" />
            </div>
          )}
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

        {!isLoading && !isError && !hasScores && (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
              <LineChart className="h-5 w-5 text-primary" />
            </div>
            <h3 className="mt-3 text-lg font-semibold text-secondary">
              Your season starts here
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Points will appear after the first race locks/settles.
            </p>
            {lockCountdown && (
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {lockCountdown}
              </p>
            )}
          </div>
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
                <button
                  type="button"
                  onClick={() => toggleRound(key)}
                  className="flex w-full flex-col gap-3 p-4 text-left transition hover:bg-gray-50 md:flex-row md:items-center md:justify-between"
                  aria-expanded={isExpanded}
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-secondary">
                      {round.raceName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatRaceDateRange(round.startDate, round.endDate)} -{" "}
                      {round.location}, {round.country}
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
                    {isExpanded ? (
                      <span className="flex items-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Hide details
                        <ChevronUp className="ml-1 h-4 w-4" />
                      </span>
                    ) : (
                      <span className="flex items-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                        View details
                        <ChevronDown className="ml-1 h-4 w-4" />
                      </span>
                    )}
                  </div>
                </button>

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
                                Status: {formatStatus(starter.status)} - Pos: {starter.position ?? "-"}
                              </p>
                            </div>
                            <span className="font-semibold text-secondary">
                              {starter.points ?? "-"} pts
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
                            {bench.points ?? "-"} pts
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
                          : `starter #${substitution.replacedStarterIndex ?? "-"}`}
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
