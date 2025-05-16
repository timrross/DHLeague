import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Rider, User, TeamWithRiders, Race } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import RiderCard from "@/components/rider-card";
import TeamSummary from "@/components/team-summary";
import CountdownTimer from "@/components/countdown-timer";
import JokerCardDialog from "@/components/joker-card-dialog";
import JokerCardButton from "@/components/joker-card-button";
import { 
  Search, AlertTriangle, Info, RefreshCw, 
  RotateCcw, AlertCircle, CheckCircle2
} from "lucide-react";

export default function TeamBuilder() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [selectedTab, setSelectedTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
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
    onSuccess: (data, variables) => {
      if (variables.useJokerCard) {
        toast({
          title: "Team rebuilt with joker card!",
          description: "Your fantasy team has been completely reset. You've used your joker card for this season.",
          variant: "default",
        });
        // Update joker card state
        setJokerCardUsed(true);
      } else {
        toast({
          title: "✅ Team created successfully!",
          description: "Your fantasy team has been created and saved.",
          variant: "default",
        });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/teams/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setIsCreatingTeam(false);
      setShowJokerDialog(false);
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
    mutationFn: async (data: { name: string, riderIds: number[] }) => {
      if (!userTeam?.id) {
        throw new Error("Team not found");
      }
      return apiRequest(`/api/teams/${userTeam.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      toast({
        title: "✅ Team updated successfully!",
        description: "Your fantasy team has been updated and saved.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/teams/user'] });
      setIsCreatingTeam(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update team",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    }
  });

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

  // Filter riders based on search and tab
  const filteredRiders = riders ? (riders as Rider[]).filter((rider: Rider) => {
    const matchesSearch = rider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rider.team.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = selectedTab === "all" || rider.gender === selectedTab;
    return matchesSearch && matchesTab;
  }) : [];

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
    
    setSwapRider(rider);
    setSwapMode(true);
    setSelectedTab("all"); // Reset tab to show all riders
    setSearchTerm(""); // Clear search
    
    toast({
      title: "Swap Mode Activated",
      description: `Select a new rider to replace ${rider.name}. (${swapsRemaining} swap${swapsRemaining !== 1 ? 's' : ''} remaining)`,
      variant: "default",
    });
  };
  
  // Cancel swap mode
  const cancelSwap = () => {
    setSwapMode(false);
    setSwapRider(null);
  };
  
  // Swap rider mutation
  const swapRiderMutation = useMutation({
    mutationFn: async (data: { removedRiderId: number, addedRiderId: number }) => {
      if (!userTeam?.id) {
        throw new Error("Team not found");
      }
      return apiRequest(`/api/teams/${userTeam.id}/swap`, {
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
  const isTeamValid = selectedRiders.length === 6 && 
                     maleRidersCount <= 4 && 
                     femaleRidersCount >= 2 && 
                     usedBudget <= totalBudget;

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
      
      // Validate gender ratio
      const removingMale = swapRider.gender === "male";
      const addingMale = rider.gender === "male";
      const currentMaleCount = selectedRiders.filter(r => r.gender === "male").length;
      const currentFemaleCount = selectedRiders.filter(r => r.gender === "female").length;
      
      if (!removingMale && addingMale && currentMaleCount >= 4) {
        toast({
          title: "Maximum male riders reached",
          description: "You can have a maximum of 4 male riders in your team.",
          variant: "destructive",
        });
        return;
      }
      
      if (removingMale && !addingMale && currentFemaleCount >= 4) {
        toast({
          title: "Maximum female riders reached",
          description: "You can have a maximum of 4 female riders in your team.",
          variant: "destructive",
        });
        return;
      }
      
      // Check budget
      const newBudget = usedBudget - swapRider.cost + rider.cost;
      if (newBudget > totalBudget) {
        toast({
          title: "Budget exceeded",
          description: `This swap would exceed your budget of $${totalBudget.toLocaleString()}.`,
          variant: "destructive",
        });
        return;
      }
      
      // If all checks pass, perform the swap
      swapRiderMutation.mutate({
        removedRiderId: swapRider.id,
        addedRiderId: rider.id
      });
      
      return;
    }
    
    // If team is locked and not in swap mode, prevent direct changes
    if (isTeamLocked) {
      toast({
        title: "Team is locked",
        description: "Your team is locked for the next race. Use the 'Swap Rider' feature instead.",
        variant: "default",
      });
      return;
    }
    
    // Regular team building mode
    const isSelected = selectedRiders.some(r => r.id === rider.id);
    
    if (isSelected) {
      // Remove rider
      setSelectedRiders(selectedRiders.filter(r => r.id !== rider.id));
    } else {
      // Check gender balance
      if (rider.gender === "male" && maleRidersCount >= 4) {
        toast({
          title: "Maximum male riders reached",
          description: "You can have a maximum of 4 male riders in your team.",
          variant: "destructive",
        });
        return;
      }
      
      // Check budget
      if (usedBudget + rider.cost > totalBudget) {
        toast({
          title: "Budget exceeded",
          description: `This rider would exceed your budget of $${totalBudget.toLocaleString()}.`,
          variant: "destructive",
        });
        return;
      }
      
      // Add rider if team isn't full
      if (selectedRiders.length < 6) {
        // Add the rider to the selection
        setSelectedRiders([...selectedRiders, rider]);
        
        // Warn about injured rider after adding
        if (rider.injured) {
          toast({
            title: "Injured Rider Added",
            description: "Warning: This rider is currently injured and may not participate in upcoming races.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Team is full",
          description: "Remove a rider before adding a new one.",
          variant: "destructive",
        });
      }
    }
  };

  // Handle team save
  const handleSaveTeam = () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to save your team.",
        variant: "destructive",
      });
      return setLocation("/api/login");
    }

    if (!isTeamValid) {
      toast({
        title: "Invalid team",
        description: "Your team must have 6 riders (max 4 men, min 2 women) and stay within budget.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if any riders are injured and warn the user
    const injuredRiders = selectedRiders.filter(rider => rider.injured);
    if (injuredRiders.length > 0) {
      toast({
        title: `Team includes ${injuredRiders.length} injured rider${injuredRiders.length > 1 ? 's' : ''}`,
        description: "Injured riders may not participate in upcoming races and could affect your score.",
        variant: "destructive",
      });
    }

    const riderIds = selectedRiders.map(r => r.id);
    
    // Determine action type (create or update)
    const actionType = userTeam && !isCreatingTeam ? 'update' : 'create';
    const confirmMessage = actionType === 'update' 
      ? 'Are you sure you want to update your team with these riders?' 
      : 'Are you sure you want to save this team?';
    
    // Show confirmation dialog
    if (window.confirm(confirmMessage)) {
      if (actionType === 'update') {
        // Update existing team
        updateTeam.mutate({
          name: teamName,
          riderIds
        });
        
        // Show immediate feedback toast
        toast({
          title: "Saving your team...",
          description: "Your team is being updated.",
          variant: "default",
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
    
    const riderIds = selectedRiders.map(r => r.id);
    
    // Create new team with joker card flag
    createTeam.mutate({
      name: teamName,
      riderIds,
      useJokerCard: true
    });
  };
  
  // Handle create new team button
  const handleCreateNewTeam = () => {
    // If user already has a team and has never used joker card, ask if they want to use it
    if (userTeam && !jokerCardUsed) {
      if (window.confirm("Creating a new team will replace your current team. Would you like to use your joker card to reset your team?")) {
        // Show joker card dialog for confirmation
        setShowJokerDialog(true);
      }
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
          <div className="mb-6">
            {/* Team section for mobile */}
            <div>
              <div className="bg-gray-50 p-5 rounded-lg">
                <div className="mb-4">
                  <h3 className="font-heading font-bold text-xl text-secondary">YOUR TEAM</h3>
                </div>
                
                {/* Team lock countdown */}
                {nextRace && isAuthenticated && userTeam && (
                  <div className="mb-5">
                    <CountdownTimer 
                      targetDate={lockDate} 
                      title={`${nextRace.name} (${new Date(nextRace.startDate).toLocaleDateString()})`}
                      showLockStatus
                    />
                  </div>
                )}
                
                {/* Loading state */}
                {teamLoading && isAuthenticated ? (
                  <div className="flex justify-center items-center py-10">
                    <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                    <span className="ml-2">Loading your team...</span>
                  </div>
                ) : (
                  <>
                    {/* If no team yet */}
                    {!userTeam && isAuthenticated && !isCreatingTeam && (
                      <div className="py-8 px-4 bg-white rounded-lg shadow-sm text-center mb-6">
                        <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-3" />
                        <h3 className="text-lg font-bold mb-2">No Team Yet</h3>
                        <p className="text-gray-600 mb-4">
                          You haven't created your fantasy team for the 2025 season. Select your riders and create your team!
                        </p>
                        <Button onClick={() => setIsCreatingTeam(true)}>
                          Create Your Team
                        </Button>
                      </div>
                    )}
                    
                    {/* If team exists or is being created */}
                    {((userTeam && isAuthenticated) || isCreatingTeam) && (
                      <>
                        {/* Team name */}
                        <div className="mb-4">
                          <Input
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            placeholder="Team Name"
                            disabled={isTeamLocked && !isCreatingTeam}
                            className="font-heading font-bold"
                          />
                        </div>
                        
                        {/* Team summary */}
                        <TeamSummary
                          selectedRiders={selectedRiders}
                          totalBudget={totalBudget}
                          usedBudget={usedBudget}
                          remainingBudget={remainingBudget}
                          budgetPercentage={budgetPercentage}
                          maleRidersCount={maleRidersCount}
                          femaleRidersCount={femaleRidersCount}
                        />
                        
                        {/* Action buttons */}
                        <div className="flex flex-col md:flex-row gap-3 mt-5">
                          {isAuthenticated ? (
                            <>
                              {/* Save/update button for authenticated users */}
                              <Button
                                className="w-full"
                                onClick={handleSaveTeam}
                                disabled={!isTeamValid || createTeam.isPending || updateTeam.isPending}
                              >
                                {userTeam && !isCreatingTeam ? 'Update Team' : 'Save Team'}
                              </Button>
                              
                              {/* Joker card button */}
                              {userTeam && (
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
                                <Link href="/api/login">
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
                        
                        {/* Swap mode info */}
                        {swapMode && (
                          <Alert className="mt-5">
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
                        )}
                        
                        {/* Login CTA */}
                        {!isAuthenticated && (
                          <Alert className="mt-5 bg-white">
                            <Info className="h-4 w-4" />
                            <AlertTitle>Authentication Required</AlertTitle>
                            <AlertDescription>
                              <p className="text-sm text-gray-600 mb-2">You need to log in to save your team</p>
                              <Link href="/api/login">
                                <Button variant="secondary" size="sm">
                                  Log In / Sign Up
                                </Button>
                              </Link>
                            </AlertDescription>
                          </Alert>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Rider selection for mobile */}
          <div>
            <Card className="mb-8">
              <CardContent className="p-6">
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
                <Tabs defaultValue="all" className="mb-4" onValueChange={setSelectedTab}>
                  <TabsList className="w-full">
                    <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
                    <TabsTrigger value="male" className="flex-1">Men</TabsTrigger>
                    <TabsTrigger value="female" className="flex-1">Women</TabsTrigger>
                  </TabsList>
                </Tabs>
                
                {/* Riders list */}
                {ridersLoading ? (
                  <div className="flex justify-center items-center py-10">
                    <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                    <span className="ml-2">Loading riders...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredRiders.length === 0 ? (
                      <div className="text-center py-10">
                        <p className="text-gray-500">No riders found</p>
                      </div>
                    ) : (
                      filteredRiders.map((rider: Rider) => (
                        <RiderCard
                          key={rider.id}
                          rider={rider}
                          selected={selectedRiders.some(r => r.id === rider.id)}
                          onClick={() => toggleRiderSelection(rider)}
                          disabled={swapMode && selectedRiders.some(r => r.id === rider.id)}
                          showSelectIcon
                        />
                      ))
                    )}
                  </div>
                )}
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
                <Tabs defaultValue="all" className="mb-4" onValueChange={setSelectedTab}>
                  <TabsList className="w-full">
                    <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
                    <TabsTrigger value="male" className="flex-1">Men</TabsTrigger>
                    <TabsTrigger value="female" className="flex-1">Women</TabsTrigger>
                  </TabsList>
                </Tabs>
                
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
                      filteredRiders.map((rider: Rider) => (
                        <RiderCard
                          key={rider.id}
                          rider={rider}
                          selected={selectedRiders.some(r => r.id === rider.id)}
                          onClick={() => toggleRiderSelection(rider)}
                          disabled={swapMode && selectedRiders.some(r => r.id === rider.id)}
                          showSelectIcon
                        />
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Team section for desktop - right side */}
          <div className="lg:col-span-5">
            <div className="bg-gray-50 p-5 rounded-lg">
              <div className="mb-4">
                <h3 className="font-heading font-bold text-xl text-secondary">YOUR TEAM</h3>
              </div>
              
              {/* Team lock countdown */}
              {nextRace && isAuthenticated && userTeam && (
                <div className="mb-5">
                  <CountdownTimer 
                    targetDate={lockDate} 
                    title={`${nextRace.name} (${new Date(nextRace.startDate).toLocaleDateString()})`}
                    showLockStatus
                  />
                </div>
              )}
              
              {/* Loading state */}
              {teamLoading && isAuthenticated ? (
                <div className="flex justify-center items-center py-10">
                  <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2">Loading your team...</span>
                </div>
              ) : (
                <>
                  {/* If no team yet */}
                  {!userTeam && isAuthenticated && !isCreatingTeam && (
                    <div className="py-8 px-4 bg-white rounded-lg shadow-sm text-center mb-6">
                      <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-3" />
                      <h3 className="text-lg font-bold mb-2">No Team Yet</h3>
                      <p className="text-gray-600 mb-4">
                        You haven't created your fantasy team for the 2025 season. Select your riders and create your team!
                      </p>
                      <Button onClick={() => setIsCreatingTeam(true)}>
                        Create Your Team
                      </Button>
                    </div>
                  )}
                  
                  {/* If team exists or is being created */}
                  {((userTeam && isAuthenticated) || isCreatingTeam) && (
                    <>
                      {/* Team name */}
                      <div className="mb-4">
                        <Input
                          value={teamName}
                          onChange={(e) => setTeamName(e.target.value)}
                          placeholder="Team Name"
                          disabled={isTeamLocked && !isCreatingTeam}
                          className="font-heading font-bold"
                        />
                      </div>
                      
                      {/* Selected riders */}
                      <div className="space-y-2 mb-5">
                        {selectedRiders.length === 0 ? (
                          <div className="p-5 text-center bg-white rounded-lg border border-dashed border-gray-300">
                            <p className="text-gray-500">
                              Select 6 riders from the list to build your team
                            </p>
                          </div>
                        ) : (
                          selectedRiders.map((rider) => (
                            <RiderCard
                              key={rider.id}
                              rider={rider}
                              selected={true}
                              onClick={() => toggleRiderSelection(rider)}
                              swapMode={isTeamLocked}
                              onSwap={() => initiateSwap(rider)}
                              showRemoveIcon={!isTeamLocked}
                            />
                          ))
                        )}
                      </div>
                      
                      {/* Team summary */}
                      <TeamSummary
                        selectedRiders={selectedRiders}
                        totalBudget={totalBudget}
                        usedBudget={usedBudget}
                        remainingBudget={remainingBudget}
                        budgetPercentage={budgetPercentage}
                        maleRidersCount={maleRidersCount}
                        femaleRidersCount={femaleRidersCount}
                      />
                      
                      {/* Action buttons */}
                      <div className="flex flex-col md:flex-row gap-3 mt-5">
                        {/* Save/update button */}
                        <Button
                          className="w-full"
                          onClick={handleSaveTeam}
                          disabled={!isTeamValid || createTeam.isPending || updateTeam.isPending}
                        >
                          {userTeam && !isCreatingTeam ? 'Update Team' : 'Save Team'}
                        </Button>
                        
                        {/* Joker card button */}
                        {isAuthenticated && userTeam && (
                          <JokerCardButton
                            jokerCardUsed={jokerCardUsed}
                            onClick={handleUseJokerCard}
                            className="w-full md:w-auto"
                          />
                        )}
                      </div>
                      
                      {/* Swap mode info */}
                      {swapMode && (
                        <Alert className="mt-5">
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
                      )}
                      
                      {/* Login CTA */}
                      {!isAuthenticated && (
                        <Alert className="mt-5 bg-white">
                          <Info className="h-4 w-4" />
                          <AlertTitle>Authentication Required</AlertTitle>
                          <AlertDescription>
                            <p className="text-sm text-gray-600 mb-2">You need to log in to save your team</p>
                            <Link href="/api/login">
                              <Button variant="secondary" size="sm">
                                Log In / Sign Up
                              </Button>
                            </Link>
                          </AlertDescription>
                        </Alert>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
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