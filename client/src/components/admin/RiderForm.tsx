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
} from '@/components/ui/select';
import { ImageUploadAdapter as ImageUpload } from '@/components/ui/image-upload-adapter';

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
  const [riderGender, setRiderGender] = useState(initialData.gender || '');
  const [riderTeam, setRiderTeam] = useState(initialData.team || '');
  const [riderCountry, setRiderCountry] = useState(initialData.country || '');
  const [riderImage, setRiderImage] = useState(initialData.image || '');
  const [riderCost, setRiderCost] = useState(initialData.cost ? initialData.cost.toString() : '');
  const [riderPoints, setRiderPoints] = useState(initialData.points ? initialData.points.toString() : '');

  // Update form if initialData changes (like when editing a different rider)
  useEffect(() => {
    setRiderName(initialData.name || '');
    setRiderGender(initialData.gender || '');
    setRiderTeam(initialData.team || '');
    setRiderCountry(initialData.country || '');
    setRiderImage(initialData.image || '');
    setRiderCost(initialData.cost ? initialData.cost.toString() : '');
    setRiderPoints(initialData.points ? initialData.points.toString() : '');
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const riderData = {
      ...(initialData.id ? { id: initialData.id } : {}),
      name: riderName,
      gender: riderGender,
      team: riderTeam,
      country: riderCountry,
      image: riderImage,
      cost: parseInt(riderCost, 10),
      points: riderPoints ? parseInt(riderPoints, 10) : 0
    };
    
    onSubmit(riderData);
  };

  // For grid layout, use more columns in compact mode
  const gridCols = compact ? "grid-cols-12" : "grid-cols-2";

  return (
    <form onSubmit={handleSubmit}>
      <div className={`grid ${gridCols} gap-4 mb-4`}>
        {/* Rider Name */}
        <div className={`space-y-2 ${compact ? "col-span-6" : ""}`}>
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
        <div className={`space-y-2 ${compact ? "col-span-3" : ""}`}>
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
        {/* Team */}
        <div className={`space-y-2 ${compact ? "col-span-3" : ""}`}>
          <Label htmlFor="riderTeam">Team</Label>
          <Input 
            id="riderTeam" 
            placeholder="MS Mondraker Team"
            value={riderTeam}
            onChange={(e) => setRiderTeam(e.target.value)}
          />
        </div>
        {/* Country */}
        <div className={`space-y-2 ${compact ? "col-span-3" : ""}`}>
          <Label htmlFor="riderCountry">Country</Label>
          <Input 
            id="riderCountry" 
            placeholder="France"
            value={riderCountry}
            onChange={(e) => setRiderCountry(e.target.value)}
          />
        </div>
        {/* Cost */}
        <div className={`space-y-2 ${compact ? "col-span-3" : ""}`}>
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
        <div className={`space-y-2 ${compact ? "col-span-3" : ""}`}>
          <Label htmlFor="riderPoints">Current Points</Label>
          <Input 
            id="riderPoints" 
            type="number"
            placeholder="0"
            value={riderPoints}
            onChange={(e) => setRiderPoints(e.target.value)}
          />
        </div>
        {/* Image */}
        <div className={`space-y-2 ${compact ? "col-span-3" : ""}`}>
          <Label htmlFor="riderImage">Profile Image</Label>
          <ImageUpload
            endpoint="riderImage"
            value={riderImage}
            onChange={setRiderImage}
            name={riderName}
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