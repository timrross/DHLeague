import { Rider } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RiderAvatar } from "@/components/rider-avatar";
import { formatRiderDisplayName } from "@shared/utils";
import { X } from "lucide-react";

type BenchSelectorProps = {
  benchRider: Rider | null;
  benchMode: boolean;
  isTeamLocked: boolean;
  onSelectBench?: () => void;
  onRemoveBench?: () => void;
};

export default function BenchSelector({
  benchRider,
  benchMode,
  isTeamLocked,
  onSelectBench,
  onRemoveBench,
}: BenchSelectorProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-heading text-sm font-bold text-secondary">
            Bench
          </h3>
          <p className="text-xs text-gray-500">
            Bench rider only scores if a same-gender starter DNS. One auto-sub per round.
          </p>
        </div>
        {!isTeamLocked && onSelectBench && (
          <Button variant="outline" size="sm" onClick={onSelectBench}>
            {benchMode ? "Selecting..." : benchRider ? "Change Bench" : "Add Bench"}
          </Button>
        )}
      </div>

      {benchMode && !isTeamLocked && (
        <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
          Select a rider below to set your bench.
        </div>
      )}

      <div className="mt-4">
        {!benchRider ? (
          <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">
            Optional: choose a bench rider.
          </div>
        ) : (
          <div className="flex flex-col justify-between gap-3 rounded-md border border-gray-200 bg-white p-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3 min-w-0">
              <RiderAvatar rider={benchRider} size="sm" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-heading text-sm font-bold text-secondary">
                    {formatRiderDisplayName(benchRider) || benchRider.name}
                  </p>
                  <Badge variant="secondary" className="text-[10px]">Bench</Badge>
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {benchRider.gender === "male" ? "Male" : "Female"} · {benchRider.team}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <span className="text-sm font-semibold text-primary">
                ${benchRider.cost.toLocaleString()}
              </span>
              {!isTeamLocked && onRemoveBench && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onRemoveBench}
                  aria-label={`Remove ${formatRiderDisplayName(benchRider) || benchRider.name}`}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
