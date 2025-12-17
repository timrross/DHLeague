import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Rider } from "@shared/schema";
import RiderForm from "./RiderForm";
import { SimpleRiderForm } from "./SimpleRiderForm";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Pencil, Trash2, Plus, Search } from "lucide-react";

export default function RiderManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [showAddRiderForm, setShowAddRiderForm] = useState(false);

  // Inline edit state
  const [inlineEditRiderId, setInlineEditRiderId] = useState<number | null>(
    null,
  );

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch riders
  const {
    data: ridersData,
    isLoading: isLoadingRiders,
    error: ridersError,
  } = useQuery({
    queryKey: ["/api/riders"],
  });

  const riderList = useMemo(() => {
    if (Array.isArray(ridersData)) return ridersData;
    if (ridersData && Array.isArray((ridersData as { data?: Rider[] }).data)) {
      return (ridersData as { data?: Rider[] }).data ?? [];
    }
    return [];
  }, [ridersData]);

  const filteredRiders = useMemo(() => {
    const riderArray = riderList;
    const query = searchQuery.toLowerCase().trim();

    if (!query) {
      return riderArray;
    }

    return riderArray.filter(
      rider =>
        (rider.name ? rider.name.toLowerCase().includes(query) : false) ||
        (rider.team ? rider.team.toLowerCase().includes(query) : false) ||
        (rider.country ? rider.country.toLowerCase().includes(query) : false) ||
        (rider.riderId ? rider.riderId.toLowerCase().includes(query) : false),
    );
  }, [riderList, searchQuery]);

  // Add rider mutation
  const addRiderMutation = useMutation({
    mutationFn: async (riderData: any) => {
      return apiRequest("/api/riders", {
        method: "POST",
        body: JSON.stringify(riderData),
      });
    },
    onSuccess: () => {
      setShowAddRiderForm(false);

      // Refetch riders
      queryClient.invalidateQueries({ queryKey: ["/api/riders"] });

      toast({
        title: "Success",
        description: "Rider added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to add rider: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  // Update rider mutation
  const updateRiderMutation = useMutation({
    mutationFn: async (riderData: any) => {
      console.log(riderData);
      return apiRequest(`/api/riders/${riderData.id}`, {
        method: "PUT",
        body: JSON.stringify(riderData),
      });
    },
    onSuccess: () => {
      setInlineEditRiderId(null); // Close the edit form
      queryClient.invalidateQueries({ queryKey: ["/api/riders"] });
      toast({
        title: "Success",
        description: "Rider updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update rider: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  // Delete rider mutation
  const deleteRiderMutation = useMutation({
    mutationFn: async (riderId: number) => {
      return apiRequest(`/api/riders/${riderId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/riders"] });
      toast({
        title: "Success",
        description: "Rider deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete rider: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    },
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
    // Add extra debugging to see what we're sending
    console.log("Submitting rider edit:", riderData);

    // Ensure there's at least one valid property to update
    const hasValidFields = Object.values(riderData).some(
      (val) => val !== undefined && val !== "",
    );

    if (!hasValidFields) {
      toast({
        title: "Error",
        description: "At least one field must have a value",
        variant: "destructive",
      });
      return;
    }

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
            <SimpleRiderForm
              initialData={{}}
              onSubmit={handleAddRider}
              onCancel={() => setShowAddRiderForm(false)}
              isSubmitting={addRiderMutation.isPending}
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
          <CardDescription>View and manage existing riders.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search Input */}
          <div className="mb-4 relative">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search riders by name, team, country..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1.5 h-7 w-7 p-0"
                  onClick={() => setSearchQuery("")}
                >
                  ×
                </Button>
              )}
            </div>
            {searchQuery && (
              <p className="text-sm text-muted-foreground mt-1">
                Found {filteredRiders.length} rider
                {filteredRiders.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {isLoadingRiders ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : ridersError ? (
            <div className="text-center py-8 text-red-500">
              Error loading riders
            </div>
          ) : riderList.length === 0 ? (
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
                  <TableHead>Country</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Last Year Standing</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRiders.map((rider: any) => (
                  <React.Fragment key={rider.id}>
                    {inlineEditRiderId === rider.id ? (
                      <TableRow>
                        <TableCell colSpan={9}>
                          <SimpleRiderForm
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
                              injured: rider.injured || false,
                            }}
                            onSubmit={handleInlineRiderEditSave}
                            onCancel={handleInlineRiderEditCancel}
                            isSubmitting={updateRiderMutation.isPending}
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                              {rider.image ? (
                                <img
                                  src={rider.image}
                                  alt={rider.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-xs font-bold">
                                  {rider.name
                                    .split(" ")
                                    .map((n: string) => n[0])
                                    .join("")}
                                </span>
                              )}
                            </div>
                            <span>{rider.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{rider.team}</TableCell>
                        <TableCell>{rider.country}</TableCell>
                        <TableCell className="capitalize">
                          {rider.gender}
                        </TableCell>
                        <TableCell>${rider.cost.toLocaleString()}</TableCell>
                        <TableCell>{rider.lastYearStanding}</TableCell>
                        <TableCell>{rider.points}</TableCell>
                        <TableCell>
                          {rider.injured ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Injured
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          )}
                        </TableCell>
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
                                if (
                                  window.confirm(
                                    `Are you sure you want to delete ${rider.name}?`,
                                  )
                                ) {
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
