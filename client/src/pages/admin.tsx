import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Race, Rider } from '@shared/schema';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { ImageUpload } from '@/components/ui/image-upload';

export default function Admin() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  // Race form state
  const [raceName, setRaceName] = useState('');
  const [location, setLocation] = useState('');
  const [country, setCountry] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('upcoming');
  const [imageUrl, setImageUrl] = useState('');
  const [isEditingRace, setIsEditingRace] = useState(false);
  const [editRaceId, setEditRaceId] = useState<number | null>(null);
  
  // Rider form state
  const [isEditingRider, setIsEditingRider] = useState(false);
  const [showAddRiderForm, setShowAddRiderForm] = useState(false);
  const [editRiderId, setEditRiderId] = useState<number | null>(null);
  const [riderName, setRiderName] = useState('');
  const [riderGender, setRiderGender] = useState('male');
  const [riderTeam, setRiderTeam] = useState('');
  const [riderCountry, setRiderCountry] = useState('');
  const [riderImage, setRiderImage] = useState('');
  const [riderCost, setRiderCost] = useState('');
  const [riderPoints, setRiderPoints] = useState('');
  
  // Fetch races
  const {
    data: races = [] as Race[],
    isLoading: isLoadingRaces,
    error: racesError
  } = useQuery<Race[]>({
    queryKey: ['/api/races'],
  });

  // Fetch riders
  const {
    data: riders = [] as Rider[],
    isLoading: isLoadingRiders,
    error: ridersError
  } = useQuery<Rider[]>({
    queryKey: ['/api/riders'],
  });

  // Import races from UCI API
  const importRacesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/admin/import-races', {
        method: 'POST',
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/races'] });
      toast({
        title: 'Success',
        description: 'Races imported successfully from UCI API',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to import races: ${error}`,
        variant: 'destructive',
      });
    },
  });

  // Import riders from UCI API
  const importRidersMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/admin/import-riders', {
        method: 'POST',
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/riders'] });
      toast({
        title: 'Success',
        description: 'Riders imported successfully from UCI API',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to import riders: ${error}`,
        variant: 'destructive',
      });
    },
  });

  // Add a new race
  const addRaceMutation = useMutation({
    mutationFn: async (raceData: any) => {
      const response = await apiRequest('/api/races', {
        method: 'POST',
        body: JSON.stringify(raceData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/races'] });
      toast({
        title: 'Success',
        description: 'Race added successfully',
      });
      // Reset form
      setRaceName('');
      setLocation('');
      setCountry('');
      setStartDate('');
      setEndDate('');
      setStatus('upcoming');
      setImageUrl('');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to add race: ${error}`,
        variant: 'destructive',
      });
    },
  });
  
  // Add a new rider
  const addRiderMutation = useMutation({
    mutationFn: async (riderData: any) => {
      const response = await apiRequest('/api/riders', {
        method: 'POST',
        body: JSON.stringify(riderData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/riders'] });
      toast({
        title: 'Success',
        description: 'Rider added successfully',
      });
      // Reset form
      setRiderName('');
      setRiderGender('male');
      setRiderTeam('');
      setRiderCountry('');
      setRiderImage('');
      setRiderCost('');
      setRiderPoints('');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to add rider: ${error}`,
        variant: 'destructive',
      });
    },
  });
  
  // Update a rider
  const updateRiderMutation = useMutation({
    mutationFn: async (riderData: any) => {
      const response = await apiRequest(`/api/riders/${riderData.id}`, {
        method: 'PUT',
        body: JSON.stringify(riderData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/riders'] });
      toast({
        title: 'Success',
        description: 'Rider updated successfully',
      });
      // Reset form
      setIsEditingRider(false);
      setEditRiderId(null);
      setRiderName('');
      setRiderGender('');
      setRiderTeam('');
      setRiderCountry('');
      setRiderImage('');
      setRiderCost('');
      setRiderPoints('');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update rider: ${error}`,
        variant: 'destructive',
      });
    },
  });
  
  // Update a race
  const updateRaceMutation = useMutation({
    mutationFn: async (raceData: any) => {
      const response = await apiRequest(`/api/races/${raceData.id}`, {
        method: 'PUT',
        body: JSON.stringify(raceData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/races'] });
      toast({
        title: 'Success',
        description: 'Race updated successfully',
      });
      // Reset form
      setIsEditingRace(false);
      setEditRaceId(null);
      setRaceName('');
      setLocation('');
      setCountry('');
      setStartDate('');
      setEndDate('');
      setStatus('upcoming');
      setImageUrl('');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update race: ${error}`,
        variant: 'destructive',
      });
    },
  });

  // Delete a race
  const deleteRaceMutation = useMutation({
    mutationFn: async (raceId: number) => {
      const response = await apiRequest(`/api/races/${raceId}`, {
        method: 'DELETE',
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/races'] });
      toast({
        title: 'Success',
        description: 'Race deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete race: ${error}`,
        variant: 'destructive',
      });
    },
  });

  // Handle race form submission
  const handleAddRace = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!raceName || !location || !country || !startDate || !endDate) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }
    
    const raceData = {
      name: raceName,
      location,
      country,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status,
      imageUrl: imageUrl || `https://source.unsplash.com/random/1200x800/?mountain,bike,${location}`,
    };
    
    addRaceMutation.mutate(raceData);
  };
  
  // Handle edit rider button click
  const handleEditRider = (rider: any) => {
    setIsEditingRider(true);
    setEditRiderId(rider.id);
    setRiderName(rider.name);
    setRiderGender(rider.gender);
    setRiderTeam(rider.team || '');
    setRiderCountry(rider.country || '');
    setRiderImage(rider.image || '');
    setRiderCost(rider.cost.toString());
    setRiderPoints((rider.points || 0).toString());
  };
  
  // Handle update rider form submission
  const handleUpdateRider = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!riderName || !riderGender || !riderCountry || !riderCost) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }
    
    const riderData = {
      id: editRiderId,
      name: riderName,
      gender: riderGender,
      team: riderTeam,
      country: riderCountry,
      image: riderImage,
      cost: parseInt(riderCost),
      points: parseInt(riderPoints) || 0,
    };
    
    updateRiderMutation.mutate(riderData);
  };
  
  // Handle add rider form submission
  const handleAddRider = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!riderName || !riderGender || !riderCountry || !riderCost) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }
    
    const riderData = {
      name: riderName,
      gender: riderGender,
      team: riderTeam,
      country: riderCountry,
      image: riderImage,
      cost: parseInt(riderCost),
      points: parseInt(riderPoints) || 0,
    };
    
    addRiderMutation.mutate(riderData);
  };
  
  // Cancel rider edit
  const cancelRiderEdit = () => {
    setIsEditingRider(false);
    setEditRiderId(null);
    setRiderName('');
    setRiderGender('');
    setRiderTeam('');
    setRiderCountry('');
    setRiderImage('');
    setRiderCost('');
    setRiderPoints('');
  };
  
  // Handle edit race button click
  const handleEditRace = (race: any) => {
    setIsEditingRace(true);
    setEditRaceId(race.id);
    setRaceName(race.name);
    setLocation(race.location);
    setCountry(race.country);
    setStatus(race.status);
    setImageUrl(race.imageUrl || '');
    
    // Format dates for input fields (YYYY-MM-DD)
    const startDateObj = new Date(race.startDate);
    const endDateObj = new Date(race.endDate);
    
    setStartDate(startDateObj.toISOString().split('T')[0]);
    setEndDate(endDateObj.toISOString().split('T')[0]);
  };
  
  // Handle update race form submission
  const handleUpdateRace = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!raceName || !location || !country || !startDate || !endDate) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }
    
    const raceData = {
      id: editRaceId,
      name: raceName,
      location,
      country,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status,
      imageUrl: imageUrl || `https://source.unsplash.com/random/1200x800/?mountain,bike,${location}`,
    };
    
    updateRaceMutation.mutate(raceData);
  };
  
  // Cancel race edit
  const cancelRaceEdit = () => {
    setIsEditingRace(false);
    setEditRaceId(null);
    setRaceName('');
    setLocation('');
    setCountry('');
    setStartDate('');
    setEndDate('');
    setStatus('upcoming');
    setImageUrl('');
  };

  // If not authenticated, show login prompt
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto py-10 text-center">
        <h1 className="text-3xl font-bold mb-4">Admin Area</h1>
        <p className="mb-4">You need to log in to access this area.</p>
        <Button asChild>
          <a href="/api/login">Log In</a>
        </Button>
      </div>
    );
  }
  
  // If not admin, show unauthorized message
  // In a real application, check for admin role
  // This is just a placeholder assuming user with specified ID is admin
  if (user && user.id !== "42624609") {
    return (
      <div className="container mx-auto py-10 text-center">
        <h1 className="text-3xl font-bold mb-4">Unauthorized</h1>
        <p>You do not have permission to access the admin area.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <Tabs defaultValue="import" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="import">Import Data</TabsTrigger>
          <TabsTrigger value="races">Manage Races</TabsTrigger>
          <TabsTrigger value="riders">Manage Riders</TabsTrigger>
          <TabsTrigger value="results">Manage Results</TabsTrigger>
        </TabsList>
        
        {/* Import Data Tab */}
        <TabsContent value="import">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Import Races from UCI API</CardTitle>
                <CardDescription>
                  Fetch and import race data from the official UCI MTB downhill calendar.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-4">
                  This will fetch downhill events from the UCI API and add them to your database.
                  Any existing races with the same name will be updated.
                </p>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => importRacesMutation.mutate()}
                  disabled={importRacesMutation.isPending}
                >
                  {importRacesMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    'Import Races'
                  )}
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Import Riders from UCI API</CardTitle>
                <CardDescription>
                  Fetch and import rider data from the official UCI MTB downhill rankings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-4">
                  This will fetch downhill riders from the UCI API and add them to your database.
                  Any existing riders with the same name will be updated.
                </p>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => importRidersMutation.mutate()}
                  disabled={importRidersMutation.isPending}
                >
                  {importRidersMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    'Import Riders'
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        {/* Manage Races Tab */}
        <TabsContent value="races">
          <div className="grid gap-6 md:grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle>Add New Race</CardTitle>
                <CardDescription>
                  Add a new race to the calendar manually.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isEditingRace ? (
                  // Edit Race Form
                  <form onSubmit={handleUpdateRace} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Race Name*</Label>
                        <Input 
                          id="name" 
                          value={raceName}
                          onChange={(e) => setRaceName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">Location*</Label>
                        <Input 
                          id="location" 
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Country*</Label>
                        <Input 
                          id="country" 
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">Status*</Label>
                        <Select value={status} onValueChange={setStatus}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="upcoming">Upcoming</SelectItem>
                            <SelectItem value="next">Next</SelectItem>
                            <SelectItem value="ongoing">Ongoing</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="startDate">Start Date*</Label>
                        <Input 
                          id="startDate" 
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endDate">End Date*</Label>
                        <Input 
                          id="endDate" 
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="imageUrl">Image URL</Label>
                        <Input 
                          id="imageUrl" 
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          placeholder="https://example.com/image.jpg"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Leave blank to use a random image based on location
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" type="button" onClick={cancelRaceEdit}>
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        disabled={updateRaceMutation.isPending}
                      >
                        {updateRaceMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          'Update Race'
                        )}
                      </Button>
                    </div>
                  </form>
                ) : (
                  // Add Race Form
                  <form onSubmit={handleAddRace} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Race Name*</Label>
                        <Input 
                          id="name" 
                          value={raceName}
                          onChange={(e) => setRaceName(e.target.value)}
                          placeholder="Fort William World Cup"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">Location*</Label>
                        <Input 
                          id="location" 
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="Fort William"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Country*</Label>
                        <Input 
                          id="country" 
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          placeholder="Scotland"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">Status*</Label>
                        <Select value={status} onValueChange={setStatus}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="upcoming">Upcoming</SelectItem>
                            <SelectItem value="next">Next</SelectItem>
                            <SelectItem value="ongoing">Ongoing</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="startDate">Start Date*</Label>
                        <Input 
                          id="startDate" 
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endDate">End Date*</Label>
                        <Input 
                          id="endDate" 
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="imageUrl">Image URL</Label>
                        <Input 
                          id="imageUrl" 
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          placeholder="https://example.com/image.jpg"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Leave blank to use a random image based on location
                        </p>
                      </div>
                    </div>
                    <Button 
                      type="submit"
                      disabled={addRaceMutation.isPending}
                      className="w-full"
                    >
                      {addRaceMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding Race...
                        </>
                      ) : (
                        'Add Race'
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Race List</CardTitle>
                <CardDescription>
                  View and manage existing races.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingRaces ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : racesError ? (
                  <div className="text-center py-8 text-red-500">
                    Error loading races
                  </div>
                ) : !races || races.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No races found. Add a race or import from UCI API.
                  </div>
                ) : (
                  <Table>
                    <TableCaption>List of all races</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {races.map((race: any) => (
                        <TableRow key={race.id}>
                          <TableCell className="font-medium">{race.name}</TableCell>
                          <TableCell>{race.location}, {race.country}</TableCell>
                          <TableCell>
                            {new Date(race.startDate).toLocaleDateString()} - {new Date(race.endDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                              race.status === 'next' 
                                ? 'bg-blue-100 text-blue-800' 
                                : race.status === 'ongoing' 
                                ? 'bg-green-100 text-green-800' 
                                : race.status === 'completed' 
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {race.status.charAt(0).toUpperCase() + race.status.slice(1)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="mr-2"
                              onClick={() => handleEditRace(race)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this race?')) {
                                  deleteRaceMutation.mutate(race.id);
                                }
                              }}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Manage Riders Tab */}
        <TabsContent value="riders">
          <div className="grid gap-6">
            {/* Add/Edit Rider Form */}
            {(isEditingRider || showAddRiderForm) ? (
              <Card>
                <CardHeader>
                  <CardTitle>{isEditingRider ? 'Edit Rider' : 'Add Rider'}</CardTitle>
                  <CardDescription>{isEditingRider ? 'Update rider information' : 'Add a new rider to the database'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={isEditingRider ? handleUpdateRider : handleAddRider} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="riderName">Name*</Label>
                        <Input 
                          id="riderName" 
                          value={riderName}
                          onChange={(e) => setRiderName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="riderGender">Gender*</Label>
                        <Select value={riderGender} onValueChange={setRiderGender}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="riderTeam">Team</Label>
                        <Input 
                          id="riderTeam" 
                          value={riderTeam}
                          onChange={(e) => setRiderTeam(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="riderCountry">Country*</Label>
                        <Input 
                          id="riderCountry" 
                          value={riderCountry}
                          onChange={(e) => setRiderCountry(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="riderCost">Cost* (in $)</Label>
                        <Input 
                          id="riderCost" 
                          type="number"
                          value={riderCost}
                          onChange={(e) => setRiderCost(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="riderPoints">Points</Label>
                        <Input 
                          id="riderPoints" 
                          type="number"
                          value={riderPoints}
                          onChange={(e) => setRiderPoints(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="riderImage">Image URL</Label>
                        <Input 
                          id="riderImage" 
                          value={riderImage}
                          onChange={(e) => setRiderImage(e.target.value)}
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        type="button" 
                        onClick={() => {
                          if (isEditingRider) {
                            cancelRiderEdit();
                          } else {
                            setShowAddRiderForm(false);
                            setRiderName('');
                            setRiderGender('male');
                            setRiderTeam('');
                            setRiderCountry('');
                            setRiderImage('');
                            setRiderCost('');
                            setRiderPoints('');
                          }
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        disabled={isEditingRider ? updateRiderMutation.isPending : addRiderMutation.isPending}
                      >
                        {isEditingRider ? (
                          updateRiderMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            'Update Rider'
                          )
                        ) : (
                          addRiderMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            'Add Rider'
                          )
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ) : null}
            
            {/* Rider List */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Rider List</CardTitle>
                    <CardDescription>View and manage riders</CardDescription>
                  </div>
                  {!showAddRiderForm && !isEditingRider && (
                    <Button
                      onClick={() => {
                        setIsEditingRider(false);
                        setEditRiderId(null);
                        setRiderName('');
                        setRiderGender('male');
                        setRiderTeam('');
                        setRiderCountry('');
                        setRiderImage('');
                        setRiderCost('');
                        setRiderPoints('');
                        
                        // Open Add Rider form
                        setShowAddRiderForm(true);
                      }}
                    >
                      Add Rider
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingRiders ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : ridersError ? (
                  <div className="text-center py-8 text-red-500">
                    Error loading riders
                  </div>
                ) : !riders || riders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No riders found. Import from UCI API.
                  </div>
                ) : (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-500">Total Riders: {riders.length}</h3>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <Table>
                        <TableCaption>List of all riders</TableCaption>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Gender</TableHead>
                            <TableHead>Team</TableHead>
                            <TableHead>Country</TableHead>
                            <TableHead>Cost</TableHead>
                            <TableHead>Points</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {riders.map((rider: any) => (
                            <TableRow key={rider.id}>
                              <TableCell className="font-medium">{rider.name}</TableCell>
                              <TableCell>{rider.gender}</TableCell>
                              <TableCell>{rider.team}</TableCell>
                              <TableCell>{rider.country}</TableCell>
                              <TableCell>${(rider.cost / 1000).toFixed(0)}k</TableCell>
                              <TableCell>{rider.points}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mr-2"
                                  onClick={() => handleEditRider(rider)}
                                >
                                  Edit
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Manage Results Tab */}
        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>Race Results</CardTitle>
              <CardDescription>
                Add and manage race results.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <h3 className="text-lg font-medium mb-2">Results Management</h3>
                <p className="text-gray-500 mb-4">
                  This feature will be implemented soon. You'll be able to:
                </p>
                <ul className="list-disc list-inside mb-4 text-left max-w-md mx-auto">
                  <li>Enter race results manually</li>
                  <li>Import results from UCI API</li>
                  <li>Calculate fantasy points based on results</li>
                  <li>Update leaderboard automatically</li>
                </ul>
                <Button disabled>Coming Soon</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}