import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Rider, TeamWithRiders } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useFeatures } from "@/hooks/useFeatures";
import { useTeamNameCheckQuery } from "@/services/teamApi";
import { generateRandomTeamName } from "@shared/teamNameGenerator";
import { Dices, AlertCircle, CheckCircle2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import JokerCardDialog from "@/components/joker-card-dialog";
import JokerCardButton from "@/components/joker-card-button";
import TeamStatusPanel from "@/components/team-builder/TeamStatusPanel";
import BudgetBar from "@/components/team-builder/BudgetBar";
import GenderSlotsIndicator from "@/components/team-builder/GenderSlotsIndicator";
import SelectedRidersList from "@/components/team-builder/SelectedRidersList";
import BenchSelector from "@/components/team-builder/BenchSelector";
import RiderList from "@/components/team-builder/RiderList";
import StickyMobileActions from "@/components/team-builder/StickyMobileActions";
import TeamBuilderHeader from "@/components/team-builder-header";
import { useRacesQuery, useRidersQueryWithParams } from "@/services/riderDataApi";
import {
  FEMALE_SLOTS,
  MALE_SLOTS,
  TEAM_SIZE,
  getAddDisabledReason,
  getBudgetState,
  getGenderCounts,
  getTeamValidity,
} from "@/lib/team-builder";

export default function TeamBuilder() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { juniorTeamEnabled } = useFeatures();
  const { toast } = useToast();
  const [location] = useLocation();
  
  const [selectedTab, setSelectedTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRiders, setSelectedRiders] = useState<Rider[]>([]);
  const [benchRider, setBenchRider] = useState<Rider | null>(null);
  const [benchMode, setBenchMode] = useState(false);
  const [teamName, setTeamName] = useState(() => generateRandomTeamName());
  const [draftInitialized, setDraftInitialized] = useState(false);
  const [swapMode, setSwapMode] = useState(false);
  const [swapRiderData, setSwapRiderData] = useState<Rider | null>(null);
  const [showJokerDialog, setShowJokerDialog] = useState(false);
  const [jokerCardUsed, setJokerCardUsed] = useState(false);
  const [sortBy, setSortBy] = useState<"rank" | "name" | "cost">("rank");
  const [showMobileRiders, setShowMobileRiders] = useState(false);
  const [lockCountdownLabel, setLockCountdownLabel] = useState("Lock time TBD");

  const searchParams = useMemo(
    () => new URLSearchParams(location.split("?")[1] ?? ""),
    [location],
  );
  const teamTypeParam = searchParams.get("teamType")?.toLowerCase();
  const requestedTeamType = teamTypeParam === "junior" ? "junior" : "elite";
  const teamType =
    juniorTeamEnabled && requestedTeamType === "junior" ? "junior" : "elite";

  // Fetch all races
  const { data: races } = useRacesQuery();

  // Determine next race
  const nextRace = races?.find((race) => race.status === 'next');
  
  // Calculate lock date (1 day before race start)
  const lockDate = nextRace
    ? new Date(new Date(nextRace.startDate).getTime() - 24 * 60 * 60 * 1000)
    : null;

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
  
  // Fetch riders
  const normalizedSearch = searchTerm.trim();
  const normalizedGender =
    selectedTab === "all" ? undefined : selectedTab;

  // Map frontend sort options to API sort fields
  const apiSortBy = sortBy === "rank" ? "lastYearStanding" : sortBy;
  // name: A-Z, rank: 1 first (asc), cost: highest first (desc)
  const apiSortDir = sortBy === "cost" ? "desc" : "asc";

  const { data: riders, isLoading: ridersLoading } = useRidersQueryWithParams({
    category: teamType,
    gender: normalizedGender,
    pageSize: 200,
    search: normalizedSearch ? normalizedSearch : undefined,
    sortBy: apiSortBy,
    sortDir: apiSortDir,
  });
  const safeRiders = Array.isArray(riders) ? (riders as Rider[]) : [];

  const userTeamQueryKey =
    teamType === "junior" ? "/api/teams/user?teamType=junior" : "/api/teams/user";

  // Fetch user's teams if authenticated
  const { data: userTeam } = useQuery<TeamWithRiders | null>({
    queryKey: [userTeamQueryKey],
    enabled: isAuthenticated,
  });

  const activeTeam = userTeam;

  // Team name validation
  const {
    data: teamNameCheck,
    isLoading: isCheckingName,
  } = useTeamNameCheckQuery(
    teamName,
    activeTeam?.id, // Exclude current team when updating
    { enabled: teamName.trim().length >= 3 }
  );

  const teamNameError = useMemo(() => {
    const trimmed = teamName.trim();
    if (trimmed.length === 0) return "Team name is required";
    if (trimmed.length < 3) return "Team name must be at least 3 characters";
    if (trimmed.length > 50) return "Team name must be 50 characters or less";
    if (teamNameCheck && !teamNameCheck.available) return teamNameCheck.reason;
    return null;
  }, [teamName, teamNameCheck]);

  const isTeamNameValid = !teamNameError && teamNameCheck?.available === true;
  const isCreatingTeam = !isAuthenticated || !activeTeam;
  const invalidateUserTeams = () => {
    queryClient.invalidateQueries({ queryKey: [userTeamQueryKey] });
  };
  const resetDraft = () => {
    setDraftInitialized(false);
    setSelectedRiders([]);
    setBenchRider(null);
    setTeamName(generateRandomTeamName());
    setBenchMode(false);
    setSwapMode(false);
    setSwapRiderData(null);
  };

  // Create team mutation
  const createTeam = useMutation({
    mutationFn: async (data: { name: string, riderIds: number[], benchRiderId?: number | null, useJokerCard?: boolean, teamType?: string }) => {
      return apiRequest('/api/teams', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (_, variables) => {
      trackEvent("team_created", {
        team_type: variables.teamType ?? teamType,
        rider_count: variables.riderIds.length,
      });
      toast({
        title: "Team created successfully!",
        description: "Your fantasy team has been created.",
        variant: "default",
      });
      invalidateUserTeams();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create team",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    }
  });

  // Update team mutation
  const updateTeam = useMutation({
    mutationFn: async ({ id, name, riderIds, benchRiderId }: { id: number, name: string, riderIds: number[], benchRiderId?: number | null }) => {
      return apiRequest(`/api/teams/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, riderIds, benchRiderId }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (_, variables) => {
      trackEvent("team_updated", {
        team_type: teamType,
        rider_count: variables.riderIds.length,
      });
      toast({
        title: "Team updated successfully!",
        description: "Your fantasy team has been updated.",
        variant: "default",
      });
      invalidateUserTeams();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update team",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    }
  });

  const useJokerCardMutation = useMutation({
    mutationFn: async (teamId: number) => {
      return apiRequest(`/api/teams/${teamId}/joker`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      trackEvent("joker_card_used", { team_type: teamType });
      toast({
        title: "Joker card used",
        description: "Your team has been reset. Build a new team to continue.",
        variant: "default",
      });
      setJokerCardUsed(true);
      setShowJokerDialog(false);
      resetDraft();
      invalidateUserTeams();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to use joker card",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  // Swap rider mutation
  const performSwapRider = useMutation({
    mutationFn: async ({ teamId, removedRiderId, addedRiderId }: { teamId: number, removedRiderId: number, addedRiderId: number }) => {
      const data = { removedRiderId, addedRiderId };
      return apiRequest(`/api/teams/${teamId}/swap`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      toast({
        title: "Rider swapped successfully!",
        description: `You have ${swapsRemaining - 1} swap${swapsRemaining - 1 !== 1 ? 's' : ''} remaining for this race.`,
        variant: "default",
      });
      invalidateUserTeams();
      setSwapMode(false);
      setSwapRiderData(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to swap rider",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    }
  });

  // Calculate budget and team stats
  const defaultBudgetCap = teamType === "junior" ? 500000 : 2000000;
  const totalBudget = activeTeam?.budgetCap ?? defaultBudgetCap;
  const startersBudget = selectedRiders.reduce((sum, rider) => sum + rider.cost, 0);
  const benchBudget = benchRider?.cost ?? 0;
  const usedBudget = startersBudget + benchBudget;
  const budgetState = getBudgetState(usedBudget, totalBudget);
  const { maleCount: maleRidersCount, femaleCount: femaleRidersCount } = getGenderCounts(selectedRiders);

  // Team lock status and swap tracking
  const isTeamLocked = activeTeam?.isLocked || false;
  const swapsUsed = activeTeam?.swapsUsed || 0;
  const swapsRemaining = Math.max(0, 2 - swapsUsed);
  const lockStatusLabel = isTeamLocked ? "Locked for this round" : "Editing Open";
  const lockCountdownText = isTeamLocked ? "Locked for this round" : lockCountdownLabel;

  const benchIsValid = !benchRider || !selectedRiders.some((rider) => rider.id === benchRider.id);

  const teamValidity = getTeamValidity({
    starters: selectedRiders,
    bench: benchRider,
    budgetState,
  });

  const rosterFull = selectedRiders.length >= TEAM_SIZE;

  const isTeamValid =
    selectedRiders.length === TEAM_SIZE &&
    maleRidersCount === MALE_SLOTS &&
    femaleRidersCount === FEMALE_SLOTS &&
    usedBudget <= totalBudget &&
    benchIsValid;

  const hasChanges = useMemo(() => {
    if (!activeTeam) return true;
    const savedIds = (activeTeam.riders ?? []).map((rider) => rider.id).sort((a, b) => a - b);
    const currentIds = selectedRiders.map((rider) => rider.id).sort((a, b) => a - b);
    const savedBenchId = activeTeam.benchRider?.id ?? null;
    const currentBenchId = benchRider?.id ?? null;
    const savedName = (activeTeam.name || "My DH Team").trim();
    const currentName = teamName.trim();

    return (
      savedName !== currentName ||
      savedBenchId !== currentBenchId ||
      savedIds.join(",") !== currentIds.join(",")
    );
  }, [activeTeam, selectedRiders, benchRider, teamName]);

  const canSave = isAuthenticated && isTeamValid && isTeamNameValid && (isCreatingTeam || hasChanges) && !isTeamLocked;
  const isSubmitting = createTeam.isPending || updateTeam.isPending;
  const statusIssues = useMemo(() => {
    const issues = [];
    if (teamNameError) {
      issues.push({ level: "error" as const, message: teamNameError });
    }
    if (!benchIsValid) {
      issues.push({ level: "error" as const, message: "Bench rider must be different from starters" });
    }
    issues.push(...teamValidity.issues);
    return issues;
  }, [teamNameError, benchIsValid, teamValidity.issues]);

  const summaryLabel = useMemo(() => {
    const budgetLabel =
      budgetState.remaining >= 0
        ? `$${budgetState.remaining.toLocaleString()} remaining`
        : `$${Math.abs(budgetState.remaining).toLocaleString()} over budget`;
    const statusLabel = statusIssues.length > 0 ? statusIssues[0].message : "Team valid";
    return `${budgetLabel} • ${statusLabel}`;
  }, [budgetState, statusIssues]);

  const getDisabledReasonForRider = (rider: Rider) => {
    const mode = swapMode ? "swap" : benchMode ? "bench" : "starter";
    return getAddDisabledReason({
      rider,
      starters: selectedRiders,
      bench: benchRider,
      budgetState,
      mode,
      isSelected: selectedRiders.some((item) => item.id === rider.id),
      isTeamLocked,
      swapRider: swapRiderData ?? undefined,
    });
  };

  const raceLabel = nextRace
    ? `${nextRace.location}, ${nextRace.country}`
    : "No upcoming race";
  const raceName = nextRace?.name ?? "Next race TBD";
  const lockBadgeClass = isTeamLocked
    ? "bg-red-100 text-red-700"
    : "bg-emerald-100 text-emerald-700";
  const primaryActionLabel = activeTeam && !isCreatingTeam ? "Update Team" : "Save Team";

  // Initialize draft from saved team (once)
  useEffect(() => {
    if (activeTeam && !draftInitialized) {
      setTeamName(activeTeam.name || "My DH Team");
      setSelectedRiders(activeTeam.riders || []);
      setBenchRider(activeTeam.benchRider ?? null);
      setDraftInitialized(true);
    }
  }, [activeTeam, draftInitialized]);

  useEffect(() => {
    resetDraft();
  }, [teamType]);

  useEffect(() => {
    if (!lockDate) {
      setLockCountdownLabel("Lock time TBD");
      return;
    }

    const updateCountdown = () => {
      const diff = lockDate.getTime() - Date.now();
      setLockCountdownLabel(`Locks in ${formatCountdown(diff)}`);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 60000);
    return () => clearInterval(timer);
  }, [lockDate]);

  useEffect(() => {
    if (user) {
      setJokerCardUsed(user.jokerCardUsed || false);
    }
  }, [user]);

  // Server handles sorting; just filter by tab if needed (search is also server-side)
  const sortedRiders = safeRiders;

  const handleAddStarter = (rider: Rider) => {
    const disabledReason = getAddDisabledReason({
      rider,
      starters: selectedRiders,
      bench: benchRider,
      budgetState,
      mode: "starter",
      isSelected: selectedRiders.some((item) => item.id === rider.id),
      isTeamLocked,
    });

    if (disabledReason) {
      toast({
        title: "Cannot add rider",
        description: disabledReason,
        variant: "destructive",
      });
      return;
    }

    setSelectedRiders((riders) => [...riders, rider]);
  };

  const handleRemoveStarter = (rider: Rider) => {
    if (isTeamLocked) return;
    setSelectedRiders((riders) => riders.filter((item) => item.id !== rider.id));
  };

  const handleBenchSelection = (rider: Rider) => {
    const disabledReason = getAddDisabledReason({
      rider,
      starters: selectedRiders,
      bench: benchRider,
      budgetState,
      mode: "bench",
      isSelected: false,
      isTeamLocked,
    });

    if (disabledReason) {
      toast({
        title: "Cannot set bench",
        description: disabledReason,
        variant: "destructive",
      });
      return;
    }

    setBenchRider(rider);
    setBenchMode(false);
  };

  const handleSwapSelection = (rider: Rider) => {
    if (!swapRiderData || !activeTeam) return;

    const disabledReason = getAddDisabledReason({
      rider,
      starters: selectedRiders,
      bench: benchRider,
      budgetState,
      mode: "swap",
      isSelected: selectedRiders.some((item) => item.id === rider.id),
      isTeamLocked,
      swapRider: swapRiderData,
    });

    if (disabledReason) {
      toast({
        title: "Cannot swap rider",
        description: disabledReason,
        variant: "destructive",
      });
      return;
    }

    performSwapRider.mutate({
      teamId: activeTeam.id,
      removedRiderId: swapRiderData.id,
      addedRiderId: rider.id,
    });
  };

  const handleRiderSelect = (rider: Rider) => {
    if (swapMode) {
      handleSwapSelection(rider);
      return;
    }
    if (benchMode) {
      handleBenchSelection(rider);
      return;
    }
    handleAddStarter(rider);
  };

  // Functions to handle rider swaps
  const initiateSwap = (rider: Rider) => {
    if (swapsRemaining <= 0) {
      toast({
        title: "No swaps remaining",
        description: "You've used all your swaps for this race.",
        variant: "destructive",
      });
      return;
    }
    
    setSwapMode(true);
    setSwapRiderData(rider);
    setBenchMode(false);
  };
  
  const cancelSwap = () => {
    setSwapMode(false);
    setSwapRiderData(null);
  };

  const startBenchSelection = () => {
    if (isTeamLocked) return;
    setBenchMode((current) => !current);
    setSwapMode(false);
    setSwapRiderData(null);
  };

  const removeBenchRider = () => {
    if (isTeamLocked) return;
    setBenchRider(null);
    setBenchMode(false);
  };

  // Handle save/update team
  const handleSaveTeam = () => {
    if (isTeamLocked) {
      toast({
        title: "Team locked",
        description: "This team is locked for the current round.",
        variant: "destructive",
      });
      return;
    }

    if (teamNameError) {
      toast({
        title: "Invalid team name",
        description: teamNameError,
        variant: "destructive",
      });
      return;
    }

    if (!isTeamValid) {
      toast({
        title: "Invalid team",
        description: `Your team must include 4 men and 2 women within the $${totalBudget.toLocaleString()} budget.`,
        variant: "destructive",
      });
      return;
    }

    if (!isCreatingTeam && !hasChanges) {
      toast({
        title: "No changes to save",
        description: "Make a change before updating your team.",
        variant: "default",
      });
      return;
    }
    
    if (isAuthenticated) {
      const riderIds = selectedRiders.map(r => r.id);
      const benchRiderId = benchRider ? benchRider.id : null;
      
      if (activeTeam && !isCreatingTeam) {
        // Update existing team
        updateTeam.mutate({
          id: activeTeam.id,
          name: teamName,
          riderIds,
          benchRiderId,
        });
      } else {
        // Create new team
        createTeam.mutate({
          name: teamName,
          riderIds,
          benchRiderId,
          teamType,
        });
        
        // Show immediate feedback toast
        toast({
          title: "Saving your team...",
          description: "Your new team is being created.",
          variant: "default",
        });
      }
    }
  };

  // Handle joker card use
  const handleUseJokerCard = () => {
    if (jokerCardUsed) {
      toast({
        title: "Joker card already used",
        description: "You have already used your joker card for this season.",
        variant: "destructive",
      });
      return;
    }

    if (isTeamLocked) {
      toast({
        title: "Team locked",
        description: "You cannot reset your team while it is locked.",
        variant: "destructive",
      });
      return;
    }
    
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to use your joker card.",
        variant: "destructive",
      });
      return;
    }
    
    // Show joker card dialog
    setShowJokerDialog(true);
  };
  
  // Handle confirm joker card use
  const handleConfirmJokerCard = () => {
    if (jokerCardUsed) {
      toast({
        title: "Joker card already used",
        description: "You have already used your joker card for this season.",
        variant: "destructive",
      });
      return;
    }

    if (!activeTeam) {
      toast({
        title: "No active team",
        description: "You do not have a saved team to reset.",
        variant: "destructive",
      });
      return;
    }

    if (isTeamLocked) {
      toast({
        title: "Team locked",
        description: "You cannot reset your team while it is locked.",
        variant: "destructive",
      });
      return;
    }

    useJokerCardMutation.mutate(activeTeam.id);
  };

  return (
    <div className="min-h-screen bg-neutral pb-24 lg:pb-0">
      <div className="container mx-auto px-4 py-8">
        <TeamBuilderHeader isAuthenticated={isAuthenticated} authLoading={authLoading} />

        <div className="hidden lg:flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Lock Countdown
            </p>
            <p className="font-heading text-lg font-bold text-secondary">
              {lockCountdownText}
            </p>
            <p className="text-xs text-gray-600">{raceLabel} · {raceName}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${lockBadgeClass}`}>
            {lockStatusLabel}
          </span>
        </div>

        <div className="lg:hidden sticky top-16 z-30 -mx-4 mb-4 border-b border-gray-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Lock Countdown
              </p>
              <p className="font-heading text-base font-bold text-secondary">
                {lockCountdownText}
              </p>
              <p className="text-xs text-gray-600">{raceLabel}</p>
            </div>
            <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${lockBadgeClass}`}>
              {lockStatusLabel}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="space-y-6">
            <TeamStatusPanel
              lockStatusLabel={lockStatusLabel}
              lockCountdownLabel={lockCountdownText}
              issues={statusIssues}
              isTeamLocked={isTeamLocked}
            />

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 shadow-sm">
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Team Name
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        value={teamName}
                        onChange={(event) => setTeamName(event.target.value)}
                        placeholder="Team Name"
                        disabled={isTeamLocked && !isCreatingTeam}
                        className={`font-heading font-bold pr-10 ${
                          teamNameError
                            ? "border-red-500 focus-visible:ring-red-500"
                            : isTeamNameValid
                            ? "border-green-500 focus-visible:ring-green-500"
                            : ""
                        }`}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {isCheckingName ? (
                          <div className="h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        ) : teamNameError ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : isTeamNameValid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : null}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setTeamName(generateRandomTeamName())}
                      disabled={isTeamLocked && !isCreatingTeam}
                      title="Generate random team name"
                    >
                      <Dices className="h-4 w-4" />
                    </Button>
                  </div>
                  {teamNameError && (
                    <p className="text-xs text-red-500 mt-1">{teamNameError}</p>
                  )}
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <BudgetBar used={usedBudget} cap={totalBudget} />
                  <GenderSlotsIndicator
                    maleCount={maleRidersCount}
                    femaleCount={femaleRidersCount}
                  />
                </div>

                <SelectedRidersList
                  riders={selectedRiders}
                  isTeamLocked={isTeamLocked}
                  swapsRemaining={swapsRemaining}
                  swapMode={swapMode}
                  swapRider={swapRiderData}
                  onRemoveRider={handleRemoveStarter}
                  onStartSwap={initiateSwap}
                  onCancelSwap={cancelSwap}
                />

                <BenchSelector
                  benchRider={benchRider}
                  benchMode={benchMode}
                  isTeamLocked={isTeamLocked}
                  onSelectBench={startBenchSelection}
                  onRemoveBench={removeBenchRider}
                />

                <div className="hidden lg:flex flex-col gap-3">
                  {isAuthenticated ? (
                    <>
                      <Button
                        className="w-full"
                        onClick={handleSaveTeam}
                        disabled={!canSave || isSubmitting}
                      >
                        {primaryActionLabel}
                      </Button>
                      {activeTeam && (
                        <JokerCardButton
                          jokerCardUsed={jokerCardUsed}
                          onClick={handleUseJokerCard}
                          className="w-full"
                        />
                      )}
                    </>
                  ) : (
                    <div className="w-full">
                      <Link href="/login">
                        <Button className="w-full">Log In to Save Team</Button>
                      </Link>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        Create an account to save your team and compete this season.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="hidden lg:block">
            <RiderList
              riders={sortedRiders}
              isLoading={ridersLoading}
              selectedTab={selectedTab}
              onTabChange={setSelectedTab}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              sortBy={sortBy}
              onSortChange={setSortBy}
              onSelectRider={handleRiderSelect}
              isSelected={(rider) => selectedRiders.some((item) => item.id === rider.id)}
              getDisabledReason={getDisabledReasonForRider}
              isTeamLocked={isTeamLocked}
              swapMode={swapMode}
              benchMode={benchMode}
              rosterFull={rosterFull}
            />
          </div>
        </div>

        <div className="mt-6 lg:hidden space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowMobileRiders((current) => !current)}
            aria-expanded={showMobileRiders}
          >
            {showMobileRiders ? "Hide Rider List" : "Browse Riders"}
          </Button>
          {showMobileRiders && (
            <RiderList
              riders={sortedRiders}
              isLoading={ridersLoading}
              selectedTab={selectedTab}
              onTabChange={setSelectedTab}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              sortBy={sortBy}
              onSortChange={setSortBy}
              onSelectRider={handleRiderSelect}
              isSelected={(rider) => selectedRiders.some((item) => item.id === rider.id)}
              getDisabledReason={getDisabledReasonForRider}
              isTeamLocked={isTeamLocked}
              swapMode={swapMode}
              benchMode={benchMode}
              rosterFull={rosterFull}
            />
          )}
        </div>
      </div>

      <StickyMobileActions
        isAuthenticated={isAuthenticated}
        isTeamLocked={isTeamLocked}
        primaryLabel={primaryActionLabel}
        summaryLabel={summaryLabel}
        canSave={canSave}
        isSubmitting={isSubmitting}
        onSave={handleSaveTeam}
      />

      <JokerCardDialog
        open={showJokerDialog}
        onOpenChange={setShowJokerDialog}
        onConfirm={handleConfirmJokerCard}
      />
    </div>
  );
}
