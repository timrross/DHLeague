import { Rider } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RiderIdentity from "@/components/rider-identity";
import { formatRiderDisplayName } from "@shared/utils";
import { X, HelpCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-sm font-bold text-secondary">
              Bench
            </h3>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  How does this work?
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 text-sm">
                <h4 className="mb-2 font-semibold">Bench Rider</h4>
                <p className="mb-2 text-gray-600">
                  Your bench rider is a backup who only scores if one of your starters
                  doesn't race (DNS, DNF, or DNQ).
                </p>
                <ul className="mb-2 list-disc space-y-1 pl-4 text-gray-600">
                  <li>Only substitutes for the <strong>same gender</strong></li>
                  <li>Maximum <strong>one substitution</strong> per round</li>
                  <li>Never adds extra points—only replaces missing ones</li>
                </ul>
                <p className="text-gray-500 text-xs">
                  Tip: Choose a bench rider who matches the gender most likely to miss a race.
                </p>
                <p className="mt-2 text-gray-600 text-xs">
                  To add a bench rider, click <strong>Add Bench</strong> then select a rider from the list.
                </p>
              </PopoverContent>
            </Popover>
          </div>
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
              <div className="flex items-center gap-2 min-w-0">
                <RiderIdentity
                  rider={benchRider}
                  avatarSize="sm"
                  nameClassName="text-sm"
                />
                <Badge variant="secondary" className="text-[10px]">Bench</Badge>
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
