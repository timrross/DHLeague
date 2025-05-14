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
  initialData?: Partial<Rider>;
  onSubmit: (data: any) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitButtonText?: string;
  cancelButtonText?: string;
  compact?: boolean;
}

export default function RiderForm({
  initialData = {},
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitButtonText = "Submit",
  cancelButtonText = "Cancel",
  compact = false
}: RiderFormProps) {
  // Initialize state with initial data or defaults
  const [riderName, setRiderName] = useState(initialData.name || '');
  const [team, setTeam] = useState(initialData.team || '');
  const [nationality, setNationality] = useState(initialData.nationality || '');
  const [gender, setGender] = useState(initialData.gender || 'male');
  const [cost, setCost] = useState<number>(initialData.cost || 0);
  const [ranking, setRanking] = useState<number>(initialData.ranking || 0);
  const [points, setPoints] = useState<number>(initialData.points || 0);
  const [profileImageUrl, setProfileImageUrl] = useState(initialData.profileImageUrl || '');

  // Update form if initialData changes (like when editing a different rider)
  useEffect(() => {
    setRiderName(initialData.name || '');
    setTeam(initialData.team || '');
    setNationality(initialData.nationality || '');
    setGender(initialData.gender || 'male');
    setCost(initialData.cost || 0);
    setRanking(initialData.ranking || 0);
    setPoints(initialData.points || 0);
    setProfileImageUrl(initialData.profileImageUrl || '');
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const riderData = {
      ...(initialData.id ? { id: initialData.id } : {}),
      name: riderName,
      team,
      nationality,
      gender,
      cost: Number(cost),
      ranking: Number(ranking),
      points: Number(points),
      profileImageUrl
    };
    
    onSubmit(riderData);
  };

  // For grid layout, use more columns in compact mode
  const gridCols = compact ? "grid-cols-12" : "grid-cols-2";

  return (
    <form onSubmit={handleSubmit}>
      <div className={`grid ${gridCols} gap-4 mb-4`}>
        {/* Rider Name */}
        <div className={`space-y-2 ${compact ? "col-span-4" : ""}`}>
          <Label htmlFor="riderName">Rider Name*</Label>
          <Input 
            id="riderName" 
            placeholder="John Smith"
            value={riderName}
            onChange={(e) => setRiderName(e.target.value)}
            required
          />
        </div>
        
        {/* Team */}
        <div className={`space-y-2 ${compact ? "col-span-4" : ""}`}>
          <Label htmlFor="team">Team*</Label>
          <Input 
            id="team" 
            placeholder="Team A"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            required
          />
        </div>
        
        {/* Nationality */}
        <div className={`space-y-2 ${compact ? "col-span-4" : ""}`}>
          <Label htmlFor="nationality">Nationality*</Label>
          <Input 
            id="nationality" 
            placeholder="USA"
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            required
          />
        </div>
        
        {/* Gender Select */}
        <div className={`space-y-2 ${compact ? "col-span-3" : ""}`}>
          <Label htmlFor="gender">Gender*</Label>
          <Select 
            value={gender} 
            onValueChange={setGender}
          >
            <SelectTrigger id="gender" className="w-full">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Cost */}
        <div className={`space-y-2 ${compact ? "col-span-3" : ""}`}>
          <Label htmlFor="cost">Cost* ($)</Label>
          <Input 
            id="cost" 
            type="number"
            value={cost}
            onChange={(e) => setCost(Number(e.target.value))}
            required
          />
        </div>
        
        {/* Ranking */}
        <div className={`space-y-2 ${compact ? "col-span-3" : ""}`}>
          <Label htmlFor="ranking">Ranking</Label>
          <Input 
            id="ranking" 
            type="number"
            value={ranking}
            onChange={(e) => setRanking(Number(e.target.value))}
          />
        </div>
        
        {/* Points */}
        <div className={`space-y-2 ${compact ? "col-span-3" : ""}`}>
          <Label htmlFor="points">Points</Label>
          <Input 
            id="points" 
            type="number"
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
          />
        </div>
        
        {/* Profile Image */}
        <div className={`space-y-2 ${compact ? "col-span-12" : ""}`}>
          <Label htmlFor="profileImageUrl">Profile Image</Label>
          <EnhancedImageUpload 
            currentImage={profileImageUrl}
            onImageChange={setProfileImageUrl}
            name="riderImage"
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