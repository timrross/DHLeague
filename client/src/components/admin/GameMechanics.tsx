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

type RaceResultPayload = {
  uciId: string;
  status: string;
  position?: number | null;
  qualificationPosition?: number | null;
};

const resultsTemplate = JSON.stringify(
  [
    {
      uciId: "uci:example",
      status: "FIN",
      position: 1,
      qualificationPosition: 1,
    },
  ],
  null,
  2,
);

export default function GameMechanics() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [selectedRaceId, setSelectedRaceId] = useState<string>("");
  const [lockForce, setLockForce] = useState(false);
  const [settleForce, setSettleForce] = useState(false);
  const [allowProvisional, setAllowProvisional] = useState(false);
  const [resultsIsFinal, setResultsIsFinal] = useState(false);
  const [resultsPayload, setResultsPayload] = useState(resultsTemplate);

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
      return apiRequest(`/api/admin/races/${payload.raceId}/lock`, {
        method: "POST",
        body: JSON.stringify({ force: payload.force }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [racesUrl] });
      toast({
        title: "Race locked",
        description: "Snapshots created for eligible teams.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to lock race: ${error.message || "Unknown error"}`,
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
        description: `Failed to settle race: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  const upsertResultsMutation = useMutation({
    mutationFn: async (payload: {
      raceId: number;
      results: RaceResultPayload[];
      isFinal: boolean;
    }) => {
      return apiRequest(`/api/admin/races/${payload.raceId}/results`, {
        method: "POST",
        body: JSON.stringify({
          results: payload.results,
          isFinal: payload.isFinal,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [racesUrl] });
      toast({
        title: "Results updated",
        description: "Race status updated based on finality.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update results: ${error.message || "Unknown error"}`,
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

  const handleUpsertResults = (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedRaceId) {
      toast({
        title: "Missing race",
        description: "Select a race to update results.",
        variant: "destructive",
      });
      return;
    }

    let parsed: RaceResultPayload[];
    try {
      parsed = JSON.parse(resultsPayload);
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Results payload must be valid JSON.",
        variant: "destructive",
      });
      return;
    }

    if (!Array.isArray(parsed)) {
      toast({
        title: "Invalid results",
        description: "Results payload must be a JSON array.",
        variant: "destructive",
      });
      return;
    }

    upsertResultsMutation.mutate({
      raceId: Number(selectedRaceId),
      results: parsed,
      isFinal: resultsIsFinal,
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
                  {races.map((race) => (
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
                  ))}
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
            Paste raw results JSON to mark a race provisional or final.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpsertResults} className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3 lg:items-end">
              <div className="space-y-2">
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
              <div className="flex items-center gap-2 pt-2">
                <Checkbox
                  id="results-final"
                  checked={resultsIsFinal}
                  onCheckedChange={(checked) =>
                    setResultsIsFinal(checked === true)
                  }
                />
                <Label htmlFor="results-final">Mark as final</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="results-json">Results JSON</Label>
              <textarea
                id="results-json"
                value={resultsPayload}
                onChange={(event) => setResultsPayload(event.target.value)}
                className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <p className="text-xs text-muted-foreground">
                Each row should include uciId, status (FIN/DNF/DNS/DSQ), and
                optional position/qualificationPosition.
              </p>
            </div>

            <Button type="submit" disabled={upsertResultsMutation.isPending}>
              {upsertResultsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating…
                </>
              ) : (
                "Upsert results"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
