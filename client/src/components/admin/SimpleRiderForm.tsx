import React, { useState, useEffect } from 'react';
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

interface RiderFormProps {
  initialData: any;
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
  const [formData, setFormData] = useState({
    id: initialData.id || null,
    name: initialData.name || '',
    team: initialData.team || '',
    country: initialData.country || '',
    gender: initialData.gender || 'male',
    cost: initialData.cost || 0,
    lastYearStanding: initialData.lastYearStanding || 0,
    points: initialData.points || 0,
    image: initialData.image || '',
  });

  // Keep form in sync with props
  useEffect(() => {
    setFormData({
      id: initialData.id || null,
      name: initialData.name || '',
      team: initialData.team || '',
      country: initialData.country || '',
      gender: initialData.gender || 'male',
      cost: initialData.cost || 0,
      lastYearStanding: initialData.lastYearStanding || 0,
      points: initialData.points || 0,
      image: initialData.image || '',
    });
  }, [initialData]);

  const handleChange = (field: string, value: any) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert numeric fields to numbers
    const data = {
      ...formData,
      cost: Number(formData.cost),
      lastYearStanding: Number(formData.lastYearStanding),
      points: Number(formData.points),
    };
    
    // Log what's being submitted
    console.log('Submitting form data:', data);
    
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Rider Name*</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="team">Team*</Label>
          <Input
            id="team"
            value={formData.team}
            onChange={(e) => handleChange('team', e.target.value)}
            required
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            value={formData.country || ''}
            onChange={(e) => handleChange('country', e.target.value)}
          />
        </div>
        
        <div>
          <Label htmlFor="gender">Gender*</Label>
          <Select 
            value={formData.gender} 
            onValueChange={(value) => handleChange('gender', value)}
          >
            <SelectTrigger id="gender">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="cost">Cost* ($)</Label>
          <Input
            id="cost"
            type="number"
            value={formData.cost}
            onChange={(e) => handleChange('cost', e.target.value)}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="lastYearStanding">Last Year Standing</Label>
          <Input
            id="lastYearStanding"
            type="number"
            value={formData.lastYearStanding || 0}
            onChange={(e) => handleChange('lastYearStanding', e.target.value)}
          />
        </div>
        
        <div>
          <Label htmlFor="points">Points</Label>
          <Input
            id="points"
            type="number"
            value={formData.points || 0}
            onChange={(e) => handleChange('points', e.target.value)}
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="image">Profile Image URL</Label>
        <Input
          id="image"
          value={formData.image || ''}
          onChange={(e) => handleChange('image', e.target.value)}
          placeholder="https://example.com/image.jpg"
        />
        <p className="text-xs text-gray-500 mt-1">
          Enter the URL for the rider's profile picture
        </p>
      </div>
      
      <div className="flex justify-end space-x-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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