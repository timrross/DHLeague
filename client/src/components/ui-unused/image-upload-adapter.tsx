import { ImageUpload } from "./image-upload";

// This adapter component converts from the old props naming to the new props naming
interface ImageUploadAdapterProps {
  endpoint?: string; // Not used, just for compatibility
  value: string;
  onChange: (value: string) => void;
  name?: string;
}

export function ImageUploadAdapter({ 
  value, 
  onChange, 
  name = ""
}: ImageUploadAdapterProps) {
  // Simply pass through to ImageUpload with renamed props
  return (
    <ImageUpload
      currentImage={value}
      onImageChange={onChange}
      name={name}
    />
  );
}