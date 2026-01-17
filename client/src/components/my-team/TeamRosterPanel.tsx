import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRiderDisplayName } from "@shared/utils";
import { type TeamWithRiders } from "@shared/schema";
import BudgetBar from "@/components/team-builder/BudgetBar";
import GenderSlotsIndicator from "@/components/team-builder/GenderSlotsIndicator";
import { getGenderCounts } from "@/lib/team-builder";
import { type NextRound } from "@/services/myTeamApi";

type TeamRosterPanelProps = {
  team: TeamWithRiders | null;
  teamType: "elite" | "junior";
  nextRound: NextRound | null;
  showBuilderLink: boolean;
};

const defaultBudgetCap = (teamType: "elite" | "junior") =>
  teamType === "junior" ? 500000 : 2000000;

const formatTeamLabel = (teamType: "elite" | "junior") =>
  teamType === "elite" ? "Elite" : "Junior";

const renderSlots = (riders: TeamWithRiders["riders"], total: number) => {
  const slots: Array<TeamWithRiders["riders"][number] | null> = [...riders];
  while (slots.length < total) {
    slots.push(null);
  }
  return slots.slice(0, total);
};

export default function TeamRosterPanel({
  team,
  teamType,
  nextRound,
  showBuilderLink,
}: TeamRosterPanelProps) {
  const starters = team?.riders ?? [];
  const bench = team?.benchRider ?? null;
  const { maleCount, femaleCount } = getGenderCounts(starters);
  const budgetCap = team?.budgetCap ?? defaultBudgetCap(teamType);
  const totalCost = team?.totalCost ?? 0;
  const statusCopy = nextRound
    ? nextRound.editingOpen
      ? "Applies to the next round."
      : "Locked snapshot exists for this round."
    : "No upcoming round scheduled yet.";
  const statusBadge = nextRound
    ? nextRound.editingOpen
      ? "Editing Open"
      : "Locked"
    : "TBD";

  const maleStarters = starters.filter((rider) => rider.gender === "male");
  const femaleStarters = starters.filter((rider) => rider.gender === "female");

  const maleSlots = renderSlots(maleStarters, 4);
  const femaleSlots = renderSlots(femaleStarters, 2);

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">
            {formatTeamLabel(teamType)} Team
          </CardTitle>
          <Badge variant={nextRound?.editingOpen ? "outline" : "secondary"}>
            {statusBadge}
          </Badge>
        </div>
        <p className="text-xs text-gray-500">{statusCopy}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {team ? (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <BudgetBar used={totalCost} cap={budgetCap} />
              <GenderSlotsIndicator maleCount={maleCount} femaleCount={femaleCount} />
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  Starters
                </p>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase text-blue-600">
                      Men
                    </p>
                    {maleSlots.map((rider, index) => (
                      <div
                        key={`male-${index}-${rider?.id ?? "empty"}`}
                        className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                      >
                        {rider ? (
                          <>
                            <p className="font-semibold text-secondary">
                              {formatRiderDisplayName(rider) || rider.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {rider.team}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-gray-500">Empty slot</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase text-pink-600">
                      Women
                    </p>
                    {femaleSlots.map((rider, index) => (
                      <div
                        key={`female-${index}-${rider?.id ?? "empty"}`}
                        className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                      >
                        {rider ? (
                          <>
                            <p className="font-semibold text-secondary">
                              {formatRiderDisplayName(rider) || rider.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {rider.team}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-gray-500">Empty slot</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  Bench
                </p>
                <p className="text-xs text-gray-500 mb-2">
                  Bench rider only scores if a same-gender starter DNS. Only one auto-sub per round.
                </p>
                {bench ? (
                  <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm">
                    <p className="font-semibold text-secondary">
                      {formatRiderDisplayName(bench) || bench.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {bench.gender === "male" ? "Male" : "Female"} • {bench.team}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No bench rider selected.</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            No {formatTeamLabel(teamType).toLowerCase()} team saved yet.
          </div>
        )}

        {showBuilderLink && (
          <Link href={`/team-builder?teamType=${teamType.toUpperCase()}`}>
            <Button variant="outline" className="w-full">
              Go to Team Builder
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
