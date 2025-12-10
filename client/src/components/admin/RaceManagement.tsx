import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Race } from "@shared/schema";
import RaceForm from "./RaceForm";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Pencil, Trash2, Plus } from "lucide-react";

export default function RaceManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Race form state
  const [showAddRaceForm, setShowAddRaceForm] = useState(false);

  // Inline race edit state
  const [inlineEditRaceId, setInlineEditRaceId] = useState<number | null>(null);

  // Fetch races
  const {
    data: races = [],
    isLoading: isLoadingRaces,
    error: racesError,
  } = useQuery<Race[]>({
    queryKey: ["/api/races"],
  });

  // Add race mutation
  const addRaceMutation = useMutation({
    mutationFn: async (raceData: any) => {
      return apiRequest("/api/races", {
        method: "POST",
        body: JSON.stringify(raceData),
      });
    },
    onSuccess: () => {
      setShowAddRaceForm(false);

      // Refetch races
      queryClient.invalidateQueries({ queryKey: ["/api/races"] });

      toast({
        title: "Success",
        description: "Race added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to add race: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  // Update race mutation
  const updateRaceMutation = useMutation({
    mutationFn: async (raceData: any) => {
      return apiRequest(`/api/races/${raceData.id}`, {
        method: "PUT",
        body: JSON.stringify(raceData),
      });
    },
    onSuccess: () => {
      setInlineEditRaceId(null); // Close the edit form
      queryClient.invalidateQueries({ queryKey: ["/api/races"] });
      toast({
        title: "Success",
        description: "Race updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update race: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  // Delete race mutation
  const deleteRaceMutation = useMutation({
    mutationFn: async (raceId: number) => {
      return apiRequest(`/api/races/${raceId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/races"] });
      toast({
        title: "Success",
        description: "Race deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete race: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  // Handle add race button click
  const handleAddRaceClick = () => {
    setShowAddRaceForm(true);
  };

  // Handle add race form submission (now accepts data from RaceForm)
  const handleAddRace = (raceData: any) => {
    // Add default image URL if none is provided
    if (!raceData.imageUrl) {
      raceData.imageUrl = `https://source.unsplash.com/random/1200x800/?mountain,bike,${raceData.location}`;
    }

    addRaceMutation.mutate(raceData);
  };

  // Handle inline editing for a race
  const handleInlineEditRace = (race: any) => {
    setInlineEditRaceId(race.id);
  };

  // Handle inline edit cancel
  const handleInlineRaceEditCancel = () => {
    setInlineEditRaceId(null);
  };

  // Handle inline edit save
  const handleInlineRaceEditSave = (raceData: any) => {
    updateRaceMutation.mutate(raceData);
  };

  // Helper function to format date display
  const formatDate = (dateValue: string | Date) => {
    const date = new Date(dateValue);
    return date.toLocaleDateString();
  };

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Race Management</CardTitle>
          <CardDescription>
            Add and manage races for the season.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showAddRaceForm ? (
            <RaceForm
              onSubmit={handleAddRace}
              onCancel={() => setShowAddRaceForm(false)}
              isSubmitting={addRaceMutation.isPending}
              submitButtonText="Add Race"
              compact={true}
            />
          ) : (
            <Button onClick={handleAddRaceClick}>
              <Plus className="mr-2 h-4 w-4" /> Add New Race
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Race Schedule</CardTitle>
          <CardDescription>View and manage existing races.</CardDescription>
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
                {races.map((race: Race) => (
                  <React.Fragment key={race.id}>
                    {inlineEditRaceId === race.id ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <RaceForm
                            initialData={{
                              id: race.id,
                              name: race.name,
                              location: race.location,
                              country: race.country,
                              startDate: race.startDate,
                              endDate: race.endDate,
                              imageUrl: race.imageUrl,
                            }}
                            onSubmit={handleInlineRaceEditSave}
                            onCancel={handleInlineRaceEditCancel}
                            isSubmitting={updateRaceMutation.isPending}
                            submitButtonText="Save"
                            cancelButtonText="Cancel"
                            compact={true}
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow>
                        <TableCell className="font-medium">
                          {race.name}
                        </TableCell>
                        <TableCell>
                          {race.location}, {race.country}
                        </TableCell>
                        <TableCell>
                          {formatDate(race.startDate)} to{" "}
                          {formatDate(race.endDate)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold capitalize
                              ${
                                race.status === "upcoming"
                                  ? "bg-blue-100 text-blue-800"
                                  : race.status === "next"
                                    ? "bg-green-100 text-green-800"
                                    : race.status === "ongoing"
                                      ? "bg-orange-100 text-orange-800"
                                      : "bg-gray-100 text-gray-800"
                              }`}
                          >
                            {race.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleInlineEditRace(race)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Are you sure you want to delete ${race.name}?`,
                                  )
                                ) {
                                  deleteRaceMutation.mutate(race.id);
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
