import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Rider } from "@shared/schema";
import { formatRiderDisplayName } from "@shared/utils";
import { apiRequest } from "@/lib/queryClient";
import { RiderAvatar } from "@/components/rider-avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Loader2 } from "lucide-react";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

type SortField = "name" | "cost";
type SortDir = "asc" | "desc";

type ImageMode = "external" | "copy" | "reset";

function sourceLabel(source?: string | null) {
  if (!source) return "unknown";
  return source.replace("_", " ");
}

function sourceBadgeVariant(source?: string | null) {
  switch (source) {
    case "manual_copied":
      return "default";
    case "manual_url":
      return "secondary";
    case "placeholder":
      return "outline";
    default:
      return "outline";
  }
}

export default function RiderImages() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({});
  const [activeUciId, setActiveUciId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const debouncedSearch = useDebounce(search, 300);

  const ridersQueryKey = ["/api/riders", "admin-images", debouncedSearch, sortBy, sortDir];
  const { data: ridersData, isLoading, error: ridersError } = useQuery<any>({
    queryKey: ridersQueryKey,
    queryFn: () => {
      const params = new URLSearchParams({
        pageSize: "200",
        sortBy,
        sortDir,
      });
      if (debouncedSearch.trim()) {
        params.set("search", debouncedSearch.trim());
      }
      return apiRequest(`/api/riders?${params.toString()}`);
    },
  });

  const riders = useMemo<Rider[]>(() => {
    if (Array.isArray(ridersData)) {
      return ridersData as Rider[];
    }
    if (ridersData && Array.isArray((ridersData as { data?: Rider[] }).data)) {
      return ((ridersData as { data?: Rider[] }).data ?? []) as Rider[];
    }
    return [];
  }, [ridersData]);

  const totalRiders = ridersData?.total ?? riders.length;

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir(field === "cost" ? "desc" : "asc");
    }
  };

  const mutation = useMutation({
    mutationFn: async (payload: { uciId: string; mode: ImageMode; url?: string }) => {
      const body: Record<string, unknown> = { mode: payload.mode };
      if (payload.url) body.url = payload.url;
      return apiRequest(`/api/admin/riders/${payload.uciId}/image`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ridersQueryKey });
    },
  });

  const handleAction = (uciId: string, mode: ImageMode) => {
    setMessage(null);
    setError(null);
    const url = urlInputs[uciId]?.trim();
    if (mode !== "reset" && !url) {
      setError("Please provide an image URL before saving.");
      return;
    }

    setActiveUciId(uciId);
    mutation
      .mutateAsync({ uciId, mode, url })
      .then(() => {
        setMessage("Rider image updated successfully.");
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Failed to update rider image";
        setError(msg);
      })
      .finally(() => setActiveUciId(null));
  };

  const renderStatus = () => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading riders...
        </div>
      );
    }

    if (ridersError) {
      return (
        <div className="text-sm text-red-600">
          Failed to load riders: {(ridersError as Error).message}
        </div>
      );
    }

    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rider Images</CardTitle>
        <CardDescription>
          Manage rider portraits, set placeholder avatars, or securely mirror external images.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search riders by name, UCI ID, team, or country"
            className="max-w-xl"
          />
          <div className="flex items-center gap-3">
            {renderStatus()}
            {!isLoading && !ridersError && (
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {debouncedSearch
                  ? `${riders.length} of ${totalRiders} riders`
                  : `${riders.length} riders`}
              </span>
            )}
          </div>
        </div>

        {message && <div className="text-sm text-green-600">{message}</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => toggleSort("name")}
                  >
                    Rider
                    <ArrowUpDown className="h-3 w-3" />
                    {sortBy === "name" && (
                      <span className="text-xs">({sortDir})</span>
                    )}
                  </button>
                </TableHead>
                <TableHead>Country</TableHead>
                <TableHead>
                  <button
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => toggleSort("cost")}
                  >
                    Cost
                    <ArrowUpDown className="h-3 w-3" />
                    {sortBy === "cost" && (
                      <span className="text-xs">({sortDir})</span>
                    )}
                  </button>
                </TableHead>
                <TableHead>Image Source</TableHead>
                <TableHead>Image URL</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {riders.map((rider) => {
                const displayName = formatRiderDisplayName(rider) || rider.name;
                const currentUrl =
                  urlInputs[rider.uciId] ??
                  rider.imageOriginalUrl ??
                  (rider.imageSource === "manual_url" ? rider.image : "");
                const isBusy = mutation.isPending && activeUciId === rider.uciId;

                return (
                  <TableRow key={rider.id}>
                    <TableCell className="min-w-[220px]">
                      <div className="flex items-center gap-3">
                        <RiderAvatar rider={rider} size="sm" />
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{displayName}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            UCI: {rider.uciId}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {rider.country ? (
                        <Badge variant="secondary">{rider.country}</Badge>
                      ) : (
                        <Badge variant="outline">Unknown</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {rider.cost != null ? rider.cost : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={sourceBadgeVariant(rider.imageSource)}>
                          {sourceLabel(rider.imageSource)}
                        </Badge>
                        <span className="text-xs text-muted-foreground break-all">
                          {rider.image || "Placeholder"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <Input
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        value={currentUrl}
                        onChange={(e) =>
                          setUrlInputs((prev) => ({ ...prev, [rider.uciId]: e.target.value }))
                        }
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {rider.imageUpdatedAt ? new Date(rider.imageUpdatedAt).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-right space-y-1">
                      <div className="flex flex-wrap gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isBusy}
                          onClick={() => handleAction(rider.uciId, "external")}
                        >
                          {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Save as external URL
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={isBusy}
                          onClick={() => handleAction(rider.uciId, "copy")}
                        >
                          {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Download and store
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isBusy}
                          onClick={() => handleAction(rider.uciId, "reset")}
                        >
                          Reset to placeholder
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
