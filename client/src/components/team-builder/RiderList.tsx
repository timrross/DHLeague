import { Rider } from "@shared/schema";
import RiderCard from "@/components/rider-card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, RefreshCw, Search } from "lucide-react";

type RiderListProps = {
  riders: Rider[];
  isLoading: boolean;
  selectedTab: string;
  onTabChange: (value: string) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortBy: "rank" | "name" | "cost";
  onSortChange: (value: "rank" | "name" | "cost") => void;
  onSelectRider: (rider: Rider) => void;
  isSelected: (rider: Rider) => boolean;
  getDisabledReason: (rider: Rider) => string | null;
  isTeamLocked: boolean;
  swapMode: boolean;
  benchMode: boolean;
  rosterFull: boolean;
};

export default function RiderList({
  riders,
  isLoading,
  selectedTab,
  onTabChange,
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  onSelectRider,
  isSelected,
  getDisabledReason,
  isTeamLocked,
  swapMode,
  benchMode,
  rosterFull,
}: RiderListProps) {
  const showRosterFull = rosterFull && !benchMode && !swapMode;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-heading text-lg font-bold text-secondary">Rider List</h3>
          <p className="text-xs text-gray-500">Add riders to build your starters and bench.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {showRosterFull && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
              Roster full
            </span>
          )}
          {(swapMode || benchMode) && (
            <span className="text-xs font-semibold uppercase text-amber-600">
              {swapMode ? "Swap Mode" : "Bench Mode"}
            </span>
          )}
        </div>
      </div>

      <div className="relative mt-4">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search riders..."
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs value={selectedTab} className="mt-4" onValueChange={onTabChange}>
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
          <TabsTrigger value="male" className="flex-1">Men</TabsTrigger>
          <TabsTrigger value="female" className="flex-1">Women</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-4 flex flex-col gap-2 text-sm text-gray-700">
        <span className="flex items-center gap-2 font-medium">
          <ArrowUpDown className="h-4 w-4" /> Sort by
        </span>
        <div className="lg:hidden">
          <Select value={sortBy} onValueChange={(value) => onSortChange(value as typeof sortBy)}>
            <SelectTrigger aria-label="Sort riders">
              <SelectValue placeholder="Sort riders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rank">Rank</SelectItem>
              <SelectItem value="name">Name (LASTNAME Firstname)</SelectItem>
              <SelectItem value="cost">Price</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="hidden lg:flex gap-2">
          {[
            { value: "rank" as const, label: "Rank" },
            { value: "name" as const, label: "Name (LASTNAME Firstname)" },
            { value: "cost" as const, label: "Price" },
          ].map((option) => (
            <Button
              key={option.value}
              variant={sortBy === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => onSortChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2">Loading riders...</span>
        </div>
      ) : (
        <div className="mt-4 space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          {riders.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
              No riders found.
            </div>
          ) : (
            riders.map((rider) => {
              const disabledReason = getDisabledReason(rider);
              const displayReason =
                showRosterFull && disabledReason === "Roster full"
                  ? null
                  : disabledReason;
              const selected = isSelected(rider);
              return (
                <RiderCard
                  key={rider.id}
                  rider={rider}
                  selected={selected}
                  onClick={() => onSelectRider(rider)}
                  disabled={Boolean(disabledReason)}
                  disabledReason={displayReason ?? undefined}
                  showSelectIcon
                  showLockedBadge={isTeamLocked && selected}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
