import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Race, Season } from "@shared/schema";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

type UciCategoryOption = {
  value: "men-elite" | "women-elite";
  label: string;
  gender: "male" | "female";
  category: "elite";
};

type UciImportResponse = {
  raceId: number;
  updated: number;
  total: number;
  missing: number;
  ambiguous: number;
  missingNames: string[];
  ambiguousNames: Array<{ name: string; matches: string[] }>;
  sourceUrl: string;
};

type LockRaceResponse = {
  raceId: number;
  lockedTeams: number;
  skippedTeams: number;
  lockAt?: string;
  status?: string;
  locked?: boolean;
};

const UCI_CATEGORY_OPTIONS: UciCategoryOption[] = [
  { value: "men-elite", label: "Men Elite", gender: "male", category: "elite" },
  { value: "women-elite", label: "Women Elite", gender: "female", category: "elite" },
];

const UCI_DISCIPLINE_OPTIONS = [
  { value: "downhill", label: "Downhill" },
  { value: "cross-country", label: "Cross-Country" },
];

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    const message = error.message || "Unknown error";
    const jsonMatch = message.match(/:\s*(\{.*\})$/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed?.message) {
          return parsed.message as string;
        }
      } catch {
        return message;
      }
    }
    return message;
  }
  return "Unknown error";
};

