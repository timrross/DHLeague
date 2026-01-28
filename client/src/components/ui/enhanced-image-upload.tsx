import { ImageUpload } from "@/components/ui/image-upload";

/**
 * Enhanced ImageUpload component that adapts to both old and new prop patterns
 * Allows for both sets of props to work seamlessly:
 * - Traditional props: currentImage, onImageChange, name
 * - Legacy props: endpoint, value, onChange
 */
interface EnhancedImageUploadProps {
  // Traditional props
  currentImage?: string;
  onImageChange?: (url: string) => void;
  name?: string;
  size?: "sm" | "md" | "lg";
  compact?: boolean;
  
  // Legacy props
  endpoint?: string; // Not used but kept for compatibility
  value?: string;
  onChange?: (url: string) => void;
}

export function EnhancedImageUpload({
  // Support both naming conventions
  currentImage,
  onImageChange,
  name = "",
  size = "md",
  compact = false,
  
  // Legacy props
  value,
  onChange,
}: EnhancedImageUploadProps) {
  // Prioritize traditional props if both are provided
  const finalImage = currentImage || value || "";
  const noop: (url: string) => void = () => {};
  const finalChangeHandler = onImageChange || onChange || noop;
  
  return (
    <ImageUpload
      currentImage={finalImage}
      onImageChange={finalChangeHandler}
      name={name}
      size={size}
      compact={compact}
    />
  );
}
