import { Rider } from "@shared/schema";
import { X, RefreshCw } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRiderDisplayName } from "@shared/utils";
import { safeImageUrl, getInitials, getColorFromName } from "@/lib/utils";

interface TeamSummaryProps {
  selectedRiders: Rider[];
  toggleRiderSelection?: (rider: Rider) => void;
  totalBudget?: number;
  usedBudget?: number;
  remainingBudget?: number;
  budgetPercentage?: number;
  maleRidersCount?: number;
  femaleRidersCount?: number;
  isTeamLocked?: boolean;
  swapsRemaining?: number;
  swapMode?: boolean;
  initiateSwap?: (rider: Rider) => void;
  cancelSwap?: () => void;
  swapRider?: Rider | null;
}

export default function TeamSummary({ 
  selectedRiders, 
  toggleRiderSelection,
  totalBudget,
  usedBudget,
  remainingBudget,
  budgetPercentage,
  maleRidersCount: externalMaleCount,
  femaleRidersCount: externalFemaleCount,
  isTeamLocked = false,
  swapsRemaining = 0,
  swapMode = false,
  initiateSwap,
  cancelSwap,
  swapRider = null
}: TeamSummaryProps) {
  // Count male and female riders if not explicitly provided
  const calculatedMaleRidersCount = selectedRiders.filter(r => r.gender === "male").length;
  const calculatedFemaleRidersCount = selectedRiders.filter(r => r.gender === "female").length;
  
  // Use provided counts or calculated ones
  const maleRidersCount = externalMaleCount !== undefined ? externalMaleCount : calculatedMaleRidersCount;
  const femaleRidersCount = externalFemaleCount !== undefined ? externalFemaleCount : calculatedFemaleRidersCount;
  
  // Determine if composition is valid
  const isCompositionValid = selectedRiders.length <= 6 && 
                            maleRidersCount <= 4 && 
                            (selectedRiders.length === 6 ? femaleRidersCount >= 2 : true);

  return (
    <div className="w-full">
      {/* Team composition */}
      <div className="mb-5">
        <div className="flex justify-between text-sm mb-1">
          <span className="font-semibold text-gray-700">Team Composition</span>
          <span className="font-accent font-semibold text-gray-700">
            {selectedRiders.length}/6 Riders
          </span>
        </div>
        <div className="flex space-x-1">
          {/* Render 6 slots representing the team */}
          {[...Array(6)].map((_, index) => {
            const rider = selectedRiders[index];
            const isMale = rider ? rider.gender === "male" : false;
            const isFemale = rider ? rider.gender === "female" : false;
            
            return (
              <div 
                key={index} 
                className={`h-2 ${
                  isMale ? 'bg-blue-500' : 
                  isFemale ? 'bg-pink-500' : 
                  'bg-gray-200'
                } ${index === 0 ? 'rounded-l-full' : ''} ${
                  index === 5 ? 'rounded-r-full' : ''
                } flex-1`}
              ></div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span className={maleRidersCount > 4 ? 'text-red-500 font-semibold' : ''}>
            {maleRidersCount} Men (Max 4)
          </span>
          <span className={selectedRiders.length === 6 && femaleRidersCount < 2 ? 'text-red-500 font-semibold' : ''}>
            {femaleRidersCount} Women (Min 2)
          </span>
        </div>
      </div>
      
      {/* Budget information */}
      {totalBudget && usedBudget && remainingBudget && budgetPercentage !== undefined && (
        <div className="mb-5">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-semibold text-gray-700">Budget</span>
            <span className="font-accent font-semibold text-gray-700">
              ${remainingBudget.toLocaleString()} remaining
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full ${
                budgetPercentage > 95 ? 'bg-red-500' : 'bg-primary'
              }`}
              style={{ width: `${budgetPercentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>${usedBudget.toLocaleString()} used</span>
            <span>${totalBudget.toLocaleString()} total</span>
          </div>
        </div>
      )}
      
      {/* Selected riders */}
      <div className="space-y-3 mb-5 w-full max-w-full overflow-hidden">
        <div className="flex justify-between items-center">
          <h4 className="font-heading font-semibold text-gray-700 text-sm">SELECTED RIDERS</h4>
          
          {isTeamLocked && (
            <Badge variant={swapMode ? "destructive" : "default"}>
              {swapMode ? "Selecting Swap" : `${swapsRemaining} Swap${swapsRemaining !== 1 ? 's' : ''} Left`}
            </Badge>
          )}
        </div>
        
        {swapMode && swapRider && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4 text-amber-600" />
                <span>Select a rider to replace <strong>{formatRiderDisplayName(swapRider) || swapRider.name}</strong></span>
              </div>
              {cancelSwap && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={cancelSwap}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}
        
        {selectedRiders.length === 0 && (
          <div className="bg-gray-100 rounded-md p-4 text-center text-gray-500 text-sm">
            No riders selected yet. Select up to 6 riders to build your team.
          </div>
        )}
        
        {selectedRiders.map((rider) => {
          const displayName = formatRiderDisplayName(rider) || rider.name;

          return (
          <div 
            key={rider.id} 
            className={`bg-white rounded-md p-3 shadow-sm flex flex-col md:flex-row justify-between relative overflow-hidden ${
              swapRider?.id === rider.id 
                ? 'ring-2 ring-amber-400' 
                : rider.injured 
                  ? 'ring-2 ring-red-400 bg-red-50' 
                  : ''
            }`}
          >
            {rider.injured && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full px-2 py-1 shadow-sm z-10">
                INJURED
              </div>
            )}
            <div className="flex items-center mb-2 md:mb-0 max-w-full lg:max-w-[60%] xl:max-w-[70%]">
              <Avatar className={`w-8 h-8 border-2 mr-2 flex-shrink-0 ${
                rider.injured 
                  ? 'border-red-400' 
                  : rider.gender === 'male' 
                    ? 'border-blue-300' 
                    : 'border-pink-300'
              }`}>
                <AvatarImage src={safeImageUrl(rider.image)} alt={displayName} className="object-cover" />
                <AvatarFallback className={getColorFromName(displayName)}>
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 truncate">
                <h5 className="font-heading normal-case font-bold text-secondary text-sm truncate">{displayName}</h5>
                <div className="flex items-center flex-wrap">
                  <span className={`${rider.gender === 'male' ? 'text-blue-600' : 'text-pink-600'} text-xs font-medium truncate`}>
                    {rider.gender === 'male' ? 'Male' : 'Female'} • {rider.team}
                  </span>
                  {rider.injured && (
                    <span className="ml-1 text-red-600 font-medium text-xs">• Injured</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between md:justify-end w-full md:w-auto mt-2 md:mt-0 flex-shrink-0">
              <span className="font-accent font-semibold text-primary text-sm mr-2">${rider.cost.toLocaleString()}</span>
              
              {isTeamLocked ? (
                initiateSwap && (
                  <button 
                    className="text-gray-400 hover:text-blue-500 w-8 h-8 flex items-center justify-center transition duration-200"
                    onClick={() => initiateSwap(rider)}
                    disabled={swapMode}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                )
              ) : (
                toggleRiderSelection && (
                  <button 
                    className="text-gray-400 hover:text-red-500 w-8 h-8 flex items-center justify-center transition duration-200"
                    onClick={() => toggleRiderSelection(rider)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
