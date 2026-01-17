import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRaceDateRange } from "@/components/race-label";
import { type NextRound } from "@/services/myTeamApi";

type HeaderSection = {
  teamType: "elite" | "junior";
  round: NextRound | null;
  editHref: string;
  showEdit: boolean;
  showBuilderLink: boolean;
};

type MyTeamHeaderCardProps = {
  now: number;
  sections: HeaderSection[];
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

export default function MyTeamHeaderCard({ now, sections }: MyTeamHeaderCardProps) {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg">My Team Hub</CardTitle>
        <p className="text-xs text-gray-500">
          Keep an eye on the next lock window and jump back into edits when they open.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {sections.map((section) => {
          const round = section.round;
          const editingOpen = round?.editingOpen ?? false;
          const statusLabel = round ? (editingOpen ? "Editing Open" : "Locked") : "TBD";
          const lockLabel = formatLockLabel(round, now);
          return (
            <div
              key={section.teamType}
              className="rounded-md border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {formatTeamLabel(section.teamType)} Next Round
                    </p>
                    <Badge variant={editingOpen ? "outline" : "secondary"}>
                      {statusLabel}
                    </Badge>
                  </div>
                  {round ? (
                    <>
                      <p className="font-heading text-base font-bold text-secondary">
                        {round.location}, {round.country}
                      </p>
                      <p className="text-xs text-gray-500">
                        {round.name} • {formatRaceDateRange(round.startDate, round.endDate)}
                      </p>
                      <p className="text-xs text-gray-600">
                        {round.discipline} • {lockLabel}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No upcoming rounds scheduled yet.
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {section.showEdit && editingOpen && (
                    <Link href={section.editHref}>
                      <Button className="w-full md:w-auto">
                        Edit {formatTeamLabel(section.teamType)} Team
                      </Button>
                    </Link>
                  )}
                  {section.showBuilderLink && (!editingOpen || !section.showEdit) && (
                    <Link href={section.editHref}>
                      <Button variant="outline" className="w-full md:w-auto">
                        View Team Builder
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
