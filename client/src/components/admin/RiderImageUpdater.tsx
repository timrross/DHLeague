import React, { useState } from 'react';
import { Rider } from '@shared/schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { EnhancedImageUpload } from "@/components/ui/enhanced-image-upload";
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface RiderImageUpdaterProps {
  rider: Rider;
  onSuccess?: () => void;
}

export function RiderImageUpdater({ rider, onSuccess }: RiderImageUpdaterProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [imageUrl, setImageUrl] = useState<string>(rider.image || '');
  const [isChanged, setIsChanged] = useState(false);

  // Update rider image mutation
  const updateImageMutation = useMutation({
    mutationFn: async () => {
      // Create an object with only id and image to update
      const updateData = {
        id: rider.id,
        image: imageUrl
      };
      
      console.log("Updating rider image with:", updateData);
      
      return apiRequest(`/api/riders/${rider.id}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/riders"] });
      toast({
        title: "Success",
        description: "Rider image updated successfully",
      });
      if (onSuccess) onSuccess();
      setIsChanged(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update image: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  // Handle image change
  const handleImageChange = (url: string) => {
    console.log("Image changed to:", url);
    setImageUrl(url);
    setIsChanged(true);
  };

  // Handle save
  const handleSave = () => {
    if (!imageUrl) {
      toast({
        title: "Error",
        description: "Please select an image first",
        variant: "destructive",
      });
      return;
    }
    
    updateImageMutation.mutate();
  };

  return (
    <div className="space-y-4">
      <EnhancedImageUpload
        currentImage={imageUrl}
        onImageChange={handleImageChange}
        name={rider.name}
      />
      
      {isChanged && (
        <div className="flex justify-end">
          <Button 
            onClick={handleSave}
            disabled={updateImageMutation.isPending}
          >
            {updateImageMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Image"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}