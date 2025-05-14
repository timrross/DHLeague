import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Race, Rider, User } from '@shared/schema';

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
import { Loader2, UserCog, Edit, Trash, Check, X, Pencil, RefreshCw } from 'lucide-react';
import { ImageUpload } from '@/components/ui/image-upload';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

export default function Admin() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // User management state
  const [selectedUser, setSelectedUser] = useState<UserWithTeam | null>(null);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editUserData, setEditUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    isAdmin: false,
    isActive: true
  });

  // Define extended user interface that includes team info
  interface UserWithTeam extends User {
    team?: {
      id: number;
      name: string;
      totalPoints: number;
      userId: string;
      riders: any[];
    };
  }
  
  // Fetch users
  const {
    data: users = [] as UserWithTeam[],
    isLoading: isLoadingUsers,
    error: usersError,
    refetch: refetchUsers
  } = useQuery<UserWithTeam[]>({
    queryKey: ['/api/admin/users'],
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });

  // Update user
  const updateUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await apiRequest(`/api/admin/users/${userData.id}`, {
        method: 'PATCH',
        body: JSON.stringify(userData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response;
    },
    onSuccess: () => {
      // Refresh data
      refetchUsers();
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      toast({
        title: 'Success',
        description: 'User updated successfully',
      });
      setIsEditingUser(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update user: ${error}`,
        variant: 'destructive',
      });
    },
  });

  // Delete user
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      return response;
    },
    onSuccess: () => {
      // Force refetch users list
      refetchUsers();
      
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete user: ${error}`,
        variant: 'destructive',
      });
    },
  });

  // Edit user handler
  const handleEditUser = (userData: UserWithTeam) => {
    setSelectedUser(userData);
    setEditUserData({
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      email: userData.email || '',
      isAdmin: userData.isAdmin || false,
      isActive: userData.isActive !== false // Default to true if not explicitly false
    });
    setIsEditingUser(true);
  };

  // Update user handler
  const handleUpdateUser = () => {
    if (!selectedUser) return;
    
    updateUserMutation.mutate({
      id: selectedUser.id,
      ...editUserData
    });
  };

  // Delete user handler
  const handleDeleteUser = () => {
    if (!selectedUser) return;
    deleteUserMutation.mutate(selectedUser.id);
  };
  
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
  const [inlineEditRiderId, setInlineEditRiderId] = useState<number | null>(null);
  const [riderName, setRiderName] = useState('');
  const [riderGender, setRiderGender] = useState('male');
  const [riderTeam, setRiderTeam] = useState('');
  const [riderCountry, setRiderCountry] = useState('');
  const [riderImage, setRiderImage] = useState('');
  const [riderCost, setRiderCost] = useState('');
  const [riderPoints, setRiderPoints] = useState('');
  
  // Inline edit state
  const [inlineEditData, setInlineEditData] = useState({
    name: '',
    gender: 'male',
    team: '',
    country: '',
    image: '',
    cost: '',
    points: '',
  });
  
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
  
  // Handle edit rider button click (for top form)
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
  
  // Handle inline editing for a rider in the table
  const handleInlineEditStart = (rider: any) => {
    setInlineEditRiderId(rider.id);
    setInlineEditData({
      name: rider.name,
      gender: rider.gender,
      team: rider.team || '',
      country: rider.country || '',
      image: rider.image || '',
      cost: rider.cost.toString(),
      points: (rider.points || 0).toString(),
    });
  };
  
  // Handle inline edit cancel
  const handleInlineEditCancel = () => {
    setInlineEditRiderId(null);
  };
  
  // Handle inline edit save
  const handleInlineEditSave = (riderId: number) => {
    const riderData = {
      id: riderId,
      name: inlineEditData.name,
      gender: inlineEditData.gender,
      team: inlineEditData.team,
      country: inlineEditData.country,
      image: inlineEditData.image,
      cost: parseInt(inlineEditData.cost),
      points: parseInt(inlineEditData.points) || 0,
    };
    
    updateRiderMutation.mutate(riderData);
    setInlineEditRiderId(null);
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
  if (user && !user.isAdmin) {
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
      
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="users">Manage Users</TabsTrigger>
          <TabsTrigger value="import">Import Data</TabsTrigger>
          <TabsTrigger value="races">Manage Races</TabsTrigger>
          <TabsTrigger value="riders">Manage Riders</TabsTrigger>
          <TabsTrigger value="results">Manage Results</TabsTrigger>
        </TabsList>
        
        {/* User Management Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <UserCog className="h-5 w-5" />
                  <span>User Management</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    refetchUsers();
                    toast({
                      title: "Refreshing",
                      description: "User list refreshed"
                    });
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </CardTitle>
              <CardDescription>
                Manage all users, control access permissions, and moderate fantasy teams.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : usersError ? (
                <div className="text-center py-10 text-destructive">
                  <p>Error loading users. Please try again.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((userData: any) => (
                        <TableRow key={userData.id}>
                          <TableCell className="font-mono text-xs">{userData.id}</TableCell>
                          <TableCell>
                            {userData.firstName || userData.lastName ? (
                              `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
                            ) : (
                              <span className="text-muted-foreground italic">Not set</span>
                            )}
                          </TableCell>
                          <TableCell>{userData.email || <span className="text-muted-foreground italic">No email</span>}</TableCell>
                          <TableCell>
                            {userData.isActive !== false ? (
                              <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>
                            ) : (
                              <Badge variant="destructive" className="bg-red-100 text-red-800">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {userData.isAdmin ? (
                              <Badge className="bg-purple-100 text-purple-800">Admin</Badge>
                            ) : (
                              <Badge variant="outline">User</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {userData.team ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                {userData.team.name}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground italic">No team</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditUser(userData)}
                                title="Edit User"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog open={isDeleteDialogOpen && selectedUser?.id === userData.id} onOpenChange={setIsDeleteDialogOpen}>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => setSelectedUser(userData)}
                                    title="Delete User"
                                    disabled={userData.id === user?.id}
                                  >
                                    <Trash className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete the user account for{' '}
                                      <span className="font-bold">
                                        {selectedUser?.firstName || selectedUser?.email || selectedUser?.id}
                                      </span>
                                      {selectedUser?.team ? (
                                        <> and their team <span className="font-bold">{selectedUser.team.name}</span></>
                                      ) : null}
                                      . This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={handleDeleteUser}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      {deleteUserMutation.isPending ? (
                                        <>
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          Deleting...
                                        </>
                                      ) : (
                                        "Delete User"
                                      )}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {/* Edit User Dialog */}
                  <Dialog open={isEditingUser} onOpenChange={setIsEditingUser}>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>
                          Make changes to user profile and permissions
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="firstName" className="text-right">
                            First Name
                          </Label>
                          <Input
                            id="firstName"
                            value={editUserData.firstName}
                            onChange={(e) => setEditUserData({...editUserData, firstName: e.target.value})}
                            className="col-span-3"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="lastName" className="text-right">
                            Last Name
                          </Label>
                          <Input
                            id="lastName"
                            value={editUserData.lastName}
                            onChange={(e) => setEditUserData({...editUserData, lastName: e.target.value})}
                            className="col-span-3"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="email" className="text-right">
                            Email
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            value={editUserData.email}
                            onChange={(e) => setEditUserData({...editUserData, email: e.target.value})}
                            className="col-span-3"
                          />
                        </div>
                        <Separator />
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="isActive" className="text-right">
                            Status
                          </Label>
                          <div className="flex items-center gap-2 col-span-3">
                            <Switch
                              id="isActive"
                              checked={editUserData.isActive}
                              onCheckedChange={(checked) => setEditUserData({...editUserData, isActive: checked})}
                            />
                            <Label htmlFor="isActive" className="cursor-pointer">
                              {editUserData.isActive ? 'Active' : 'Inactive'}
                            </Label>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="isAdmin" className="text-right">
                            Admin Role
                          </Label>
                          <div className="flex items-center gap-2 col-span-3">
                            <Switch
                              id="isAdmin"
                              checked={editUserData.isAdmin}
                              onCheckedChange={(checked) => setEditUserData({...editUserData, isAdmin: checked})}
                            />
                            <Label htmlFor="isAdmin" className="cursor-pointer">
                              {editUserData.isAdmin ? 'Admin' : 'Standard User'}
                            </Label>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditingUser(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleUpdateUser} disabled={updateUserMutation.isPending}>
                          {updateUserMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Changes"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
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
                        <Label htmlFor="riderImage">Rider Image</Label>
                        <ImageUpload
                          currentImage={riderImage}
                          onImageChange={(url) => setRiderImage(url)}
                          name={riderName}
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
                            <TableHead>Rider</TableHead>
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
                            <TableRow key={rider.id} className={inlineEditRiderId === rider.id ? 'bg-accent/20' : ''}>
                              {inlineEditRiderId === rider.id ? (
                                // INLINE EDIT MODE
                                <>
                                  <TableCell>
                                    <div className="flex flex-col gap-2 min-w-[200px]">
                                      <div className="flex items-center gap-2">
                                        {rider.image ? (
                                          <div className="h-10 w-10 rounded-full overflow-hidden border">
                                            <img 
                                              src={rider.image} 
                                              alt={rider.name}
                                              className="h-full w-full object-cover"
                                              onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.onerror = null;
                                                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(rider.name)}&background=random`;
                                              }}
                                            />
                                          </div>
                                        ) : (
                                          <div className="h-10 w-10 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center text-primary font-medium">
                                            {rider.name.split(' ').map((n: string) => n[0]).join('')}
                                          </div>
                                        )}
                                        <Input
                                          value={inlineEditData.name}
                                          onChange={(e) => setInlineEditData({...inlineEditData, name: e.target.value})}
                                          className="w-full"
                                        />
                                      </div>
                                      <div className="flex gap-2 items-center">
                                        <Label htmlFor={`rider-${rider.id}-image`} className="text-xs">Image URL</Label>
                                        <Input
                                          id={`rider-${rider.id}-image`}
                                          value={inlineEditData.image}
                                          onChange={(e) => setInlineEditData({...inlineEditData, image: e.target.value})}
                                          className="text-xs"
                                          placeholder="https://example.com/image.jpg"
                                        />
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Select 
                                      value={inlineEditData.gender} 
                                      onValueChange={(value) => setInlineEditData({...inlineEditData, gender: value})}
                                    >
                                      <SelectTrigger className="w-24">
                                        <SelectValue placeholder="Gender" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="male">Male</SelectItem>
                                        <SelectItem value="female">Female</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      value={inlineEditData.team}
                                      onChange={(e) => setInlineEditData({...inlineEditData, team: e.target.value})}
                                      className="w-full"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      value={inlineEditData.country}
                                      onChange={(e) => setInlineEditData({...inlineEditData, country: e.target.value})}
                                      className="w-full"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      value={inlineEditData.cost}
                                      onChange={(e) => setInlineEditData({...inlineEditData, cost: e.target.value})}
                                      className="w-24"
                                      type="number"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      value={inlineEditData.points}
                                      onChange={(e) => setInlineEditData({...inlineEditData, points: e.target.value})}
                                      className="w-24"
                                      type="number"
                                    />
                                  </TableCell>
                                  <TableCell className="text-right space-x-1">
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => handleInlineEditSave(rider.id)}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={handleInlineEditCancel}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </>
                              ) : (
                                // NORMAL VIEW MODE
                                <>
                                  <TableCell>
                                    <div className="flex items-center gap-3">
                                      {rider.image ? (
                                        <div className="h-10 w-10 rounded-full overflow-hidden border">
                                          <img 
                                            src={rider.image} 
                                            alt={rider.name}
                                            className="h-full w-full object-cover"
                                            onError={(e) => {
                                              const target = e.target as HTMLImageElement;
                                              target.onerror = null;
                                              target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(rider.name)}&background=random`;
                                            }}
                                          />
                                        </div>
                                      ) : (
                                        <div className="h-10 w-10 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center text-primary font-medium">
                                          {rider.name.split(' ').map((n: string) => n[0]).join('')}
                                        </div>
                                      )}
                                      <span className="font-medium">{rider.name}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>{rider.gender === 'male' ? 'Male' : 'Female'}</TableCell>
                                  <TableCell>{rider.team || '-'}</TableCell>
                                  <TableCell>{rider.country || '-'}</TableCell>
                                  <TableCell>${(rider.cost / 1000).toFixed(0)}k</TableCell>
                                  <TableCell>{rider.points || 0}</TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleInlineEditStart(rider)}
                                      title="Edit in row"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </>
                              )}
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