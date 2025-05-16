import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Rider, TeamWithRiders, Race } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Info } from "lucide-react";
import JokerCardDialog from "@/components/joker-card-dialog";
import Loader from "@/components/loader";
import TeamBuilderHeader from "@/components/team-builder-header";
import RiderSearchPanel from "@/components/rider-search-panel";
import TeamActions from "@/components/team-actions";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function TeamBuilder() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [selectedRiders, setSelectedRiders] = useState<Rider[]>([]);
  const [teamName, setTeamName] = useState("My DH Team");
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [swapMode, setSwapMode] = useState(false);
  const [swapRider, setSwapRider] = useState<Rider | null>(null);
  const [showJokerDialog, setShowJokerDialog] = useState(false);
  const [jokerCardUsed, setJokerCardUsed] = useState(false);

  // Fetch all races
  const { data: races, isLoading: racesLoading } = useQuery<Race[]>({
    queryKey: ['/api/races'],
  });

  // Determine next race
  const nextRace = races?.find((race) => race.status === 'next');
  
  // Calculate lock date (1 day before race start)
  const lockDate = nextRace ? new Date(new Date(nextRace.startDate).getTime() - 24 * 60 * 60 * 1000) : new Date();
  
  // Fetch riders
  const { data: riders, isLoading: ridersLoading } = useQuery<Rider[]>({
    queryKey: ['/api/riders'],
  });

  // Fetch user's team if authenticated
  const { data: userTeam, isLoading: teamLoading } = useQuery<TeamWithRiders>({
    queryKey: ['/api/teams/user'],
    enabled: isAuthenticated,
  });

  // Create team mutation
  const createTeam = useMutation({
    mutationFn: async (data: { name: string, riderIds: number[], useJokerCard?: boolean }) => {
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
      queryClient.invalidateQueries({ queryKey: ['/api/teams/user'] });
      setIsCreatingTeam(false);
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
    mutationFn: async ({ id, name, riderIds }: { id: number, name: string, riderIds: number[] }) => {
      return apiRequest(`/api/teams/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, riderIds }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      toast({
        title: "Team updated successfully!",
        description: "Your fantasy team has been updated.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/teams/user'] });
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
  const swapRiderMutation = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ['/api/teams/user'] });
      setSwapMode(false);
      setSwapRider(null);
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
  const usedBudget = selectedRiders.reduce((sum, rider) => sum + rider.cost, 0);
  const remainingBudget = totalBudget - usedBudget;
  const budgetPercentage = (usedBudget / totalBudget) * 100;
  
  const maleRidersCount = selectedRiders.filter(r => r.gender === "male").length;
  const femaleRidersCount = selectedRiders.filter(r => r.gender === "female").length;
  
  // Team lock status and swap tracking
  const isTeamLocked = userTeam?.isLocked || false;
  const swapsUsed = userTeam?.swapsUsed || 0;
  const swapsRemaining = 2 - swapsUsed;
  
  // Check if team composition is valid
  const isTeamValid = selectedRiders.length === 6 && 
                     maleRidersCount <= 4 && 
                     femaleRidersCount >= 2 && 
                     usedBudget <= totalBudget;

  // Initialize selected riders from user's team and check joker card status
  useEffect(() => {
    if (userTeam && !isCreatingTeam) {
      setSelectedRiders(userTeam.riders || []);
      setTeamName(userTeam.name || "My DH Team");
    }
    
    // Check if user has used joker card
    if (user) {
      setJokerCardUsed(user.jokerCardUsed || false);
    }
    
    // For guest users, allow them to create a team without logging in
    if (!isAuthenticated && !authLoading) {
      setIsCreatingTeam(true);
    }
  }, [userTeam, isCreatingTeam, user, isAuthenticated, authLoading]);

  // Handle rider selection/deselection
  const toggleRiderSelection = (rider: Rider) => {
    // If in swap mode, handle the swap
    if (swapMode && swapRider) {
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
      const isRemovingMale = swapRider.gender === "male";
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
      const newBudget = usedBudget - swapRider.cost + rider.cost;
      if (newBudget > totalBudget) {
        toast({
          title: "Budget exceeded",
          description: "This swap would exceed your $2,000,000 budget.",
          variant: "destructive",
        });
        return;
      }
      
      // Perform the swap
      if (userTeam && swapRider) {
        swapRiderMutation.mutate({
          teamId: userTeam.id,
          removedRiderId: swapRider.id,
          addedRiderId: rider.id
        });
      }
      
      return;
    }
    
    // Regular rider selection/deselection (not in swap mode)
    setSelectedRiders(riders => {
      // If rider is already selected, remove them
      if (riders.some(r => r.id === rider.id)) {
        return riders.filter(r => r.id !== rider.id);
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
    setSwapRider(rider);
  };
  
  const cancelSwap = () => {
    setSwapMode(false);
    setSwapRider(null);
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
      
      if (userTeam && !isCreatingTeam) {
        // Update existing team
        updateTeam.mutate({
          id: userTeam.id,
          name: teamName,
          riderIds
        });
      } else {
        // Create new team
        createTeam.mutate({
          name: teamName,
          riderIds
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
    createTeam.mutate({
      name: teamName,
      riderIds,
      useJokerCard: true
    });
    
    setShowJokerDialog(false);
    
    toast({
      title: "Creating new team...",
      description: "Your joker card is being used to create a new team.",
      variant: "default",
    });
  };

  // Handle "Create New" button click
  const handleCreateNewTeam = () => {
    if (userTeam && !jokerCardUsed) {
      setIsCreatingTeam(true);
      setSelectedRiders([]);
      setTeamName("My DH Team");
    } else if (userTeam && jokerCardUsed) {
      // If the user has already used their joker card, inform them
      toast({
        title: "Joker card already used",
        description: "You have already used your joker card for this season and cannot create a new team.",
        variant: "destructive",
      });
    } else {
      // First time creating a team - no joker card needed
      setSelectedRiders([]);
      setTeamName("My DH Team");
      setIsCreatingTeam(true);
    }
  };

  return (
    <div className="min-h-screen bg-neutral">
      <div className="container mx-auto px-4 py-8">
        <TeamBuilderHeader 
          isAuthenticated={isAuthenticated} 
          authLoading={authLoading} 
        />
        
        {/* Mobile view - prioritize team over riders */}
        <div className="lg:hidden">
          {/* Team section */}
          <div className="mb-6">
            {teamLoading && isAuthenticated ? (
              <Loader message="Loading your team..." />
            ) : (
              <TeamActions
                isAuthenticated={isAuthenticated}
                isTeamLocked={isTeamLocked}
                teamName={teamName}
                setTeamName={setTeamName}
                selectedRiders={selectedRiders}
                totalBudget={totalBudget}
                usedBudget={usedBudget}
                remainingBudget={remainingBudget}
                budgetPercentage={budgetPercentage}
                maleRidersCount={maleRidersCount}
                femaleRidersCount={femaleRidersCount}
                userTeam={userTeam}
                isCreatingTeam={isCreatingTeam}
                jokerCardUsed={jokerCardUsed}
                isTeamValid={isTeamValid}
                isSubmitting={createTeam.isPending || updateTeam.isPending}
                nextRace={nextRace}
                lockDate={lockDate}
                handleSaveTeam={handleSaveTeam}
                handleUseJokerCard={handleUseJokerCard}
              />
            )}
          </div>
          
          {/* Rider selection for mobile */}
          <div>
            <Card>
              <CardContent className="p-6">
                <RiderSearchPanel
                  riders={riders}
                  isLoading={ridersLoading}
                  selectedRiders={selectedRiders}
                  onRiderSelect={toggleRiderSelection}
                  swapMode={swapMode}
                />
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Desktop view - riders and team side by side */}
        <div className="hidden lg:grid lg:grid-cols-12 lg:gap-6">
          {/* Rider selection for desktop - left side */}
          <div className="lg:col-span-7">
            <Card>
              <CardContent className="p-6">
                <RiderSearchPanel
                  riders={riders}
                  isLoading={ridersLoading}
                  selectedRiders={selectedRiders}
                  onRiderSelect={toggleRiderSelection}
                  swapMode={swapMode}
                />
              </CardContent>
            </Card>
          </div>
          
          {/* Team section for desktop - right side */}
          <div className="lg:col-span-5">
            {teamLoading && isAuthenticated ? (
              <Loader message="Loading your team..." />
            ) : (
              <TeamActions
                isAuthenticated={isAuthenticated}
                isTeamLocked={isTeamLocked}
                teamName={teamName}
                setTeamName={setTeamName}
                selectedRiders={selectedRiders}
                totalBudget={totalBudget}
                usedBudget={usedBudget}
                remainingBudget={remainingBudget}
                budgetPercentage={budgetPercentage}
                maleRidersCount={maleRidersCount}
                femaleRidersCount={femaleRidersCount}
                userTeam={userTeam}
                isCreatingTeam={isCreatingTeam}
                jokerCardUsed={jokerCardUsed}
                isTeamValid={isTeamValid}
                isSubmitting={createTeam.isPending || updateTeam.isPending}
                nextRace={nextRace}
                lockDate={lockDate}
                handleSaveTeam={handleSaveTeam}
                handleUseJokerCard={handleUseJokerCard}
              />
            )}
          </div>
        </div>
        
        {/* Swap mode info - show on both mobile and desktop */}
        {swapMode && (
          <div className="mt-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Swap Mode Active</AlertTitle>
              <AlertDescription className="flex justify-between items-center">
                <span>Selecting {swapRider?.name}</span>
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