export default function GameMechanics() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [selectedRaceId, setSelectedRaceId] = useState<string>("");
  const [lockForce, setLockForce] = useState(false);
  const [unlockForce, setUnlockForce] = useState(false);
  const [settleForce, setSettleForce] = useState(false);
  const [allowProvisional, setAllowProvisional] = useState(false);
  const [uciResultsUrl, setUciResultsUrl] = useState("");
  const [uciCategory, setUciCategory] =
    useState<UciCategoryOption["value"]>("men-elite");
  const [uciDiscipline, setUciDiscipline] = useState("downhill");
  const [uciResultsIsFinal, setUciResultsIsFinal] = useState(false);

  const {
    data: seasons = [],
    isLoading: isLoadingSeasons,
  } = useQuery<Season[]>({
    queryKey: ["/api/admin/seasons"],
  });

  useEffect(() => {
    if (!selectedSeasonId && seasons.length > 0) {
      setSelectedSeasonId(String(seasons[0].id));
    }
  }, [seasons, selectedSeasonId]);

  const racesUrl = useMemo(() => {
    if (!selectedSeasonId) {
      return "/api/admin/races";
    }
    return `/api/admin/races?seasonId=${selectedSeasonId}`;
  }, [selectedSeasonId]);

  const {
    data: races = [],
    isLoading: isLoadingRaces,
  } = useQuery<Race[]>({
    queryKey: [racesUrl],
    enabled: !!selectedSeasonId,
  });

  useEffect(() => {
    if (races.length === 0) {
      setSelectedRaceId("");
      return;
    }
    const stillValid = races.some(
      (race) => String(race.id) === selectedRaceId,
    );
    if (!stillValid) {
      setSelectedRaceId(String(races[0].id));
    }
  }, [races, selectedRaceId]);

  const lockRaceMutation = useMutation({
    mutationFn: async (payload: { raceId: number; force: boolean }) => {
      return apiRequest<LockRaceResponse>(`/api/admin/races/${payload.raceId}/lock`, {
        method: "POST",
        body: JSON.stringify({ force: payload.force }),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [racesUrl] });
      const lockAt = data.lockAt ? new Date(data.lockAt) : null;
      const now = new Date();

      if (!data.locked && lockAt && lockAt > now && !lockForce) {
        toast({
          title: "Race not locked yet",
          description: `Lock time is ${lockAt.toLocaleString()}. Use force to lock early.`,
        });
        return;
      }

      const details = [
        data.lockedTeams ? `${data.lockedTeams} team(s) locked` : null,
        data.skippedTeams ? `${data.skippedTeams} skipped` : null,
      ].filter(Boolean);

      toast({
        title: "Race locked",
        description:
          details.length > 0
            ? details.join(", ")
            : "No eligible teams were available to snapshot.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to lock race: ${getErrorMessage(error)}`,
        variant: "destructive",
      });
    },
  });

  const unlockRaceMutation = useMutation({
    mutationFn: async (payload: { raceId: number; force: boolean }) => {
      return apiRequest(`/api/admin/races/${payload.raceId}/unlock`, {
        method: "POST",
        body: JSON.stringify({ force: payload.force }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [racesUrl] });
      toast({
        title: "Race unlocked",
        description: "Snapshots cleared; teams can be edited again.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to unlock race: ${getErrorMessage(error)}`,
        variant: "destructive",
      });
    },
  });

  const settleRaceMutation = useMutation({
    mutationFn: async (payload: {
      raceId: number;
      force: boolean;
      allowProvisional: boolean;
    }) => {
      return apiRequest(`/api/admin/races/${payload.raceId}/settle`, {
        method: "POST",
        body: JSON.stringify({
          force: payload.force,
          allowProvisional: payload.allowProvisional,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [racesUrl] });
      toast({
        title: "Race settled",
        description: "Scores have been recalculated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to settle race: ${getErrorMessage(error)}`,
        variant: "destructive",
      });
    },
  });

  const importUciResultsMutation = useMutation({
    mutationFn: async (payload: {
      raceId: number;
      sourceUrl: string;
      gender: "male" | "female";
      category: "elite";
      discipline: string;
      isFinal: boolean;
    }) => {
      return apiRequest<UciImportResponse>(
        `/api/admin/races/${payload.raceId}/results/uci`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [racesUrl] });
      const details: string[] = [];
      if (data.missing > 0) {
        details.push(`${data.missing} missing`);
      }
      if (data.ambiguous > 0) {
        details.push(`${data.ambiguous} ambiguous`);
      }

      toast({
        title: "UCI results loaded",
        description:
          details.length > 0
            ? `${data.updated} matched (${details.join(", ")}).`
            : `${data.updated} riders matched.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to load UCI results: ${getErrorMessage(error)}`,
        variant: "destructive",
      });
    },
  });

  const formatDateTime = (value?: string | Date | null) => {
    if (!value) {
      return "—";
    }
    return new Date(value).toLocaleString();
  };

  const formatLockAt = (race: Race) => {
    if (race.lockAt) {
      return formatDateTime(race.lockAt);
    }
    const start = new Date(race.startDate);
    return formatDateTime(new Date(start.getTime() - 24 * 60 * 60 * 1000));
  };

  const selectedUciCategory =
    UCI_CATEGORY_OPTIONS.find((option) => option.value === uciCategory) ??
    UCI_CATEGORY_OPTIONS[0];

  const handleImportUciResults = (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedRaceId) {
      toast({
        title: "Missing race",
        description: "Select a race to load results.",
        variant: "destructive",
      });
      return;
    }

    if (!uciResultsUrl.trim()) {
      toast({
        title: "Missing URL",
        description: "Paste the UCI results endpoint URL.",
        variant: "destructive",
      });
      return;
    }

    importUciResultsMutation.mutate({
      raceId: Number(selectedRaceId),
      sourceUrl: uciResultsUrl.trim(),
      gender: selectedUciCategory.gender,
      category: selectedUciCategory.category,
      discipline: uciDiscipline,
      isFinal: uciResultsIsFinal,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Race Game Control</CardTitle>
          <CardDescription>
            Review races by season, then lock or settle as needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="space-y-2">
              <Label>Season</Label>
              <Select
                value={selectedSeasonId}
                onValueChange={(value) => setSelectedSeasonId(value)}
              >
                <SelectTrigger className="w-[260px]">
                  <SelectValue placeholder="Select season" />
                </SelectTrigger>
                <SelectContent>
                  {seasons.map((season) => (
                    <SelectItem key={season.id} value={String(season.id)}>
                      {season.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="force-lock"
                  checked={lockForce}
                  onCheckedChange={(checked) =>
                    setLockForce(checked === true)
                  }
                />
                <Label htmlFor="force-lock">Force lock</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="force-unlock"
                  checked={unlockForce}
                  onCheckedChange={(checked) =>
                    setUnlockForce(checked === true)
                  }
                />
                <Label htmlFor="force-unlock">Force unlock</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="force-settle"
                  checked={settleForce}
                  onCheckedChange={(checked) =>
                    setSettleForce(checked === true)
                  }
                />
                <Label htmlFor="force-settle">Force settle</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="allow-provisional"
                  checked={allowProvisional}
                  onCheckedChange={(checked) =>
                    setAllowProvisional(checked === true)
                  }
                />
                <Label htmlFor="allow-provisional">Allow provisional</Label>
              </div>
            </div>
          </div>

          <div className="mt-6">
            {isLoadingSeasons || isLoadingRaces ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading races…
              </div>
            ) : races.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No races found for this season.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Race</TableHead>
                    <TableHead>Discipline</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>Lock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {races.map((race) => {
                    const isRaceLocked = race.gameStatus === "locked";

                    return (
                      <TableRow key={race.id}>
                        <TableCell>{race.id}</TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {race.location}, {race.country}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {race.name}
                          </div>
                        </TableCell>
                        <TableCell className="uppercase">
                          {race.discipline}
                        </TableCell>
                        <TableCell>{formatDateTime(race.startDate)}</TableCell>
                        <TableCell>{formatLockAt(race)}</TableCell>
                        <TableCell className="capitalize">
                          {race.gameStatus}
                          {race.needsResettle ? " (needs resettle)" : ""}
                        </TableCell>
                        <TableCell className="flex flex-wrap gap-2">
                          {isRaceLocked ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={unlockRaceMutation.isPending}
                              onClick={() =>
                                unlockRaceMutation.mutate({
                                  raceId: race.id,
                                  force: unlockForce,
                                })
                              }
                            >
                              {unlockRaceMutation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Unlock"
                              )}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={lockRaceMutation.isPending}
                              onClick={() =>
                                lockRaceMutation.mutate({
                                  raceId: race.id,
                                  force: lockForce,
                                })
                              }
                            >
                              {lockRaceMutation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Lock"
                              )}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            disabled={settleRaceMutation.isPending}
                            onClick={() =>
                              settleRaceMutation.mutate({
                                raceId: race.id,
                                force: settleForce,
                                allowProvisional,
                              })
                            }
                          >
                            {settleRaceMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Settle"
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Race Source</CardTitle>
          <CardDescription>
            Races are imported from the UCI calendar. Edit schedules in the
            Races tab; lock time is set to one day before the race starts.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Update Results</CardTitle>
          <CardDescription>
            Load results from a UCI endpoint for the selected race.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleImportUciResults} className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-4 lg:items-end">
              <div className="space-y-2 lg:col-span-2">
                <Label>Race</Label>
                <Select
                  value={selectedRaceId}
                  onValueChange={(value) => setSelectedRaceId(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select race" />
                  </SelectTrigger>
                  <SelectContent>
                    {races.map((race) => (
                      <SelectItem key={race.id} value={String(race.id)}>
                        #{race.id} {race.location}, {race.country} — {race.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={uciCategory}
                  onValueChange={(value) =>
                    setUciCategory(value as UciCategoryOption["value"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {UCI_CATEGORY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Discipline</Label>
                <Select
                  value={uciDiscipline}
                  onValueChange={(value) => setUciDiscipline(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select discipline" />
                  </SelectTrigger>
                  <SelectContent>
                    {UCI_DISCIPLINE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-4 lg:items-end">
              <div className="space-y-2 lg:col-span-3">
                <Label htmlFor="uci-results-url">UCI Results URL</Label>
                <Input
                  id="uci-results-url"
                  value={uciResultsUrl}
                  onChange={(event) => setUciResultsUrl(event.target.value)}
                  placeholder="https://www.uci.org/api/calendar/results/..."
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Checkbox
                  id="uci-results-final"
                  checked={uciResultsIsFinal}
                  onCheckedChange={(checked) =>
                    setUciResultsIsFinal(checked === true)
                  }
                />
                <Label htmlFor="uci-results-final">Mark as final</Label>
              </div>
            </div>

            <Button type="submit" disabled={importUciResultsMutation.isPending}>
              {importUciResultsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading…
                </>
              ) : (
                "Load UCI results"
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Lock the race first, then paste the Men Elite and Women Elite UCI
              endpoints to load both result sets. Settling requires both sets
              to be marked final.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
