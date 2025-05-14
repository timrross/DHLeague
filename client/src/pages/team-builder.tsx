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
import { Search, AlertTriangle, Info, RefreshCw } from "lucide-react";

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

  // Fetch all races
  const { data: races, isLoading: racesLoading } = useQuery<Race[]>({
    queryKey: ['/api/races'],
  });

  // Determine next race
  const nextRace = races?.find((race) => race.status === 'next');
  
  // Calculate lock date (1 day before race start)
  const lockDate = nextRace ? new Date(new Date(nextRace.startDate).getTime() - 24 * 60 * 60 * 1000) : new Date();
  const isTeamLocked = nextRace && new Date() >= lockDate;
  
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
    mutationFn: async (data: { name: string, riderIds: number[] }) => {
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
    mutationFn: async (data: { name: string, riderIds: number[] }) => {
      if (!userTeam?.id) {
        throw new Error("Team not found");
      }
      return apiRequest(`/api/teams/${userTeam.id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
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

  // Initialize selected riders from user's team
  useEffect(() => {
    if (userTeam && !isCreatingTeam) {
      setSelectedRiders(userTeam.riders || []);
      setTeamName(userTeam.name || "My DH Team");
    }
  }, [userTeam, isCreatingTeam]);

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
  const swapsUsed = userTeam?.swapsUsed || 0;
  const swapsRemaining = 2 - swapsUsed;
  const isTeamValid = selectedRiders.length === 6 && 
                     maleRidersCount <= 4 && 
                     femaleRidersCount >= 2 && 
                     usedBudget <= totalBudget;

  // Handle rider selection/deselection
  const toggleRiderSelection = (rider: Rider) => {
    const isSelected = selectedRiders.some(r => r.id === rider.id);
    
    if (isSelected) {
      // Remove rider
      setSelectedRiders(selectedRiders.filter(r => r.id !== rider.id));
    } else {
      // Add rider if team isn't full or if we're replacing
      if (selectedRiders.length < 6) {
        setSelectedRiders([...selectedRiders, rider]);
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

    const riderIds = selectedRiders.map(r => r.id);
    
    if (userTeam && !isCreatingTeam) {
      // Update existing team
      updateTeam.mutate({
        name: teamName,
        riderIds
      });
    } else {
      // Create new team
      createTeam.mutate({
        name: teamName,
        riderIds
      });
    }
  };

  // Handle create new team button
  const handleCreateNewTeam = () => {
    setSelectedRiders([]);
    setTeamName("My DH Team");
    setIsCreatingTeam(true);
  };

  // Handle cancel create team
  const handleCancelCreateTeam = () => {
    if (userTeam) {
      setSelectedRiders(userTeam.riders || []);
      setTeamName(userTeam.name || "My DH Team");
    } else {
      setSelectedRiders([]);
    }
    setIsCreatingTeam(false);
  };

  if (authLoading || ridersLoading || teamLoading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="h-24 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-lg font-semibold">Loading team builder...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col md:flex-row items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-secondary">
            {userTeam && !isCreatingTeam ? "MANAGE YOUR TEAM" : "BUILD YOUR DREAM TEAM"}
          </h2>
          <div className="mt-3 md:mt-0 bg-white px-4 py-2 rounded-full shadow-md">
            <div className="flex items-center">
              <span className="font-heading font-bold text-gray-700 mr-2">BUDGET:</span>
              <span className={`font-accent font-bold text-xl ${remainingBudget >= 0 ? 'text-primary' : 'text-destructive'}`}>
                ${remainingBudget.toLocaleString()}
              </span>
              <span className="font-accent text-sm text-gray-500 ml-1">/ ${totalBudget.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <Card className="bg-white rounded-lg shadow-md overflow-hidden">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="mb-6">
                  <h3 className="font-heading font-bold text-xl text-secondary mb-3">SELECT YOUR RIDERS</h3>
                  
                  {/* Rider filter tabs */}
                  <Tabs defaultValue="all" value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                    <TabsList className="flex mb-4 border-b border-gray-200 bg-transparent p-0 h-auto">
                      <TabsTrigger
                        value="all"
                        className="px-4 py-2 font-heading font-semibold data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary bg-transparent rounded-none"
                      >
                        ALL RIDERS
                      </TabsTrigger>
                      <TabsTrigger
                        value="male"
                        className="px-4 py-2 font-heading font-semibold data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary bg-transparent rounded-none"
                      >
                        MEN
                      </TabsTrigger>
                      <TabsTrigger
                        value="female"
                        className="px-4 py-2 font-heading font-semibold data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary bg-transparent rounded-none"
                      >
                        WOMEN
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  
                  {/* Rider search */}
                  <div className="mb-4">
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Search riders..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  
                  {/* Rider list */}
                  <div className="space-y-3">
                    {filteredRiders.map((rider: Rider) => (
                      <RiderCard
                        key={rider.id}
                        rider={rider}
                        isSelected={selectedRiders.some(r => r.id === rider.id)}
                        onClick={() => toggleRiderSelection(rider)}
                      />
                    ))}

                    {filteredRiders.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No riders found matching your search criteria.
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-5 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-heading font-bold text-xl text-secondary">YOUR TEAM</h3>
                  {userTeam && !isCreatingTeam && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCreateNewTeam}
                      className="text-xs"
                    >
                      Create New
                    </Button>
                  )}
                </div>
                
                {/* Team name input */}
                <div className="mb-4">
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Team Name</label>
                  <Input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full border-gray-300"
                    maxLength={30}
                  />
                </div>
                
                {/* Budget progress */}
                <div className="mb-5">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-gray-700">Budget Used</span>
                    <span className="font-accent font-semibold text-gray-700">
                      ${usedBudget.toLocaleString()} / ${totalBudget.toLocaleString()}
                    </span>
                  </div>
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div 
                      className={`h-full transition-all ${remainingBudget >= 0 ? 'bg-primary' : 'bg-destructive'}`}
                      style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                    />
                  </div>
                </div>
                
                {/* Team composition */}
                <TeamSummary 
                  selectedRiders={selectedRiders} 
                  toggleRiderSelection={toggleRiderSelection} 
                />
                
                {/* Action buttons */}
                <div className="mt-5 space-y-2">
                  <Button
                    className="w-full bg-secondary hover:bg-gray-800 text-white font-heading font-bold py-3 rounded-md transition duration-200"
                    disabled={!isTeamValid || (!isAuthenticated && !authLoading)}
                    onClick={handleSaveTeam}
                  >
                    {userTeam && !isCreatingTeam ? 'UPDATE TEAM' : 'SAVE TEAM'} ({selectedRiders.length}/6 RIDERS)
                  </Button>
                  
                  {isCreatingTeam && userTeam && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleCancelCreateTeam}
                    >
                      CANCEL
                    </Button>
                  )}
                  
                  {!isAuthenticated && !authLoading && (
                    <div className="text-center mt-2">
                      <p className="text-sm text-gray-600 mb-2">You need to log in to save your team</p>
                      <Link href="/api/login">
                        <a className="text-primary hover:underline">Log In</a>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
