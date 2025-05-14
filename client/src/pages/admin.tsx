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
import { Loader2, UserCog, Edit, Trash, Check, X, Pencil, RefreshCw, Upload, Trash2, Plus } from 'lucide-react';
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
  
  // Rider management state
  const [showAddRiderForm, setShowAddRiderForm] = useState(false);
  const [isEditingRider, setIsEditingRider] = useState(false);
  const [editRiderId, setEditRiderId] = useState<number | null>(null);
  const [riderName, setRiderName] = useState('');
  const [riderGender, setRiderGender] = useState('male');
  const [riderTeam, setRiderTeam] = useState('');
  const [riderCountry, setRiderCountry] = useState('');
  const [riderImage, setRiderImage] = useState('');
  const [riderCost, setRiderCost] = useState('50000');
  const [riderPoints, setRiderPoints] = useState('0');
  
  // Inline rider editing
  const [inlineEditRiderId, setInlineEditRiderId] = useState<number | null>(null);
  const [inlineEditData, setInlineEditData] = useState<Partial<Rider>>({});
  
  // Race management state
  const [showAddRaceForm, setShowAddRaceForm] = useState(false);
  const [raceName, setRaceName] = useState('');
  const [location, setLocation] = useState('');
  const [country, setCountry] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  // Inline race editing
  const [inlineEditRaceId, setInlineEditRaceId] = useState<number | null>(null);
  const [inlineRaceEditData, setInlineRaceEditData] = useState<Partial<Race>>({});
  
  // Fetch users
  const {
    data: users = [] as UserWithTeam[],
    isLoading: isLoadingUsers,
    error: usersError
  } = useQuery({
    queryKey: ['/api/admin/users'],
    retry: false
  });

  // Fetch riders
  const {
    data: riders = [] as Rider[],
    isLoading: isLoadingRiders,
    error: ridersError
  } = useQuery({
    queryKey: ['/api/riders'],
    retry: false
  });

  // Fetch races
  const {
    data: races = [] as Race[],
    isLoading: isLoadingRaces,
    error: racesError
  } = useQuery({
    queryKey: ['/api/races'],
    retry: false
  });

  // Handle user edit
  const handleEditUser = (userData: UserWithTeam) => {
    setSelectedUser(userData);
    setEditUserData({
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      email: userData.email || '',
      isAdmin: userData.isAdmin || false,
      isActive: userData.isActive !== false // default to true if not specified
    });
    setIsEditingUser(true);
  };

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, userData }: { id: string; userData: Partial<User> }) => {
      return await apiRequest(`/api/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(userData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setIsEditingUser(false);
      toast({
        title: "User Updated",
        description: "User information has been updated successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update user information",
        variant: "destructive"
      });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/admin/users/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      toast({
        title: "User Deleted",
        description: "User has been deleted successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete user",
        variant: "destructive"
      });
    }
  });

  // Handle user form submission
  const handleUserFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
      updateUserMutation.mutate({
        id: selectedUser.id,
        userData: editUserData
      });
    }
  };
  
  // Add rider mutation
  const addRiderMutation = useMutation({
    mutationFn: async (riderData: any) => {
      return await apiRequest('/api/riders', {
        method: 'POST',
        body: JSON.stringify(riderData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/riders'] });
      setShowAddRiderForm(false);
      resetRiderForm();
      toast({
        title: "Rider Added",
        description: "Rider has been added successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Add Rider",
        description: "There was an error adding the rider",
        variant: "destructive"
      });
    }
  });

  // Update rider mutation
  const updateRiderMutation = useMutation({
    mutationFn: async ({ id, riderData }: { id: number; riderData: any }) => {
      return await apiRequest(`/api/riders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(riderData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/riders'] });
      setIsEditingRider(false);
      setEditRiderId(null);
      resetRiderForm();
      setInlineEditRiderId(null);
      toast({
        title: "Rider Updated",
        description: "Rider information has been updated successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update rider information",
        variant: "destructive"
      });
    }
  });

  // Delete all riders mutation
  const deleteAllRidersMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/riders/all', {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/riders'] });
      toast({
        title: "All Riders Deleted",
        description: "All riders have been deleted successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete all riders",
        variant: "destructive"
      });
    }
  });
  
  // Add race mutation
  const addRaceMutation = useMutation({
    mutationFn: async (raceData: any) => {
      return await apiRequest('/api/races', {
        method: 'POST',
        body: JSON.stringify(raceData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/races'] });
      setShowAddRaceForm(false);
      resetRaceForm();
      toast({
        title: "Race Added",
        description: "Race has been added successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Add Race",
        description: "There was an error adding the race",
        variant: "destructive"
      });
    }
  });

  // Update race mutation
  const updateRaceMutation = useMutation({
    mutationFn: async ({ id, raceData }: { id: number; raceData: any }) => {
      return await apiRequest(`/api/races/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(raceData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/races'] });
      setInlineEditRaceId(null);
      toast({
        title: "Race Updated",
        description: "Race information has been updated successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update race information",
        variant: "destructive"
      });
    }
  });

  // Delete race mutation
  const deleteRaceMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/races/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/races'] });
      toast({
        title: "Race Deleted",
        description: "Race has been deleted successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete race",
        variant: "destructive"
      });
    }
  });

  // Reset rider form
  const resetRiderForm = () => {
    setRiderName('');
    setRiderGender('male');
    setRiderTeam('');
    setRiderCountry('');
    setRiderImage('');
    setRiderCost('50000');
    setRiderPoints('0');
  };
  
  // Reset race form
  const resetRaceForm = () => {
    setRaceName('');
    setLocation('');
    setCountry('');
    setStartDate('');
    setEndDate('');
    setImageUrl('');
  };

  // Handle edit rider
  const handleEditRider = (rider: Rider) => {
    setIsEditingRider(true);
    setEditRiderId(rider.id);
    setRiderName(rider.name);
    setRiderGender(rider.gender);
    setRiderTeam(rider.team || '');
    setRiderCountry(rider.country || '');
    setRiderImage(rider.imageUrl || '');
    setRiderCost(rider.cost.toString());
    setRiderPoints(rider.points.toString());
    setShowAddRiderForm(true);
  };

  // Cancel rider edit
  const cancelRiderEdit = () => {
    setIsEditingRider(false);
    setEditRiderId(null);
    resetRiderForm();
    setShowAddRiderForm(false);
  };

  // Handle add rider
  const handleAddRider = (e: React.FormEvent) => {
    e.preventDefault();
    const riderData = {
      name: riderName,
      gender: riderGender,
      team: riderTeam,
      country: riderCountry,
      imageUrl: riderImage,
      cost: parseInt(riderCost),
      points: parseInt(riderPoints)
    };
    addRiderMutation.mutate(riderData);
  };

  // Handle update rider
  const handleUpdateRider = (e: React.FormEvent) => {
    e.preventDefault();
    if (editRiderId) {
      const riderData = {
        name: riderName,
        gender: riderGender,
        team: riderTeam,
        country: riderCountry,
        imageUrl: riderImage,
        cost: parseInt(riderCost),
        points: parseInt(riderPoints)
      };
      updateRiderMutation.mutate({
        id: editRiderId,
        riderData
      });
    }
  };

  // Inline editing for riders
  const handleInlineEditStart = (rider: Rider) => {
    setInlineEditRiderId(rider.id);
    setInlineEditData({
      name: rider.name,
      gender: rider.gender,
      team: rider.team,
      country: rider.country,
      imageUrl: rider.imageUrl,
      cost: rider.cost,
      points: rider.points
    });
  };

  // Handle inline edit cancel
  const handleInlineEditCancel = () => {
    setInlineEditRiderId(null);
    setInlineEditData({});
  };

  // Handle inline edit save
  const handleInlineEditSave = () => {
    if (inlineEditRiderId) {
      updateRiderMutation.mutate({
        id: inlineEditRiderId,
        riderData: inlineEditData
      });
    }
  };
  
  // Handle inline race edit start
  const handleInlineRaceEditStart = (race: Race) => {
    setInlineEditRaceId(race.id);
    setInlineRaceEditData({
      name: race.name,
      location: race.location,
      country: race.country,
      startDate: race.startDate,
      endDate: race.endDate,
      imageUrl: race.imageUrl
    });
  };

  // Handle inline race edit cancel
  const handleInlineRaceEditCancel = () => {
    setInlineEditRaceId(null);
    setInlineRaceEditData({});
  };

  // Handle inline race edit save
  const handleInlineRaceEditSave = () => {
    if (inlineEditRaceId) {
      updateRaceMutation.mutate({
        id: inlineEditRaceId,
        raceData: inlineRaceEditData
      });
    }
  };

  // Handle add race
  const handleAddRace = (e: React.FormEvent) => {
    e.preventDefault();
    addRaceMutation.mutate({
      name: raceName,
      location,
      country,
      startDate,
      endDate,
      imageUrl: imageUrl || null
    });
  };

  // Redirect if not admin
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You need to be logged in to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/api/login'}>
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isAuthenticated && user && !user.isAdmin) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You need administrator privileges to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/'}>
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="races">Races</TabsTrigger>
          <TabsTrigger value="riders">Riders</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        {/* Manage Users Tab */}
        <TabsContent value="users">
          <div className="grid gap-6 md:grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage user accounts and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingUsers ? (
                  <div className="text-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    <p className="mt-2 text-sm text-gray-500">Loading users...</p>
                  </div>
                ) : usersError ? (
                  <div className="text-center py-10">
                    <p className="text-red-500">Error loading users</p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-gray-500">No users found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="font-medium">{user.firstName} {user.lastName}</div>
                            {user.isAdmin && (
                              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                                Admin
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.team?.name || '-'}</TableCell>
                          <TableCell>{user.team?.totalPoints || 0}</TableCell>
                          <TableCell>
                            {user.isActive !== false ? (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                Active
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                                Inactive
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEditUser(user)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                setSelectedUser(user);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash className="h-4 w-4" />
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

          {/* Edit User Dialog */}
          <Dialog open={isEditingUser} onOpenChange={setIsEditingUser}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>
                  Update user information and permissions
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUserFormSubmit}>
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
                      value={editUserData.email}
                      onChange={(e) => setEditUserData({...editUserData, email: e.target.value})}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="isAdmin" className="text-right">
                      Admin
                    </Label>
                    <div className="col-span-3 flex items-center space-x-2">
                      <Switch
                        id="isAdmin"
                        checked={editUserData.isAdmin}
                        onCheckedChange={(checked) => setEditUserData({...editUserData, isAdmin: checked})}
                      />
                      <Label htmlFor="isAdmin">
                        {editUserData.isAdmin ? 'Yes' : 'No'}
                      </Label>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="isActive" className="text-right">
                      Active
                    </Label>
                    <div className="col-span-3 flex items-center space-x-2">
                      <Switch
                        id="isActive"
                        checked={editUserData.isActive}
                        onCheckedChange={(checked) => setEditUserData({...editUserData, isActive: checked})}
                      />
                      <Label htmlFor="isActive">
                        {editUserData.isActive ? 'Yes' : 'No'}
                      </Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditingUser(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateUserMutation.isPending}>
                    {updateUserMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Delete User Dialog */}
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the user{selectedUser ? ` ${selectedUser.firstName} ${selectedUser.lastName}` : ''} and all their associated data.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => selectedUser && deleteUserMutation.mutate(selectedUser.id)}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={deleteUserMutation.isPending}
                >
                  {deleteUserMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>
        
        {/* Manage Races Tab */}
        <TabsContent value="races">
          <div className="grid gap-6 md:grid-cols-1">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>Race Management</CardTitle>
                  <CardDescription>
                    Add and manage races in the calendar
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAddRaceForm(!showAddRaceForm)}
                >
                  {showAddRaceForm ? (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Race
                    </>
                  )}
                </Button>
              </CardHeader>
              <CardContent>
                {showAddRaceForm && (
                  <form onSubmit={handleAddRace} className="space-y-4 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="add-race-name">Race Name*</Label>
                        <Input 
                          id="add-race-name" 
                          value={raceName}
                          onChange={(e) => setRaceName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="add-race-location">Location*</Label>
                        <Input 
                          id="add-race-location" 
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="add-race-country">Country*</Label>
                        <Input 
                          id="add-race-country" 
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status-info">Status</Label>
                        <div className="p-2 bg-gray-50 rounded-md border border-gray-200">
                          <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                            Automatic
                          </span>
                          <p className="text-xs text-gray-500 mt-2">
                            Race status will be automatically determined based on start and end dates
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="add-race-startDate">Start Date*</Label>
                        <Input 
                          id="add-race-startDate" 
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="add-race-endDate">End Date*</Label>
                        <Input 
                          id="add-race-endDate" 
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="add-race-imageUrl">Image URL</Label>
                        <Input 
                          id="add-race-imageUrl" 
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
                
                <div className="mt-4">
                  <Table>
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
                      {isLoadingRaces ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                            <p className="mt-2 text-sm text-gray-500">Loading races...</p>
                          </TableCell>
                        </TableRow>
                      ) : racesError ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10">
                            <p className="text-red-500">Error loading races</p>
                          </TableCell>
                        </TableRow>
                      ) : races.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10">
                            <p className="text-gray-500">No races found. Add a race to get started.</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        // Sort races by start date, earliest first
                        [...races]
                          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                          .map((race) => (
                            <TableRow key={race.id} className="group">
                              {inlineEditRaceId === race.id ? (
                                <>
                                  <TableCell>
                                    <Input 
                                      value={inlineRaceEditData.name as string || race.name}
                                      onChange={(e) => setInlineRaceEditData({
                                        ...inlineRaceEditData,
                                        name: e.target.value
                                      })}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col space-y-2">
                                      <Input 
                                        value={inlineRaceEditData.location as string || race.location}
                                        onChange={(e) => setInlineRaceEditData({
                                          ...inlineRaceEditData,
                                          location: e.target.value
                                        })}
                                        placeholder="Location"
                                      />
                                      <Input 
                                        value={inlineRaceEditData.country as string || race.country}
                                        onChange={(e) => setInlineRaceEditData({
                                          ...inlineRaceEditData,
                                          country: e.target.value
                                        })}
                                        placeholder="Country"
                                      />
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col space-y-2">
                                      <Input 
                                        type="date"
                                        value={inlineRaceEditData.startDate as string || race.startDate}
                                        onChange={(e) => setInlineRaceEditData({
                                          ...inlineRaceEditData,
                                          startDate: e.target.value
                                        })}
                                      />
                                      <Input 
                                        type="date"
                                        value={inlineRaceEditData.endDate as string || race.endDate}
                                        onChange={(e) => setInlineRaceEditData({
                                          ...inlineRaceEditData,
                                          endDate: e.target.value
                                        })}
                                      />
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Input 
                                      value={inlineRaceEditData.imageUrl as string || race.imageUrl || ''}
                                      onChange={(e) => setInlineRaceEditData({
                                        ...inlineRaceEditData,
                                        imageUrl: e.target.value || null
                                      })}
                                      placeholder="Image URL"
                                    />
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end space-x-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={handleInlineRaceEditCancel}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                      <Button 
                                        size="sm"
                                        onClick={handleInlineRaceEditSave}
                                        disabled={updateRaceMutation.isPending}
                                      >
                                        {updateRaceMutation.isPending ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Check className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </div>
                                  </TableCell>
                                </>
                              ) : (
                                <>
                                  <TableCell>{race.name}</TableCell>
                                  <TableCell>{race.location}, {race.country}</TableCell>
                                  <TableCell>
                                    {new Date(race.startDate).toLocaleDateString()} - {new Date(race.endDate).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      className={`capitalize ${
                                        race.status === 'upcoming' ? 'bg-gray-200 text-gray-800' :
                                        race.status === 'next' ? 'bg-green-200 text-green-800' :
                                        race.status === 'ongoing' ? 'bg-blue-200 text-blue-800' :
                                        race.status === 'completed' ? 'bg-purple-200 text-purple-800' : ''
                                      }`}
                                    >
                                      {race.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end space-x-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        onClick={() => handleInlineRaceEditStart(race)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        onClick={() => {
                                          if (window.confirm(`Are you sure you want to delete the race "${race.name}"?`)) {
                                            deleteRaceMutation.mutate(race.id);
                                          }
                                        }}
                                      >
                                        <Trash className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </>
                              )}
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Riders Management Tab */}
        <TabsContent value="riders">
          <div className="grid gap-6 md:grid-cols-1">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>Rider Management</CardTitle>
                  <CardDescription>
                    Add and manage riders in the database
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      if (showAddRiderForm && isEditingRider) {
                        cancelRiderEdit();
                      } else {
                        setShowAddRiderForm(!showAddRiderForm);
                        if (!showAddRiderForm) {
                          resetRiderForm();
                        }
                      }
                    }}
                  >
                    {showAddRiderForm ? (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Rider
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to delete ALL riders? This cannot be undone!")) {
                        deleteAllRidersMutation.mutate();
                      }
                    }}
                    disabled={deleteAllRidersMutation.isPending || riders.length === 0}
                  >
                    {deleteAllRidersMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete All Riders
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showAddRiderForm && (
                  <form onSubmit={isEditingRider ? handleUpdateRider : handleAddRider} className="space-y-4 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name*</Label>
                        <Input 
                          id="name" 
                          value={riderName}
                          onChange={(e) => setRiderName(e.target.value)}
                          placeholder="John Doe"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gender">Gender*</Label>
                        <Select 
                          value={riderGender} 
                          onValueChange={setRiderGender}
                        >
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
                        <Label htmlFor="team">Team</Label>
                        <Input 
                          id="team" 
                          value={riderTeam}
                          onChange={(e) => setRiderTeam(e.target.value)}
                          placeholder="Team Name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Input 
                          id="country" 
                          value={riderCountry}
                          onChange={(e) => setRiderCountry(e.target.value)}
                          placeholder="Country name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cost">Cost* ($)</Label>
                        <Input 
                          id="cost" 
                          type="number"
                          min="10000"
                          step="1000"
                          value={riderCost}
                          onChange={(e) => setRiderCost(e.target.value)}
                          placeholder="50000"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="points">Points*</Label>
                        <Input 
                          id="points" 
                          type="number"
                          min="0"
                          value={riderPoints}
                          onChange={(e) => setRiderPoints(e.target.value)}
                          placeholder="0"
                          required
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="imageUrl">Profile Image URL</Label>
                        <ImageUpload 
                          value={riderImage}
                          onChange={setRiderImage}
                          filename={riderName.toLowerCase().replace(/\s+/g, '-')}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline"
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
                            setRiderCost('50000');
                            setRiderPoints('0');
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
                              Updating Rider...
                            </>
                          ) : (
                            'Update Rider'
                          )
                        ) : (
                          addRiderMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Adding Rider...
                            </>
                          ) : (
                            'Add Rider'
                          )
                        )}
                      </Button>
                    </div>
                  </form>
                )}
                
                <div className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rider</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingRiders ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                            <p className="mt-2 text-sm text-gray-500">Loading riders...</p>
                          </TableCell>
                        </TableRow>
                      ) : ridersError ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10">
                            <p className="text-red-500">Error loading riders</p>
                          </TableCell>
                        </TableRow>
                      ) : riders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10">
                            <p className="text-gray-500">No riders found. Add a rider to get started.</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        riders.map((rider) => (
                          <TableRow key={rider.id} className="group">
                            {inlineEditRiderId === rider.id ? (
                              <>
                                <TableCell>
                                  <div className="flex items-center space-x-3">
                                    <Input 
                                      value={inlineEditData.name as string || rider.name}
                                      onChange={(e) => setInlineEditData({
                                        ...inlineEditData,
                                        name: e.target.value
                                      })}
                                    />
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Input 
                                    value={inlineEditData.team as string || rider.team || ''}
                                    onChange={(e) => setInlineEditData({
                                      ...inlineEditData,
                                      team: e.target.value
                                    })}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Select 
                                    value={inlineEditData.gender as string || rider.gender}
                                    onValueChange={(value) => setInlineEditData({
                                      ...inlineEditData,
                                      gender: value
                                    })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="male">Male</SelectItem>
                                      <SelectItem value="female">Female</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Input 
                                    type="number"
                                    min="10000"
                                    step="1000"
                                    value={inlineEditData.cost as number || rider.cost}
                                    onChange={(e) => setInlineEditData({
                                      ...inlineEditData,
                                      cost: parseInt(e.target.value)
                                    })}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input 
                                    type="number"
                                    min="0"
                                    value={inlineEditData.points as number || rider.points}
                                    onChange={(e) => setInlineEditData({
                                      ...inlineEditData,
                                      points: parseInt(e.target.value)
                                    })}
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end space-x-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={handleInlineEditCancel}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      size="sm"
                                      onClick={handleInlineEditSave}
                                      disabled={updateRiderMutation.isPending}
                                    >
                                      {updateRiderMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Check className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell>
                                  <div className="flex items-center space-x-3">
                                    <div className="flex-shrink-0">
                                      <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-100">
                                        {rider.imageUrl ? (
                                          <img 
                                            src={rider.imageUrl} 
                                            alt={rider.name} 
                                            className="h-full w-full object-cover"
                                          />
                                        ) : (
                                          <div className={`h-full w-full flex items-center justify-center text-white font-semibold`} style={{ backgroundColor: `hsl(${rider.name.charCodeAt(0) % 360}, 70%, 50%)` }}>
                                            {rider.name.substring(0, 2).toUpperCase()}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="font-medium">{rider.name}</div>
                                      <div className="text-sm text-gray-500">{rider.country || 'Unknown'}</div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>{rider.team || '-'}</TableCell>
                                <TableCell>
                                  <Badge className={`${rider.gender === 'male' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'}`}>
                                    {rider.gender === 'male' ? 'Male' : 'Female'}
                                  </Badge>
                                </TableCell>
                                <TableCell>${rider.cost.toLocaleString()}</TableCell>
                                <TableCell>{rider.points}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end space-x-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => handleInlineEditStart(rider)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => handleEditRider(rider)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Results Management Tab */}
        <TabsContent value="results">
          <div className="grid gap-6 md:grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle>Race Results</CardTitle>
                <CardDescription>
                  Manage race results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>Results management coming soon</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}