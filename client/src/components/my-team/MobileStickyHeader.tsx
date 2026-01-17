import { Badge } from "@/components/ui/badge";
import { type NextRound } from "@/services/myTeamApi";

type MobileStickyHeaderProps = {
  round: NextRound | null;
  now: number;
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

export default function MobileStickyHeader({ round, now }: MobileStickyHeaderProps) {
  if (!round) {
    return (
      <div className="sticky top-16 z-30 -mx-4 border-b border-gray-200 bg-white/95 px-4 py-2 text-xs text-gray-500 shadow-sm backdrop-blur">
        Next round TBD
      </div>
    );
  }

  const lockLabel = round.lockAt
    ? `Locks in ${formatCountdown(new Date(round.lockAt).getTime() - now)}`
    : "Lock time TBD";
  const statusLabel = round.editingOpen ? "Editing Open" : "Locked";

  return (
    <div className="sticky top-16 z-30 -mx-4 border-b border-gray-200 bg-white/95 px-4 py-2 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Next Round
          </p>
          <p className="text-sm font-semibold text-secondary truncate">
            {round.name}
          </p>
          <p className="text-xs text-gray-500">{lockLabel}</p>
        </div>
        <Badge variant={round.editingOpen ? "outline" : "secondary"}>
          {statusLabel}
        </Badge>
      </div>
    </div>
  );
}
