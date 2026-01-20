import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type TeamWithRiders } from "@shared/schema";
import BudgetBar from "@/components/team-builder/BudgetBar";
import GenderSlotsIndicator from "@/components/team-builder/GenderSlotsIndicator";
import { getGenderCounts } from "@/lib/team-builder";
import RiderIdentity from "@/components/rider-identity";
import { Armchair, Zap } from "lucide-react";

type TeamRosterPanelProps = {
  team: TeamWithRiders | null;
  teamType: "elite" | "junior";
  cta?: {
    label: string;
    href: string;
  };
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
  cta,
}: TeamRosterPanelProps) {
  const starters = team?.riders ?? [];
  const bench = team?.benchRider ?? null;
  const { maleCount, femaleCount } = getGenderCounts(starters);
  const budgetCap = team?.budgetCap ?? defaultBudgetCap(teamType);
  const totalCost = team?.totalCost ?? 0;
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
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {team ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Starters
                  </p>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase text-blue-600">
                      Men
                    </p>
                    {maleSlots.map((rider, index) => (
                      <div
                        key={`male-${index}-${rider?.id ?? "empty"}`}
                        className="min-h-[44px] rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                      >
                        {rider ? (
                          <RiderIdentity
                            rider={rider}
                            avatarSize="sm"
                            nameClassName="text-sm"
                          />
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
                        className="min-h-[44px] rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                      >
                        {rider ? (
                          <RiderIdentity
                            rider={rider}
                            avatarSize="sm"
                            nameClassName="text-sm"
                          />
                        ) : (
                          <p className="text-xs text-gray-500">Empty slot</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Armchair className="h-4 w-4 text-slate-500" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Bench
                  </p>
                </div>
                <p className="mb-3 text-xs text-gray-500">
                  Bench rider only scores if a same-gender starter DNS. Only one auto-sub per round.
                </p>
                {bench ? (
                  <div className="min-h-[44px] rounded-md border border-gray-200 bg-white px-3 py-2 text-sm">
                    <RiderIdentity
                      rider={bench}
                      avatarSize="sm"
                      nameClassName="text-sm"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No bench rider selected.</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <BudgetBar used={totalCost} cap={budgetCap} />
              <GenderSlotsIndicator maleCount={maleCount} femaleCount={femaleCount} />
              {cta && (
                <Link href={cta.href}>
                  <Button className="w-full mt-4">{cta.label}</Button>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              No {formatTeamLabel(teamType).toLowerCase()} team saved yet.
            </div>
            {cta && (
              <Link href={cta.href}>
                <Button className="w-full mt-4">{cta.label}</Button>
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
