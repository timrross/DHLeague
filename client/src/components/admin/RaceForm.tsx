import React, { useState, useEffect } from 'react';
import { Race } from '@shared/schema';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from 'date-fns';
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { EnhancedImageUpload } from "@/components/ui/enhanced-image-upload";

interface RaceFormProps {
  initialData?: Partial<Race>;
  onSubmit: (data: any) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitButtonText?: string;
  cancelButtonText?: string;
  compact?: boolean;
}

export default function RaceForm({
  initialData = {},
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitButtonText = "Submit",
  cancelButtonText = "Cancel",
  compact = false
}: RaceFormProps) {
  // Initialize state with initial data or defaults
  const [raceName, setRaceName] = useState(initialData.name || '');
  const [raceLocation, setRaceLocation] = useState(initialData.location || '');
  const [raceCountry, setRaceCountry] = useState(initialData.country || '');
  const [raceStartDate, setRaceStartDate] = useState<Date | undefined>(
    initialData.startDate ? new Date(initialData.startDate) : undefined
  );
  const [raceEndDate, setRaceEndDate] = useState<Date | undefined>(
    initialData.endDate ? new Date(initialData.endDate) : undefined
  );
  const [raceImageUrl, setRaceImageUrl] = useState(initialData.imageUrl || '');

  // Update form if initialData changes (like when editing a different race)
  useEffect(() => {
    setRaceName(initialData.name || '');
    setRaceLocation(initialData.location || '');
    setRaceCountry(initialData.country || '');
    setRaceStartDate(initialData.startDate ? new Date(initialData.startDate) : undefined);
    setRaceEndDate(initialData.endDate ? new Date(initialData.endDate) : undefined);
    setRaceImageUrl(initialData.imageUrl || '');
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate dates
    if (!raceStartDate || !raceEndDate) {
      alert('Please select both start and end dates');
      return;
    }
    
    const raceData = {
      ...(initialData.id ? { id: initialData.id } : {}),
      name: raceName,
      location: raceLocation,
      country: raceCountry,
      startDate: raceStartDate.toISOString(),
      endDate: raceEndDate.toISOString(),
      imageUrl: raceImageUrl,
    };
    
    onSubmit(raceData);
  };

  // For grid layout, use more columns in compact mode
  const gridCols = compact ? "grid-cols-12" : "grid-cols-2";

  return (
    <form onSubmit={handleSubmit}>
      <div className={`grid ${gridCols} gap-4 mb-4`}>
        {/* Race Name */}
        <div className={`space-y-2 ${compact ? "col-span-4" : ""}`}>
          <Label htmlFor="raceName">Race Name*</Label>
          <Input 
            id="raceName" 
            placeholder="Fort William"
            value={raceName}
            onChange={(e) => setRaceName(e.target.value)}
            required
          />
        </div>
        
        {/* Location */}
        <div className={`space-y-2 ${compact ? "col-span-4" : ""}`}>
          <Label htmlFor="raceLocation">Location*</Label>
          <Input 
            id="raceLocation" 
            placeholder="Fort William"
            value={raceLocation}
            onChange={(e) => setRaceLocation(e.target.value)}
            required
          />
        </div>
        
        {/* Country */}
        <div className={`space-y-2 ${compact ? "col-span-4" : ""}`}>
          <Label htmlFor="raceCountry">Country*</Label>
          <Input 
            id="raceCountry" 
            placeholder="Scotland"
            value={raceCountry}
            onChange={(e) => setRaceCountry(e.target.value)}
            required
          />
        </div>
        
        {/* Start Date Picker */}
        <div className={`space-y-2 ${compact ? "col-span-6" : ""}`}>
          <Label htmlFor="raceStartDate">Start Date*</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !raceStartDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {raceStartDate ? format(raceStartDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={raceStartDate}
                onSelect={setRaceStartDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        
        {/* End Date Picker */}
        <div className={`space-y-2 ${compact ? "col-span-6" : ""}`}>
          <Label htmlFor="raceEndDate">End Date*</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !raceEndDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {raceEndDate ? format(raceEndDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={raceEndDate}
                onSelect={setRaceEndDate}
                initialFocus
                disabled={(date) => raceStartDate ? date < raceStartDate : false}
              />
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Image URL */}
        <div className={`space-y-2 ${compact ? "col-span-12" : ""}`}>
          <Label htmlFor="raceImageUrl">Race Image URL</Label>
          <Input 
            id="raceImageUrl" 
            placeholder="https://example.com/image.jpg"
            value={raceImageUrl}
            onChange={(e) => setRaceImageUrl(e.target.value)}
          />
        </div>
      </div>
      
      <div className="flex justify-end space-x-2 mt-4">
        {onCancel && (
          <Button 
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            {cancelButtonText}
          </Button>
        )}
        <Button 
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {submitButtonText === "Submit" ? "Submitting..." : submitButtonText}
            </>
          ) : (
            submitButtonText
          )}
        </Button>
      </div>
    </form>
  );
}