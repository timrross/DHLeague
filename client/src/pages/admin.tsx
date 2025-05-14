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
  
  // Fetch users
  const {
    data: users = [] as UserWithTeam[],
    isLoading: isLoadingUsers,
    error: usersError
  } = useQuery({
    queryKey: ['/api/admin/users'],
    retry: false
  });

  // Race management state
  const [showAddRaceForm, setShowAddRaceForm] = useState(false);
  const [raceName, setRaceName] = useState('');
  const [location, setLocation] = useState('');
  const [country, setCountry] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [imageUrl, setImageUrl] = useState('');

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
      // Reset form fields
      setRaceName('');
      setLocation('');
      setCountry('');
      setStartDate('');
      setEndDate('');
      setImageUrl('');
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

  // Handle add race form submission
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
                                    onClick={() => {
                                      toast({
                                        title: "Edit Race",
                                        description: `Editing ${race.name}`,
                                      });
                                    }}
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
              </CardHeader>
              <CardContent>
                <p>Rider management coming soon</p>
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