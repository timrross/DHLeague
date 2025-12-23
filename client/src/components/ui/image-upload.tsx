import { useState, useRef, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Upload, Link, X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { safeImageUrl, getInitials, getColorFromName } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

// Define the expected response type from the image upload API
interface ImageUploadResponse {
  imageUrl: string;
}

interface ImageUploadProps {
  currentImage?: string | null;
  onImageChange: (url: string) => void;
  name?: string; // Optional name to use for avatar fallback
  size?: "sm" | "md" | "lg"; // Size of the avatar
  compact?: boolean; // If true, uses a more compact layout
}

export function ImageUpload({ 
  currentImage, 
  onImageChange, 
  name = "",
  size = "md",
  compact = false
}: ImageUploadProps) {
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(currentImage || null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadError(null);
    setIsUploading(true);
    setUploadProgress(10);

    try {
      const file = files[0];
      
      // Create a form data object
      const formData = new FormData();
      formData.append("file", file);

      // Upload the file
      setUploadProgress(30);
      const response = await apiRequest<ImageUploadResponse>("/api/upload-image", {
        method: "POST",
        body: formData,
        headers: {
          // Don't set Content-Type header with FormData
          // Browser will set it automatically with boundary
        },
      });

      setUploadProgress(100);
      
      // Update the image URL
      if (response && response.imageUrl) {
        setPreviewImage(response.imageUrl);
        onImageChange(response.imageUrl);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadError("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle URL submission
  const handleUrlSubmit = async () => {
    if (!imageUrl.trim()) return;

    setUploadError(null);
    setIsUploading(true);
    setUploadProgress(10);

    try {
      // Check URL format
      if (!imageUrl.match(/^https?:\/\/.+\/.+$/i)) {
        throw new Error("Invalid URL format");
      }

      // Create a form data object
      const formData = new FormData();
      formData.append("imageUrl", imageUrl);

      // Send the URL to the server
      setUploadProgress(30);
      const response = await apiRequest<ImageUploadResponse>("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(100);
      
      // Update the image URL
      if (response && typeof response === 'object' && 'imageUrl' in response) {
        setPreviewImage(response.imageUrl);
        onImageChange(response.imageUrl);
        setImageUrl("");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("URL import failed:", error);
      setUploadError("Failed to import image from URL. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // Clear the image
  const handleClearImage = () => {
    setPreviewImage(null);
    onImageChange("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      {/* Preview area */}
      {previewImage ? (
        <div className="flex items-center space-x-4">
          <Avatar className={`rounded-md border ${
            size === "sm" ? "w-16 h-16" : 
            size === "lg" ? "w-32 h-32" : 
            "w-24 h-24"
          }`}>
            <AvatarImage 
              src={safeImageUrl(previewImage)} 
              alt="Profile" 
              className="object-cover w-full h-full"
            />
            <AvatarFallback 
              className={`${getColorFromName(name)} text-white ${
                size === "sm" ? "text-base" : 
                size === "lg" ? "text-2xl" : 
                "text-xl"
              } w-full h-full rounded-md flex items-center justify-center`}
            >
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Current image</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-red-500 hover:text-red-700"
              onClick={handleClearImage}
            >
              <X className="h-4 w-4 mr-1" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center space-x-4">
          <Avatar className={`rounded-md border bg-gray-100 ${
            size === "sm" ? "w-16 h-16" : 
            size === "lg" ? "w-32 h-32" : 
            "w-24 h-24"
          }`}>
            <AvatarFallback 
              className={`${getColorFromName(name)} text-white ${
                size === "sm" ? "text-base" : 
                size === "lg" ? "text-2xl" : 
                "text-xl"
              } w-full h-full rounded-md flex items-center justify-center`}
            >
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm text-gray-600">No image selected</p>
            <p className="text-xs text-gray-500">The rider's initials will be shown instead</p>
          </div>
        </div>
      )}

      {/* Tabs for upload options */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full grid-cols-2 ${compact ? "text-xs" : ""}`}>
          <TabsTrigger value="upload">
            <Upload className={`${compact ? "h-3 w-3 mr-1" : "h-4 w-4 mr-2"}`} /> Upload File
          </TabsTrigger>
          <TabsTrigger value="url">
            <Link className={`${compact ? "h-3 w-3 mr-1" : "h-4 w-4 mr-2"}`} /> Image URL
          </TabsTrigger>
        </TabsList>
        
        {/* File Upload Content */}
        <TabsContent value="upload" className={compact ? "space-y-2 pt-2" : "space-y-4"}>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            {!compact && <Label htmlFor="picture">Profile Picture</Label>}
            <Input
              id="picture"
              type="file"
              disabled={isUploading}
              accept="image/*"
              onChange={handleFileChange}
              ref={fileInputRef}
              className={compact ? "h-8 text-xs py-1" : ""}
            />
            {!compact && (
              <p className="text-xs text-gray-500">
                Accepted formats: JPG, PNG, WebP (max 5MB)
              </p>
            )}
          </div>
        </TabsContent>
        
        {/* URL Content */}
        <TabsContent value="url" className={compact ? "space-y-2 pt-2" : "space-y-4"}>
          <div className="grid w-full items-center gap-1.5">
            {!compact && <Label htmlFor="imageUrl">Image URL</Label>}
            <div className="flex space-x-2">
              <Input
                id="imageUrl"
                type="url"
                placeholder="https://example.com/image.jpg"
                disabled={isUploading}
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className={compact ? "h-8 text-xs py-1" : ""}
              />
              <Button 
                onClick={handleUrlSubmit} 
                disabled={isUploading || !imageUrl.trim()}
                size={compact ? "sm" : "default"}
              >
                {isUploading ? (
                  <Loader2 className={compact ? "h-3 w-3 animate-spin" : "h-4 w-4 animate-spin"} />
                ) : "Import"}
              </Button>
            </div>
            {!compact && (
              <p className="text-xs text-gray-500">
                Enter the URL of an existing image to import it
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Upload Progress and Error Message */}
      {isUploading && (
        <div className={`w-full bg-gray-200 rounded-full ${compact ? 'h-1 mt-1 mb-1' : 'h-1.5 mb-4'}`}>
          <div
            className="bg-primary rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%`, height: compact ? '4px' : '6px' }}
          ></div>
        </div>
      )}
      
      {uploadError && (
        <p className={`text-red-500 ${compact ? 'text-xs mt-1' : 'text-sm mt-2'}`}>
          {uploadError}
        </p>
      )}
    </div>
  );
}
