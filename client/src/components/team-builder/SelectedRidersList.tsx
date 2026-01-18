import { Rider } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RiderIdentity from "@/components/rider-identity";
import { formatRiderDisplayName } from "@shared/utils";
import { cn } from "@/lib/utils";
import { FEMALE_SLOTS, MALE_SLOTS, TEAM_SIZE, getGenderCounts } from "@/lib/team-builder";
import { RefreshCw, X } from "lucide-react";

type SelectedRidersListProps = {
  riders: Rider[];
  isTeamLocked: boolean;
  swapsRemaining: number;
  swapMode: boolean;
  swapRider: Rider | null;
  onRemoveRider?: (rider: Rider) => void;
  onStartSwap?: (rider: Rider) => void;
  onCancelSwap?: () => void;
};

export default function SelectedRidersList({
  riders,
  isTeamLocked,
  swapsRemaining,
  swapMode,
  swapRider,
  onRemoveRider,
  onStartSwap,
  onCancelSwap,
}: SelectedRidersListProps) {
  const { maleCount, femaleCount } = getGenderCounts(riders);
  const missingMen = Math.max(0, MALE_SLOTS - maleCount);
  const missingWomen = Math.max(0, FEMALE_SLOTS - femaleCount);
  const remainingSlots = Math.max(0, TEAM_SIZE - riders.length);
  const formatMissing = (count: number, singular: string, plural: string) =>
    `${count} ${count === 1 ? singular : plural}`;

  const emptyCopy = riders.length === 0
    ? "Add 4 men and 2 women to starters."
    : remainingSlots > 0
      ? `Add ${remainingSlots} more rider${remainingSlots === 1 ? "" : "s"} to starters.`
      : "Starters are full.";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-heading text-sm font-bold text-secondary">Starters</h3>
          <p className="text-xs text-gray-500">6 riders required</p>
        </div>
        {isTeamLocked && (
          <Badge variant={swapMode ? "destructive" : "outline"}>
            {swapMode ? "Swap Mode" : `${swapsRemaining} swap${swapsRemaining === 1 ? "" : "s"} left`}
          </Badge>
        )}
      </div>

      {swapMode && swapRider && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <div className="flex items-center justify-between gap-2">
            <span>
              Select a rider to replace {formatRiderDisplayName(swapRider) || swapRider.name}.
            </span>
            {onCancelSwap && (
              <Button variant="ghost" size="sm" onClick={onCancelSwap}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {riders.length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">
            {emptyCopy}
          </div>
        ) : (
          <>
            {riders.map((rider) => {
              const displayName = formatRiderDisplayName(rider) || rider.name;
              const highlight = swapRider?.id === rider.id;

              return (
                <div
                  key={rider.id}
                  className={cn(
                    "flex flex-col justify-between gap-3 rounded-md border border-gray-200 bg-white p-3 sm:flex-row sm:items-center",
                    highlight ? "border-amber-300 bg-amber-50" : "",
                  )}
                >
                <div className="flex items-center gap-3 min-w-0">
                    <RiderIdentity
                      rider={rider}
                      avatarSize="sm"
                      nameClassName="text-sm"
                    />
                </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="text-sm font-semibold text-primary">
                      ${rider.cost.toLocaleString()}
                    </span>
                    {isTeamLocked ? (
                      onStartSwap && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onStartSwap(rider)}
                          disabled={swapMode || swapsRemaining <= 0}
                          aria-label={`Swap ${displayName}`}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          {swapsRemaining <= 0 ? "No Swaps" : "Swap"}
                        </Button>
                      )
                    ) : (
                      onRemoveRider && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemoveRider(rider)}
                          aria-label={`Remove ${displayName}`}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
            {remainingSlots > 0 && (
              <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                {missingMen > 0 || missingWomen > 0 ? (
                  <span>
                    Need {missingMen > 0 ? formatMissing(missingMen, "man", "men") : ""}
                    {missingMen > 0 && missingWomen > 0 ? " and " : ""}
                    {missingWomen > 0 ? formatMissing(missingWomen, "woman", "women") : ""} to complete starters.
                  </span>
                ) : (
                  <span>{emptyCopy}</span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
