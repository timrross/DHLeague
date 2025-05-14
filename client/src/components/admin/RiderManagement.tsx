import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Rider } from '@shared/schema';
import RiderForm from './RiderForm';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Pencil, Trash2, Plus } from 'lucide-react';

export default function RiderManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [showAddRiderForm, setShowAddRiderForm] = useState(false);
  
  // Inline edit state
  const [inlineEditRiderId, setInlineEditRiderId] = useState<number | null>(null);

  // Fetch riders
  const {
    data: riders = [],
    isLoading: isLoadingRiders,
    error: ridersError,
  } = useQuery({
    queryKey: ['/api/riders'],
  });

  // Add rider mutation
  const addRiderMutation = useMutation({
    mutationFn: async (riderData: any) => {
      return apiRequest('/api/riders', {
        method: 'POST',
        body: JSON.stringify(riderData)
      });
    },
    onSuccess: () => {
      setShowAddRiderForm(false);
      
      // Refetch riders
      queryClient.invalidateQueries({ queryKey: ['/api/riders'] });
      
      toast({
        title: 'Success',
        description: 'Rider added successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to add rider: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  });

  // Update rider mutation
  const updateRiderMutation = useMutation({
    mutationFn: async (riderData: any) => {
      return apiRequest(`/api/riders/${riderData.id}`, {
        method: 'PUT',
        body: JSON.stringify(riderData)
      });
    },
    onSuccess: () => {
      setInlineEditRiderId(null); // Close the edit form
      queryClient.invalidateQueries({ queryKey: ['/api/riders'] });
      toast({
        title: 'Success',
        description: 'Rider updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to update rider: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  });

  // Delete rider mutation
  const deleteRiderMutation = useMutation({
    mutationFn: async (riderId: number) => {
      return apiRequest(`/api/riders/${riderId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/riders'] });
      toast({
        title: 'Success',
        description: 'Rider deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to delete rider: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  });

  // Handle add rider button click
  const handleAddRiderClick = () => {
    setShowAddRiderForm(true);
  };

  // Handle add rider form submission
  const handleAddRider = (riderData: any) => {
    addRiderMutation.mutate(riderData);
  };

  // Handle inline editing for a rider
  const handleInlineEditRider = (rider: any) => {
    setInlineEditRiderId(rider.id);
  };
  
  // Handle inline edit cancel
  const handleInlineRiderEditCancel = () => {
    setInlineEditRiderId(null);
  };
  
  // Handle inline edit save
  const handleInlineRiderEditSave = (riderData: any) => {
    updateRiderMutation.mutate(riderData);
  };

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Rider Management</CardTitle>
          <CardDescription>
            Add and manage riders for the fantasy league.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showAddRiderForm ? (
            <RiderForm
              onSubmit={handleAddRider}
              onCancel={() => setShowAddRiderForm(false)}
              isSubmitting={addRiderMutation.isPending}
              submitButtonText="Add Rider"
            />
          ) : (
            <Button onClick={handleAddRiderClick}>
              <Plus className="mr-2 h-4 w-4" /> Add New Rider
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rider Roster</CardTitle>
          <CardDescription>
            View and manage existing riders.
          </CardDescription>
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
              No riders found. Add a rider or import from UCI API.
            </div>
          ) : (
            <Table>
              <TableCaption>List of all riders</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Nationality</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Ranking</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {riders.map((rider: any) => (
                  <React.Fragment key={rider.id}>
                    {inlineEditRiderId === rider.id ? (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <RiderForm
                            initialData={{
                              id: rider.id,
                              name: rider.name,
                              team: rider.team,
                              country: rider.country,
                              gender: rider.gender,
                              cost: rider.cost,
                              lastYearStanding: rider.lastYearStanding,
                              points: rider.points,
                              image: rider.image,
                            }}
                            onSubmit={handleInlineRiderEditSave}
                            onCancel={handleInlineRiderEditCancel}
                            isSubmitting={updateRiderMutation.isPending}
                            submitButtonText="Save"
                            cancelButtonText="Cancel"
                            compact={true}
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                              {rider.profileImageUrl ? (
                                <img 
                                  src={rider.profileImageUrl} 
                                  alt={rider.name}
                                  className="w-full h-full object-cover" 
                                />
                              ) : (
                                <span className="text-xs font-bold">
                                  {rider.name.split(' ').map((n: string) => n[0]).join('')}
                                </span>
                              )}
                            </div>
                            <span>{rider.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{rider.team}</TableCell>
                        <TableCell>{rider.nationality}</TableCell>
                        <TableCell className="capitalize">{rider.gender}</TableCell>
                        <TableCell>${rider.cost.toLocaleString()}</TableCell>
                        <TableCell>{rider.ranking}</TableCell>
                        <TableCell>{rider.points}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleInlineEditRider(rider)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete ${rider.name}?`)) {
                                  deleteRiderMutation.mutate(rider.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}