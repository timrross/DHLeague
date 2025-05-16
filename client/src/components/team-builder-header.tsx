import { Info } from "lucide-react";

interface TeamBuilderHeaderProps {
  isAuthenticated: boolean;
  authLoading: boolean;
}

export default function TeamBuilderHeader({ isAuthenticated, authLoading }: TeamBuilderHeaderProps) {
  return (
    <>
      <h2 className="text-2xl md:text-3xl font-heading font-bold text-secondary mb-6">
        TEAM BUILDER
      </h2>
      
      {/* Guest banner */}
      {!isAuthenticated && !authLoading && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-md">
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-3">
              <Info className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-800">Guest Mode</h3>
              <p className="text-sm text-blue-700 mt-1">
                You're building a team in guest mode. Create an account to save your team and join the 2025 fantasy league!
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}