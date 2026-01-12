import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Rider, TeamWithRiders } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import RiderCard from "@/components/rider-card";
import TeamSummary from "@/components/team-summary";
import CountdownTimer from "@/components/countdown-timer";
import JokerCardDialog from "@/components/joker-card-dialog";
import JokerCardButton from "@/components/joker-card-button";
import TeamPerformancePanel from "@/components/team-performance-panel";
import { Search, AlertTriangle, Info, RefreshCw, ArrowUpDown } from "lucide-react";
import { useRacesQuery, useRidersQueryWithParams } from "@/services/riderDataApi";
import { formatRiderDisplayName } from "@shared/utils";
import { formatRaceDateRange } from "@/components/race-label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TeamBuilder() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [selectedTab, setSelectedTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRiders, setSelectedRiders] = useState<Rider[]>([]);
  const [benchRider, setBenchRider] = useState<Rider | null>(null);
  const [benchMode, setBenchMode] = useState(false);
  const [teamName, setTeamName] = useState("My DH Team");
  const [draftInitialized, setDraftInitialized] = useState(false);
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [swapMode, setSwapMode] = useState(false);
  const [swapRiderData, setSwapRiderData] = useState<Rider | null>(null);
  const [showJokerDialog, setShowJokerDialog] = useState(false);
  const [jokerCardUsed, setJokerCardUsed] = useState(false);
  const [sortBy, setSortBy] = useState<"rank" | "name" | "cost">("rank");

  // Fetch all races
  const { data: races, isLoading: racesLoading } = useRacesQuery();

  // Determine next race
  const nextRace = races?.find((race) => race.status === 'next');
  
  // Calculate lock date (1 day before race start)
  const lockDate = nextRace ? new Date(new Date(nextRace.startDate).getTime() - 24 * 60 * 60 * 1000) : new Date();
  
  // Fetch riders
  const { data: riders, isLoading: ridersLoading } = useRidersQueryWithParams({
    category: "elite",
    pageSize: 200,
  });
  const safeRiders = Array.isArray(riders) ? (riders as Rider[]) : [];

  const userTeamQueryKey = "/api/teams/user";

  // Fetch user's teams if authenticated
  const { data: userTeam, isLoading: teamLoading } = useQuery<TeamWithRiders | null>({
    queryKey: [userTeamQueryKey],
    enabled: isAuthenticated,
  });

  const activeTeam = userTeam;
  const isCreatingTeam = !isAuthenticated || !activeTeam;

  const invalidateUserTeams = () => {
    queryClient.invalidateQueries({ queryKey: [userTeamQueryKey] });
  };

  // Create team mutation
  const createTeam = useMutation({
    mutationFn: async (data: { name: string, riderIds: number[], benchRiderId?: number | null, useJokerCard?: boolean }) => {
      return apiRequest('/api/teams', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      toast({
        title: "Team created successfully!",
        description: "Your fantasy team has been created.",
        variant: "default",
      });
      setIsEditingTeam(false);
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
    onSuccess: () => {
      toast({
        title: "Team updated successfully!",
        description: "Your fantasy team has been updated.",
        variant: "default",
      });
      setIsEditingTeam(false);
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
  const totalBudget = 2000000;
  const startersBudget = selectedRiders.reduce((sum, rider) => sum + rider.cost, 0);
  const benchBudget = benchRider?.cost ?? 0;
  const usedBudget = startersBudget + benchBudget;
  const remainingBudget = totalBudget - usedBudget;
  const budgetPercentage = (usedBudget / totalBudget) * 100;
  
  const maleRidersCount = selectedRiders.filter(r => r.gender === "male").length;
  const femaleRidersCount = selectedRiders.filter(r => r.gender === "female").length;
  
  // Team lock status and swap tracking
  const isTeamLocked = activeTeam?.isLocked || false;
  const swapsUsed = activeTeam?.swapsUsed || 0;
  const swapsRemaining = 2 - swapsUsed;
  const showRiderPicker = isEditingTeam;
  
  const benchIsValid = !benchRider || !selectedRiders.some((rider) => rider.id === benchRider.id);

  const isTeamValid = selectedRiders.length === 6 && 
                     maleRidersCount <= 4 && 
                     femaleRidersCount >= 2 && 
                     usedBudget <= totalBudget &&
                     benchIsValid;

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
    if (user) {
      setJokerCardUsed(user.jokerCardUsed || false);
    }
  }, [user]);

  useEffect(() => {
    if (!isEditingTeam) {
      setBenchMode(false);
      setSwapMode(false);
      setSwapRiderData(null);
    }
  }, [isEditingTeam]);

  // Filter riders based on search and tab
  const filteredRiders = safeRiders.filter((rider: Rider) => {
    const matchesSearch = rider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rider.team.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = selectedTab === "all" || rider.gender === selectedTab;
    return matchesSearch && matchesTab;
  });

  const sortedRiders = [...filteredRiders].sort((a, b) => {
    if (sortBy === "name") {
      const aLast = a.lastName?.toLowerCase() || a.name.split(" ").pop()?.toLowerCase() || "";
      const bLast = b.lastName?.toLowerCase() || b.name.split(" ").pop()?.toLowerCase() || "";
      if (aLast !== bLast) return aLast.localeCompare(bLast);
      const aFirst = a.firstName?.toLowerCase() || a.name.split(" ").slice(0, -1).join(" ").toLowerCase();
      const bFirst = b.firstName?.toLowerCase() || b.name.split(" ").slice(0, -1).join(" ").toLowerCase();
      return aFirst.localeCompare(bFirst);
    }

    if (sortBy === "cost") {
      return b.cost - a.cost;
    }

    const aRank =
      typeof a.lastYearStanding === "number" && a.lastYearStanding > 0
        ? a.lastYearStanding
        : Number.POSITIVE_INFINITY;
    const bRank =
      typeof b.lastYearStanding === "number" && b.lastYearStanding > 0
        ? b.lastYearStanding
        : Number.POSITIVE_INFINITY;
    if (aRank !== bRank) return aRank - bRank;
    return b.points - a.points;
  });

  // Handle rider selection/deselection
  const toggleRiderSelection = (rider: Rider) => {
    // If in swap mode, handle the swap
    if (swapMode && swapRiderData) {
      // Can't swap with a rider already on the team
      if (selectedRiders.some(r => r.id === rider.id)) {
        toast({
          title: "Rider already on team",
          description: "You can't swap with a rider already on your team.",
          variant: "destructive",
        });
        return;
      }
      
      // Check if team would still be valid after swap
      const isRemovingMale = swapRiderData.gender === "male";
      const isAddingMale = rider.gender === "male";
      
      if (isRemovingMale && !isAddingMale) {
        // Removing male, adding female - check team composition
        if (maleRidersCount <= 2) {
          toast({
            title: "Invalid team composition",
            description: "Your team must include at least 2 male riders.",
            variant: "destructive",
          });
          return;
        }
        
        if (femaleRidersCount >= 4) {
          toast({
            title: "Invalid team composition",
            description: "Your team can include a maximum of 4 female riders.",
            variant: "destructive",
          });
          return;
        }
      } else if (!isRemovingMale && isAddingMale) {
        // Removing female, adding male - check team composition
        if (femaleRidersCount <= 2) {
          toast({
            title: "Invalid team composition",
            description: "Your team must include at least 2 female riders.",
            variant: "destructive",
          });
          return;
        }
        
        if (maleRidersCount >= 4) {
          toast({
            title: "Invalid team composition",
            description: "Your team can include a maximum of 4 male riders.",
            variant: "destructive",
          });
          return;
        }
      }
      
      // Check budget
      const newBudget = usedBudget - swapRiderData.cost + rider.cost;
      if (newBudget > totalBudget) {
        toast({
          title: "Budget exceeded",
          description: "This swap would exceed your $2,000,000 budget.",
          variant: "destructive",
        });
        return;
      }
      
      // Perform the swap
      if (activeTeam && swapRiderData) {
        performSwapRider.mutate({
          teamId: activeTeam.id,
          removedRiderId: swapRiderData.id,
          addedRiderId: rider.id
        });
      }
      
      return;
    }

    if (benchMode) {
      if (selectedRiders.some(r => r.id === rider.id)) {
        toast({
          title: "Rider already a starter",
          description: "Your bench rider must be different from your starters.",
          variant: "destructive",
        });
        return;
      }

      const newBudget = startersBudget + rider.cost;
      if (newBudget > totalBudget) {
        toast({
          title: "Budget exceeded",
          description: "Adding this bench rider would exceed your $2,000,000 budget.",
          variant: "destructive",
        });
        return;
      }

      setBenchRider(rider);
      setBenchMode(false);
      return;
    }
    
    // Regular rider selection/deselection (not in swap mode)
    setSelectedRiders(riders => {
      // If rider is already selected, remove them
      if (riders.some(r => r.id === rider.id)) {
        return riders.filter(r => r.id !== rider.id);
      }

      if (benchRider?.id === rider.id) {
        toast({
          title: "Bench rider selected",
          description: "Remove this rider from your bench before adding as a starter.",
          variant: "destructive",
        });
        return riders;
      }
      
      // Check if adding rider would exceed team limit
      if (riders.length >= 6) {
        toast({
          title: "Team limit reached",
          description: "Your team can have a maximum of 6 riders.",
          variant: "destructive",
        });
        return riders;
      }
      
      // Check gender balance
      if (rider.gender === "male" && maleRidersCount >= 4) {
        toast({
          title: "Invalid team composition",
          description: "Your team can include a maximum of 4 male riders.",
          variant: "destructive",
        });
        return riders;
      }
      
      // Check budget
      if (usedBudget + rider.cost > totalBudget) {
        toast({
          title: "Budget exceeded",
          description: "Adding this rider would exceed your $2,000,000 budget.",
          variant: "destructive",
        });
        return riders;
      }
      
      // Add the rider
      return [...riders, rider];
    });
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

  const cancelBenchSelection = () => {
    setBenchMode(false);
  };

  // Handle save/update team
  const handleSaveTeam = () => {
    if (!isTeamValid) {
      toast({
        title: "Invalid team",
        description: "Your team must include exactly 6 riders (max 4 men, min 2 women) within the $2,000,000 budget.",
        variant: "destructive",
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
    // Use joker card to create a new team
    if (selectedRiders.length !== 6) {
      toast({
        title: "Invalid team",
        description: "Please select exactly 6 riders for your team.",
        variant: "destructive",
      });
      return;
    }
    
    if (!isTeamValid) {
      toast({
        title: "Invalid team",
        description: "Your team must include max 4 men, min 2 women within budget.",
        variant: "destructive",
      });
      return;
    }
    
    const riderIds = selectedRiders.map(r => r.id);
    const benchRiderId = benchRider ? benchRider.id : null;
    createTeam.mutate({
      name: teamName,
      riderIds,
      benchRiderId,
      useJokerCard: true,
    });
    
    setShowJokerDialog(false);
    
    toast({
      title: "Creating new team...",
      description: "Your joker card is being used to create a new team.",
      variant: "default",
    });
  };

  // Render UI components based on role
  const renderTeamSection = () => (
    <div className="bg-gray-50 p-5 rounded-lg">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-heading font-bold text-xl text-secondary">YOUR TEAM</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditingTeam((current) => !current)}
          disabled={isTeamLocked && swapsRemaining <= 0}
        >
          {isEditingTeam ? "Done Editing" : isTeamLocked ? "Manage Swaps" : "Edit Team"}
        </Button>
      </div>
      
      {/* Team lock countdown */}
      {nextRace && isAuthenticated && activeTeam && (
        <div className="mb-5">
          <CountdownTimer 
            targetDate={lockDate} 
            title={
              <>
                <span className="font-heading uppercase font-bold">
                  {nextRace.location},{" "}
                  <span className="uppercase">{nextRace.country}</span>
                </span>
                <span className="ml-2 text-xs opacity-80">
                  {formatRaceDateRange(nextRace.startDate, nextRace.endDate)}
                </span>
              </>
            }
            subtitle={nextRace.name}
            showLockStatus
          />
        </div>
      )}
      
      {/* Team name */}
      <div className="mb-4">
        <Input
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="Team Name"
          disabled={(!isEditingTeam && !isCreatingTeam) || (isTeamLocked && !isCreatingTeam)}
          className="font-heading font-bold"
        />
      </div>
      
      {/* Team summary */}
      <TeamSummary
        selectedRiders={selectedRiders}
        toggleRiderSelection={
          isEditingTeam && !isTeamLocked ? toggleRiderSelection : undefined
        }
        benchRider={benchRider}
        benchMode={benchMode}
        onSelectBench={
          isEditingTeam && !isTeamLocked ? startBenchSelection : undefined
        }
        onRemoveBench={
          isEditingTeam && !isTeamLocked ? removeBenchRider : undefined
        }
        totalBudget={totalBudget}
        usedBudget={usedBudget}
        remainingBudget={remainingBudget}
        budgetPercentage={budgetPercentage}
        maleRidersCount={maleRidersCount}
        femaleRidersCount={femaleRidersCount}
        isTeamLocked={isTeamLocked}
        swapsRemaining={swapsRemaining}
        swapMode={swapMode}
        initiateSwap={isEditingTeam ? initiateSwap : undefined}
        cancelSwap={isEditingTeam ? cancelSwap : undefined}
        swapRider={swapRiderData}
      />
      
      {/* Action buttons */}
      <div className="flex flex-col md:flex-row gap-3 mt-5">
        {isAuthenticated ? (
          <>
            {/* Save/update button for authenticated users */}
            <Button
              className="w-full"
              onClick={handleSaveTeam}
              disabled={
                !isEditingTeam ||
                !isTeamValid ||
                createTeam.isPending ||
                updateTeam.isPending
              }
            >
              {activeTeam && !isCreatingTeam ? 'Update Team' : 'Save Team'}
            </Button>
            
            {/* Joker card button */}
            {activeTeam && (
              <JokerCardButton
                jokerCardUsed={jokerCardUsed}
                onClick={handleUseJokerCard}
                className="w-full md:w-auto"
              />
            )}
          </>
        ) : (
          <>
            {/* Login CTA button for guests */}
            <div className="w-full">
              <Link href="/login">
                <Button
                  className="w-full"
                >
                  Log In to Save Team
                </Button>
              </Link>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Create an account to save your team and compete in the 2025 fantasy league
              </p>
            </div>
          </>
        )}
      </div>

      {isAuthenticated && activeTeam && (
        <TeamPerformancePanel teamType={activeTeam.teamType as "elite" | "junior"} />
      )}
    </div>
  );
  
  const renderRiderSearch = () => (
    <div>
      <h3 className="font-heading font-bold text-xl text-secondary mb-4">SELECT RIDERS</h3>
      
      {/* Search input */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search riders..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      
      {/* Tabs for filtering */}
      <Tabs
        value={selectedTab}
        className="mb-4"
        onValueChange={setSelectedTab}
      >
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
          <TabsTrigger value="male" className="flex-1">Men</TabsTrigger>
          <TabsTrigger value="female" className="flex-1">Women</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-2 mb-3 text-sm text-gray-700">
        <span className="flex items-center gap-2 font-medium">
          <ArrowUpDown className="h-4 w-4" /> Sort by
        </span>

        {/* Mobile sort dropdown */}
        <div className="lg:hidden">
          <Select value={sortBy} onValueChange={(value: typeof sortBy) => setSortBy(value)}>
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

        {/* Desktop sort buttons */}
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
              onClick={() => setSortBy(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Riders list */}
      {ridersLoading ? (
        <div className="flex justify-center items-center py-10">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2">Loading riders...</span>
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
          {filteredRiders.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">No riders found</p>
            </div>
          ) : (
            sortedRiders.map((rider: Rider) => (
              <RiderCard
                key={rider.id}
                rider={rider}
                selected={selectedRiders.some(r => r.id === rider.id)}
                onClick={() => toggleRiderSelection(rider)}
                disabled={
                  (swapMode || benchMode) && selectedRiders.some(r => r.id === rider.id)
                }
                showSelectIcon
              />
            ))
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral">
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl md:text-3xl font-heading font-bold text-secondary mb-6">
          TEAM BUILDER
        </h2>
        
        {/* Guest banner */}
        {!isAuthenticated && !authLoading && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-md">
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-3">
                <Info className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-blue-800">Guest Mode</h3>
                <p className="text-sm text-blue-700 mt-1">
                  You're building a team in guest mode. Create an account to save your team and join the 2025 fantasy league!
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Mobile view - prioritize team over riders */}
        <div className="lg:hidden">
          {/* Team section for mobile */}
          <div className="mb-6">
            {teamLoading && isAuthenticated ? (
              <div className="flex justify-center items-center py-10">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2">Loading your team...</span>
              </div>
            ) : (
              renderTeamSection()
            )}
          </div>
          
          {/* Rider selection for mobile */}
          {showRiderPicker && (
            <div>
              <Card>
                <CardContent className="p-6">
                  {renderRiderSearch()}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
        
        {/* Desktop view - riders and team side by side */}
        <div className="hidden lg:grid lg:grid-cols-12 lg:gap-6">
          {/* Team section for desktop - primary */}
          <div className={showRiderPicker ? "lg:col-span-7" : "lg:col-span-12"}>
            {teamLoading && isAuthenticated ? (
              <div className="flex justify-center items-center py-10">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2">Loading your team...</span>
              </div>
            ) : (
              renderTeamSection()
            )}
          </div>

          {/* Rider selection for desktop - right side */}
          {showRiderPicker && (
            <div className="lg:col-span-5">
              <Card>
                <CardContent className="p-6">
                  {renderRiderSearch()}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
        
        {/* Swap mode info - show on both mobile and desktop */}
        {swapMode && (
          <div className="mt-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Swap Mode Active</AlertTitle>
              <AlertDescription className="flex justify-between items-center">
                <span>Selecting {swapRiderData ? formatRiderDisplayName(swapRiderData) || swapRiderData.name : ''}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={cancelSwap}
                >
                  Cancel
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {benchMode && !swapMode && (
          <div className="mt-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Bench Selection Active</AlertTitle>
              <AlertDescription className="flex justify-between items-center">
                <span>Select a rider to set your bench.</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cancelBenchSelection}
                >
                  Cancel
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
      
      {/* Joker card dialog */}
      <JokerCardDialog
        open={showJokerDialog}
        onOpenChange={setShowJokerDialog}
        onConfirm={handleConfirmJokerCard}
        isTeamValid={isTeamValid}
      />
    </div>
  );
}
