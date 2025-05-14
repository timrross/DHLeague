import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { User } from '@shared/schema';

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
import { Separator } from '@/components/ui/separator';
import { Loader2, UserCog, Edit, Trash, Check, X } from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

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

interface UserManagementProps {
  currentUser: User | null | undefined;
}

export default function UserManagement({ currentUser }: UserManagementProps) {
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

  // Fetch users
  const {
    data: users = [] as UserWithTeam[],
    isLoading: isLoadingUsers,
    error: usersError,
    refetch: refetchUsers
  } = useQuery({
    queryKey: ['/api/admin/users'],
  });

  // Handle edit user button click
  const handleEditUser = (userData: UserWithTeam) => {
    setSelectedUser(userData);
    setEditUserData({
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      email: userData.email || '',
      isAdmin: userData.isAdmin || false,
      isActive: userData.isActive !== false // Default to true if not specified
    });
    setIsEditingUser(true);
  };

  // Handle delete user dialog open
  const handleDeleteUserDialog = (userData: UserWithTeam) => {
    setSelectedUser(userData);
    setIsDeleteDialogOpen(true);
  };

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      return apiRequest(`/api/admin/users/${userData.id}`, {
        method: 'PUT',
        body: JSON.stringify(userData)
      });
    },
    onSuccess: () => {
      setIsEditingUser(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: 'Success',
        description: 'User updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user',
        variant: 'destructive',
      });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      });
    }
  });

  // Handle update user form submission
  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const userData = {
      id: selectedUser.id,
      ...editUserData
    };

    updateUserMutation.mutate(userData);
  };

  // Handle delete user confirmation
  const handleConfirmDelete = () => {
    if (selectedUser) {
      deleteUserMutation.mutate(selectedUser.id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>
          View and manage users, teams, and permissions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingUsers ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : usersError ? (
          <div className="text-center py-8 text-red-500">
            Error loading users
          </div>
        ) : !users || users.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No users found
          </div>
        ) : (
          <div>
            <Table>
              <TableCaption>List of all users</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className={!user.isActive ? 'opacity-60' : ''}>
                    <TableCell className="font-mono text-xs">{user.id}</TableCell>
                    <TableCell>{user.firstName} {user.lastName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.team ? (
                        <div>
                          <div className="font-semibold">{user.team.name}</div>
                          <div className="text-xs text-gray-500">
                            {user.team.riders?.length || 0} riders | {user.team.totalPoints || 0} points
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">No team</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.isAdmin ? (
                        <span className="inline-block px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">
                          Admin
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">
                          User
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                        user.isActive !== false 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 mr-1"
                        onClick={() => handleEditUser(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                        onClick={() => handleDeleteUserDialog(user)}
                        disabled={currentUser?.id === user.id}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Edit User Dialog */}
            <Dialog open={isEditingUser} onOpenChange={setIsEditingUser}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit User</DialogTitle>
                  <DialogDescription>
                    Make changes to the user account here. Click save when you're done.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUpdateUser}>
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
                      <Label htmlFor="isAdmin" className="text-right">
                        Admin
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isAdmin"
                          checked={editUserData.isAdmin}
                          onCheckedChange={(checked) => setEditUserData({...editUserData, isAdmin: checked})}
                        />
                        <span className="text-sm text-gray-500">
                          {editUserData.isAdmin ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="isActive" className="text-right">
                        Active
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isActive"
                          checked={editUserData.isActive}
                          onCheckedChange={(checked) => setEditUserData({...editUserData, isActive: checked})}
                        />
                        <span className="text-sm text-gray-500">
                          {editUserData.isActive ? 'Yes' : 'No'}
                        </span>
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
                    <Button 
                      type="submit"
                      disabled={updateUserMutation.isPending}
                    >
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
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Delete</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this user? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <p><strong>ID:</strong> {selectedUser?.id}</p>
                  <p><strong>Name:</strong> {selectedUser?.firstName} {selectedUser?.lastName}</p>
                  <p><strong>Email:</strong> {selectedUser?.email}</p>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsDeleteDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={handleConfirmDelete}
                    disabled={deleteUserMutation.isPending}
                  >
                    {deleteUserMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete User'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}