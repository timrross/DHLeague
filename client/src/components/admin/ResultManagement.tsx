import React, { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Race, Rider, Result } from '@shared/schema';
import { safeImageUrl } from '@/lib/utils';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export default function ResultManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Result form state
  const [selectedRace, setSelectedRace] = useState<string>('');
  const [selectedRider, setSelectedRider] = useState<string>('');
  const [position, setPosition] = useState<string>('');
  const [qualifyingPosition, setQualifyingPosition] = useState<string>('');
  const [points, setPoints] = useState<string>('');
  const [selectedRaceDetails, setSelectedRaceDetails] = useState<Race | null>(null);
  const [filteredRiders, setFilteredRiders] = useState<Rider[]>([]);

  // Fetch races
  const {
    data: races = [],
    isLoading: isLoadingRaces,
  } = useQuery<Race[]>({
    queryKey: ['/api/races'],
  });

  // Fetch riders
  const {
    data: ridersData,
    isLoading: isLoadingRiders,
  } = useQuery({
    queryKey: ['/api/riders'],
  });

  const riderList = useMemo(() => {
    if (Array.isArray(ridersData)) {
      return ridersData as Rider[];
    }
    if (
      ridersData &&
      typeof ridersData === "object" &&
      Array.isArray((ridersData as { data?: Rider[] }).data)
    ) {
      return (ridersData as { data?: Rider[] }).data ?? [];
    }
    return [];
  }, [ridersData]);

  // Fetch race results when a race is selected
  const {
    data: raceResults = [],
    isLoading: isLoadingResults,
    refetch: refetchResults
  } = useQuery<(Result & { rider: Rider })[]>({
    queryKey: [selectedRace ? `/api/races/${selectedRace}/results` : '/api/races/0/results'],
    enabled: !!selectedRace,
  });

  // Add result mutation
  const addResultMutation = useMutation({
    mutationFn: async (payload: { raceId: number; riderId: number; position: number; points: number }) => {
      return apiRequest(`/api/races/${payload.raceId}/results`, {
        method: 'POST',
        body: JSON.stringify({
          riderId: payload.riderId,
          position: payload.position,
          points: payload.points,
        }),
      });
    },
    onSuccess: () => {
      // Reset form
      setSelectedRider('');
      setPosition('');
      setQualifyingPosition('');
      setPoints('');
      
      // Refetch results and update leaderboard
      refetchResults();
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
      
      toast({
        title: 'Success',
        description: 'Result added successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to add result: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  });

  // Update team points mutation
  const updateTeamPointsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/admin/update-team-points', {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
      toast({
        title: 'Success',
        description: 'Team points updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to update team points: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  });

  // When a race is selected, get its details
  useEffect(() => {
    if (selectedRace) {
      const race = races.find((r) => r.id.toString() === selectedRace);
      setSelectedRaceDetails(race || null);
    } else {
      setSelectedRaceDetails(null);
    }
  }, [selectedRace, races]);

  // Filter riders by gender
  useEffect(() => {
    if (selectedRaceDetails) {
      // No filtering needed, all riders are eligible for results
      setFilteredRiders(riderList);
    } else {
      setFilteredRiders([]);
    }
  }, [selectedRaceDetails, riderList]);

  // Handle add result form submission
  const handleAddResult = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRace || !selectedRider || !position) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }
    
    const resultData = {
      raceId: parseInt(selectedRace, 10),
      riderId: parseInt(selectedRider, 10),
      position: parseInt(position, 10),
      points: points ? parseInt(points, 10) : 0, // default to 0 if not provided
    };
    
    addResultMutation.mutate(resultData);
  };

  // Handle update team points
  const handleUpdateTeamPoints = () => {
    updateTeamPointsMutation.mutate();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Manage Results</CardTitle>
          <CardDescription>
            Add race results and update team points.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Add Result Form */}
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <h3 className="text-sm font-medium mb-4">Add Race Result</h3>
              
              <form onSubmit={handleAddResult} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="race">Select Race*</Label>
                  <Select value={selectedRace} onValueChange={setSelectedRace}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a race" />
                    </SelectTrigger>
                    <SelectContent>
                      {races.map((race: any) => (
                        <SelectItem key={race.id} value={race.id.toString()}>
                          {race.name} ({race.location})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedRaceDetails && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="rider">Select Rider*</Label>
                      <Select value={selectedRider} onValueChange={setSelectedRider}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a rider" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredRiders.map((rider: any) => (
                            <SelectItem key={rider.id} value={rider.id.toString()}>
                              {rider.name} ({rider.gender === 'female' ? 'F' : 'M'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="position">Final Position*</Label>
                        <Input 
                          id="position" 
                          type="number"
                          min="1"
                          placeholder="1"
                          value={position}
                          onChange={(e) => setPosition(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="qualifyingPosition">Qualifying Position</Label>
                        <Input 
                          id="qualifyingPosition" 
                          type="number"
                          min="1"
                          placeholder="1"
                          value={qualifyingPosition}
                          onChange={(e) => setQualifyingPosition(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="points">Points (Optional)</Label>
                        <Input 
                          id="points" 
                          type="number"
                          min="0"
                          placeholder="Auto-calculate"
                          value={points}
                          onChange={(e) => setPoints(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <Button 
                      type="submit"
                      disabled={addResultMutation.isPending || !selectedRider}
                    >
                      {addResultMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding Result...
                        </>
                      ) : (
                        'Add Result'
                      )}
                    </Button>
                  </>
                )}
              </form>
            </div>
            
            {/* Update Team Points */}
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <h3 className="text-sm font-medium mb-2">Update Team Points</h3>
              <p className="text-sm text-gray-500 mb-4">
                Recalculate all team points based on rider results. Use this after adding race results.
              </p>
              <Button 
                onClick={handleUpdateTeamPoints}
                disabled={updateTeamPointsMutation.isPending}
                variant="secondary"
                className="w-full"
              >
                {updateTeamPointsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Points...
                  </>
                ) : (
                  'Update Team Points'
                )}
              </Button>
            </div>
            
            {/* Results Table */}
            {selectedRaceDetails && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Results for {selectedRaceDetails.name}</h3>
                
                {isLoadingResults ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : raceResults.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No results found for this race.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Position</TableHead>
                        <TableHead>Rider</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead>Qualifying</TableHead>
                        <TableHead>Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {raceResults.map((result: any) => {
                        const imageSrc = safeImageUrl(result?.rider?.image);
                        return (
                          <TableRow key={result.id}>
                            <TableCell className="font-medium">{result.position}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {imageSrc ? (
                                  <img 
                                    src={imageSrc}
                                    alt={result.rider.name}
                                    className="h-6 w-6 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">
                                    {result.rider.name.split(' ').map((n: string) => n[0]).join('')}
                                  </div>
                                )}
                                <span>{result.rider.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                                result.rider.gender === 'female' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {result.rider.gender === 'female' ? 'F' : 'M'}
                              </span>
                            </TableCell>
                            <TableCell>{result.rider.team || '-'}</TableCell>
                            <TableCell>{result.qualifyingPosition || '-'}</TableCell>
                            <TableCell className="font-mono">{result.points}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
