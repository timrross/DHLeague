import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRaceDateRange } from "@/components/race-label";
import { type NextRound } from "@/services/myTeamApi";

type NextRacePanelProps = {
  now: number;
  eliteRound: NextRound | null;
  juniorRound: NextRound | null;
  showJunior: boolean;
};

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

const formatLockLabel = (round: NextRound | null, now: number) => {
  if (!round?.lockAt) return "Lock time TBD";
  const diff = new Date(round.lockAt).getTime() - now;
  if (diff <= 0) return "Locked";
  return `Locks in ${formatCountdown(diff)}`;
};

const formatTeamLabel = (teamType: "elite" | "junior") =>
  teamType === "elite" ? "Elite" : "Junior";

export default function NextRacePanel({
  now,
  eliteRound,
  juniorRound,
  showJunior,
}: NextRacePanelProps) {
  const renderSection = (round: NextRound | null, teamType: "elite" | "junior") => {
    const teamLabel = formatTeamLabel(teamType);
    const editingOpen = round?.editingOpen ?? false;
    const statusLabel = round ? (editingOpen ? "Editing Open" : "Locked") : "TBD";
    const helperCopy = round
      ? editingOpen
        ? "Edits apply to this round until the lock window closes."
        : "Locked for this round. Editing opens after lock."
      : "Next round details will appear soon.";
    const actionLabel = editingOpen
      ? showJunior
        ? `Edit ${teamLabel} Team`
        : "Edit Team"
      : showJunior
        ? `View ${teamLabel} Team Builder`
        : "View Team Builder";

    return (
      <div
        key={teamType}
        className="rounded-lg border border-gray-200 bg-white p-4"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {showJunior && (
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {teamLabel} Next Race
                </p>
              )}
              <Badge variant={editingOpen ? "outline" : "secondary"}>
                {statusLabel}
              </Badge>
            </div>
            {round ? (
              <>
                <p className="font-heading text-base font-bold text-secondary">
                  {round.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatRaceDateRange(round.startDate, round.endDate)} ·{" "}
                  {round.location}, {round.country}
                </p>
                <p className="text-xs text-gray-600">
                  {round.discipline} · {formatLockLabel(round, now)}
                </p>
                <p className="text-xs text-gray-500">{helperCopy}</p>
              </>
            ) : (
              <p className="text-sm text-gray-500">{helperCopy}</p>
            )}
          </div>
          <Link href={`/team-builder?teamType=${teamType.toUpperCase()}`}>
            <Button
              className="w-full md:w-auto"
              variant={editingOpen ? "default" : "outline"}
            >
              {actionLabel}
            </Button>
          </Link>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Next Race</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderSection(eliteRound, "elite")}
        {showJunior && renderSection(juniorRound, "junior")}
      </CardContent>
    </Card>
  );
}
