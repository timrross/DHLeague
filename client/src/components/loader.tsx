import { RefreshCw } from "lucide-react";

interface LoaderProps {
  message?: string;
}

export default function Loader({ message = "Loading..." }: LoaderProps) {
  return (
    <div className="flex justify-center items-center py-10">
      <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      <span className="ml-2">{message}</span>
    </div>
  );
}