import React, { useState, useEffect } from 'react';
import { Rider } from '@shared/schema';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EnhancedImageUpload } from "@/components/ui/enhanced-image-upload";

interface RiderFormProps {
  initialData: Partial<Rider>;
  onSubmit: (data: any) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function SimpleRiderForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: RiderFormProps) {
  // Initialize state with initial data or defaults
  const [riderName, setRiderName] = useState(initialData.name || '');
  const [team, setTeam] = useState(initialData.team || '');
  const [country, setCountry] = useState(initialData.country || '');
  const [gender, setGender] = useState(initialData.gender || 'male');
  const [cost, setCost] = useState<number>(initialData.cost || 0);
  const [lastYearStanding, setLastYearStanding] = useState<number>(initialData.lastYearStanding || 0);
  const [points, setPoints] = useState<number>(initialData.points || 0);
  const [image, setImage] = useState(initialData.image || '');

  // Update form if initialData changes (like when editing a different rider)
  useEffect(() => {
    setRiderName(initialData.name || '');
    setTeam(initialData.team || '');
    setCountry(initialData.country || '');
    setGender(initialData.gender || 'male');
    setCost(initialData.cost || 0);
    setLastYearStanding(initialData.lastYearStanding || 0);
    setPoints(initialData.points || 0);
    setImage(initialData.image || '');
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const riderData = {
      ...(initialData.id ? { id: initialData.id } : {}),
      name: riderName,
      team,
      country,
      gender,
      cost: Number(cost),
      lastYearStanding: Number(lastYearStanding),
      points: Number(points),
      image
    };
    
    console.log("Form submitted with data:", riderData);
    console.log("Current image value:", image);
    
    // Only submit if we have some data
    if (!image && Object.values(riderData).every(val => val === undefined || val === null || val === "" || val === 0)) {
      console.error("No data to submit - all fields empty");
      return;
    }
    
    onSubmit(riderData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-2 bg-slate-50 rounded-md">
      <div className="grid grid-cols-12 gap-3 mb-3">
        {/* Row 1 */}
        <div className="col-span-4 space-y-1">
          <Label htmlFor="riderName" className="text-xs">Name*</Label>
          <Input 
            id="riderName" 
            placeholder="John Smith"
            value={riderName}
            onChange={(e) => setRiderName(e.target.value)}
            required
            className="h-8"
          />
        </div>
        
        <div className="col-span-4 space-y-1">
          <Label htmlFor="team" className="text-xs">Team*</Label>
          <Input 
            id="team" 
            placeholder="Team A"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            required
            className="h-8"
          />
        </div>
        
        <div className="col-span-4 space-y-1">
          <Label htmlFor="country" className="text-xs">Country*</Label>
          <Input 
            id="country" 
            placeholder="USA"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            required
            className="h-8"
          />
        </div>

        {/* Row 2 */}
        <div className="col-span-3 space-y-1">
          <Label htmlFor="gender" className="text-xs">Gender*</Label>
          <Select 
            value={gender} 
            onValueChange={setGender}
          >
            <SelectTrigger id="gender" className="w-full h-8">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="col-span-3 space-y-1">
          <Label htmlFor="cost" className="text-xs">Cost* ($)</Label>
          <Input 
            id="cost" 
            type="number"
            value={cost}
            onChange={(e) => setCost(Number(e.target.value))}
            required
            className="h-8"
          />
        </div>
        
        <div className="col-span-3 space-y-1">
          <Label htmlFor="lastYearStanding" className="text-xs">Last Standing</Label>
          <Input 
            id="lastYearStanding" 
            type="number"
            value={lastYearStanding}
            onChange={(e) => setLastYearStanding(Number(e.target.value))}
            className="h-8"
          />
        </div>
        
        <div className="col-span-3 space-y-1">
          <Label htmlFor="points" className="text-xs">Points</Label>
          <Input 
            id="points" 
            type="number"
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            className="h-8"
          />
        </div>
        
        {/* Row 3 - Profile Image */}
        <div className="col-span-12 space-y-1">
          <Label htmlFor="image" className="text-xs">Profile Image</Label>
          <EnhancedImageUpload 
            currentImage={image}
            onImageChange={(url) => {
              console.log("Image URL changed:", url);
              setImage(url);
            }}
            name="riderImage"
            size="sm"
            compact={true}
          />
        </div>
      </div>
      
      <div className="flex justify-end space-x-2 mt-2">
        {onCancel && (
          <Button 
            type="button"
            variant="outline"
            onClick={onCancel}
            size="sm"
          >
            Cancel
          </Button>
        )}
        <Button 
          type="submit"
          disabled={isSubmitting}
          size="sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              Saving...
            </>
          ) : (
            "Save"
          )}
        </Button>
      </div>
    </form>
  );
}