import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Rider } from '@shared/schema';

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
import { Loader2, Pencil, Trash, Check, X, Trash2 } from 'lucide-react';
import { EnhancedImageUpload } from '@/components/ui/enhanced-image-upload';

export default function RiderManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Rider form state
  const [isEditingRider, setIsEditingRider] = useState(false);
  const [showAddRiderForm, setShowAddRiderForm] = useState(false);
  const [editRiderId, setEditRiderId] = useState<number | null>(null);
  const [riderName, setRiderName] = useState('');
  const [riderGender, setRiderGender] = useState('');
  const [riderTeam, setRiderTeam] = useState('');
  const [riderCountry, setRiderCountry] = useState('');
  const [riderImage, setRiderImage] = useState('');
  const [riderCost, setRiderCost] = useState('');
  const [riderPoints, setRiderPoints] = useState('');

  // Inline rider edit state
  const [inlineEditRiderId, setInlineEditRiderId] = useState<number | null>(null);
  const [inlineEditData, setInlineEditData] = useState({
    name: '',
    gender: '',
    team: '',
    country: '',
    image: '',
    cost: '',
    points: '',
  });

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
      // Reset form
      setRiderName('');
      setRiderGender('');
      setRiderTeam('');
      setRiderCountry('');
      setRiderImage('');
      setRiderCost('');
      setRiderPoints('');
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
      setIsEditingRider(false);
      setEditRiderId(null);
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

  // Delete all riders mutation
  const deleteAllRidersMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/riders', {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/riders'] });
      toast({
        title: 'Success',
        description: 'All riders deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to delete all riders: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  });

  // Handle add rider button click
  const handleAddRiderClick = () => {
    setShowAddRiderForm(true);
  };

  // Handle add rider form submission
  const handleAddRider = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!riderName || !riderGender || !riderCost) {
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
      cost: parseInt(riderCost, 10),
      points: riderPoints ? parseInt(riderPoints, 10) : 0
    };
    
    addRiderMutation.mutate(riderData);
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
      points: (rider.points || 0).toString()
    });
  };

  // Handle cancel inline editing
  const handleInlineEditCancel = () => {
    setInlineEditRiderId(null);
  };

  // Handle save inline editing
  const handleInlineEditSave = (riderId: number) => {
    const riderData = {
      id: riderId,
      name: inlineEditData.name,
      gender: inlineEditData.gender,
      team: inlineEditData.team,
      country: inlineEditData.country,
      image: inlineEditData.image,
      cost: parseInt(inlineEditData.cost, 10),
      points: inlineEditData.points ? parseInt(inlineEditData.points, 10) : 0
    };
    
    updateRiderMutation.mutate(riderData);
    setInlineEditRiderId(null);
  };

  // Handle update rider form submission
  const handleUpdateRider = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRiderId) return;
    
    if (!riderName || !riderGender || !riderCost) {
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
      cost: parseInt(riderCost, 10),
      points: riderPoints ? parseInt(riderPoints, 10) : 0
    };
    
    updateRiderMutation.mutate(riderData);
  };

  // Handle delete all riders confirmation
  const handleDeleteAllRiders = () => {
    if (window.confirm('Are you sure you want to delete ALL riders? This action cannot be undone.')) {
      deleteAllRidersMutation.mutate();
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Add Rider</CardTitle>
          <CardDescription>
            Add a new rider to the database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showAddRiderForm ? (
            <form onSubmit={handleAddRider}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Rider Name */}
                <div className="space-y-2">
                  <Label htmlFor="riderName">Rider Name*</Label>
                  <Input 
                    id="riderName" 
                    placeholder="Amaury Pierron"
                    value={riderName}
                    onChange={(e) => setRiderName(e.target.value)}
                    required
                  />
                </div>
                {/* Gender */}
                <div className="space-y-2">
                  <Label htmlFor="riderGender">Gender*</Label>
                  <Select value={riderGender} onValueChange={setRiderGender}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="m">Male</SelectItem>
                      <SelectItem value="f">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Team */}
                <div className="space-y-2">
                  <Label htmlFor="riderTeam">Team</Label>
                  <Input 
                    id="riderTeam" 
                    placeholder="MS Mondraker Team"
                    value={riderTeam}
                    onChange={(e) => setRiderTeam(e.target.value)}
                  />
                </div>
                {/* Country */}
                <div className="space-y-2">
                  <Label htmlFor="riderCountry">Country</Label>
                  <Input 
                    id="riderCountry" 
                    placeholder="France"
                    value={riderCountry}
                    onChange={(e) => setRiderCountry(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Cost */}
                <div className="space-y-2">
                  <Label htmlFor="riderCost">Cost (Budget Points)*</Label>
                  <Input 
                    id="riderCost" 
                    type="number"
                    placeholder="500"
                    value={riderCost}
                    onChange={(e) => setRiderCost(e.target.value)}
                    required
                  />
                </div>
                {/* Points */}
                <div className="space-y-2">
                  <Label htmlFor="riderPoints">Current Points</Label>
                  <Input 
                    id="riderPoints" 
                    type="number"
                    placeholder="0"
                    value={riderPoints}
                    onChange={(e) => setRiderPoints(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <Label htmlFor="riderImage">Profile Image</Label>
                <ImageUpload
                  endpoint="riderImage"
                  value={riderImage}
                  onChange={setRiderImage}
                />
              </div>
              <Button 
                type="submit"
                disabled={addRiderMutation.isPending}
                className="w-full"
              >
                {addRiderMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding Rider...
                  </>
                ) : (
                  'Add Rider'
                )}
              </Button>
            </form>
          ) : isEditingRider ? (
            <form onSubmit={handleUpdateRider}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Rider Name */}
                <div className="space-y-2">
                  <Label htmlFor="riderName">Rider Name*</Label>
                  <Input 
                    id="riderName" 
                    placeholder="Amaury Pierron"
                    value={riderName}
                    onChange={(e) => setRiderName(e.target.value)}
                    required
                  />
                </div>
                {/* Gender */}
                <div className="space-y-2">
                  <Label htmlFor="riderGender">Gender*</Label>
                  <Select value={riderGender} onValueChange={setRiderGender}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="m">Male</SelectItem>
                      <SelectItem value="f">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Team */}
                <div className="space-y-2">
                  <Label htmlFor="riderTeam">Team</Label>
                  <Input 
                    id="riderTeam" 
                    placeholder="MS Mondraker Team"
                    value={riderTeam}
                    onChange={(e) => setRiderTeam(e.target.value)}
                  />
                </div>
                {/* Country */}
                <div className="space-y-2">
                  <Label htmlFor="riderCountry">Country</Label>
                  <Input 
                    id="riderCountry" 
                    placeholder="France"
                    value={riderCountry}
                    onChange={(e) => setRiderCountry(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Cost */}
                <div className="space-y-2">
                  <Label htmlFor="riderCost">Cost (Budget Points)*</Label>
                  <Input 
                    id="riderCost" 
                    type="number"
                    placeholder="500"
                    value={riderCost}
                    onChange={(e) => setRiderCost(e.target.value)}
                    required
                  />
                </div>
                {/* Points */}
                <div className="space-y-2">
                  <Label htmlFor="riderPoints">Current Points</Label>
                  <Input 
                    id="riderPoints" 
                    type="number"
                    placeholder="0"
                    value={riderPoints}
                    onChange={(e) => setRiderPoints(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <Label htmlFor="riderImage">Profile Image</Label>
                <ImageUpload
                  endpoint="riderImage"
                  value={riderImage}
                  onChange={setRiderImage}
                />
              </div>
              <div className="flex justify-between">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditingRider(false);
                    setEditRiderId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateRiderMutation.isPending}
                >
                  {updateRiderMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Rider'
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex space-x-2">
              <Button onClick={handleAddRiderClick} className="flex-1">Add New Rider</Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteAllRiders}
                className="flex-none"
                disabled={deleteAllRidersMutation.isPending}
              >
                {deleteAllRidersMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span className="ml-2">Delete All</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Rider List</CardTitle>
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
                  <TableHead>Image</TableHead>
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
                  <React.Fragment key={rider.id}>
                    <TableRow>
                      <TableCell className="w-10">
                        {rider.image ? (
                          <img 
                            src={rider.image}
                            alt={rider.name}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">
                            {rider.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{rider.name}</TableCell>
                      <TableCell>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                          rider.gender === 'f' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {rider.gender === 'f' ? 'Female' : 'Male'}
                        </span>
                      </TableCell>
                      <TableCell>{rider.team || '-'}</TableCell>
                      <TableCell>{rider.country || '-'}</TableCell>
                      <TableCell className="font-mono">{rider.cost}</TableCell>
                      <TableCell className="font-mono">{rider.points || 0}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 mr-1"
                          onClick={() => handleInlineEditStart(rider)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this rider?')) {
                              deleteRiderMutation.mutate(rider.id);
                            }
                          }}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {inlineEditRiderId === rider.id && (
                      <TableRow>
                        <TableCell colSpan={8} className="p-4 bg-gray-50">
                          <div className="border border-gray-200 rounded-md p-4">
                            <h4 className="text-sm font-semibold mb-4">Edit Rider Details</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor={`rider-${rider.id}-name`}>Rider Name*</Label>
                                <Input 
                                  id={`rider-${rider.id}-name`}
                                  value={inlineEditData.name}
                                  onChange={(e) => setInlineEditData({...inlineEditData, name: e.target.value})}
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`rider-${rider.id}-gender`}>Gender*</Label>
                                <Select
                                  value={inlineEditData.gender}
                                  onValueChange={(value) => setInlineEditData({...inlineEditData, gender: value})}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select gender" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="m">Male</SelectItem>
                                    <SelectItem value="f">Female</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`rider-${rider.id}-team`}>Team</Label>
                                <Input 
                                  id={`rider-${rider.id}-team`}
                                  value={inlineEditData.team}
                                  onChange={(e) => setInlineEditData({...inlineEditData, team: e.target.value})}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`rider-${rider.id}-country`}>Country</Label>
                                <Input 
                                  id={`rider-${rider.id}-country`}
                                  value={inlineEditData.country}
                                  onChange={(e) => setInlineEditData({...inlineEditData, country: e.target.value})}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`rider-${rider.id}-cost`}>Cost*</Label>
                                <Input 
                                  id={`rider-${rider.id}-cost`}
                                  type="number"
                                  value={inlineEditData.cost}
                                  onChange={(e) => setInlineEditData({...inlineEditData, cost: e.target.value})}
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`rider-${rider.id}-points`}>Points</Label>
                                <Input 
                                  id={`rider-${rider.id}-points`}
                                  type="number"
                                  value={inlineEditData.points}
                                  onChange={(e) => setInlineEditData({...inlineEditData, points: e.target.value})}
                                />
                              </div>
                              <div className="space-y-2 col-span-2">
                                <Label htmlFor={`rider-${rider.id}-image`}>Profile Image</Label>
                                <ImageUpload
                                  endpoint="riderImage"
                                  value={inlineEditData.image}
                                  onChange={(url) => setInlineEditData({...inlineEditData, image: url})}
                                />
                              </div>
                            </div>
                            <div className="flex justify-end space-x-2 mt-4">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={handleInlineEditCancel}
                              >
                                <X className="h-4 w-4 mr-1" /> Cancel
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => handleInlineEditSave(rider.id)}
                                disabled={updateRiderMutation.isPending}
                              >
                                {updateRiderMutation.isPending ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-4 w-4 mr-1" /> Save Changes
                                  </>
                                )}
                              </Button>
                            </div>
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