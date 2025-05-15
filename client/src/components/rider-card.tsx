import { Rider } from "@shared/schema";
import { Check, Plus } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { safeImageUrl, getInitials, getColorFromName } from "@/lib/utils";

interface RiderCardProps {
  rider: Rider;
  isSelected: boolean;
  onClick: () => void;
}

export default function RiderCard({ rider, isSelected, onClick }: RiderCardProps) {
  // Format cost as currency
  const formatCost = (cost: number) => {
    return `$${cost.toLocaleString()}`;
  };

  // Get the color for the avatar background
  const avatarBgColor = isSelected 
    ? 'bg-primary' 
    : getColorFromName(rider.name);
    
  // Determine card style based on selected and injured status
  const cardBorderClass = isSelected 
    ? 'border-primary bg-red-50' 
    : rider.injured 
      ? 'border-red-400 bg-red-50' 
      : 'border-gray-200';

  return (
    <div 
      className={`border ${cardBorderClass} rounded-md p-3 hover:bg-gray-50 transition duration-200 cursor-pointer flex flex-col sm:flex-row justify-between relative`}
      onClick={onClick}
    >
      {/* Injured badge */}
      {rider.injured && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full px-2 py-1 shadow-sm z-10">
          INJURED
        </div>
      )}
      
      <div className="flex items-center mb-2 sm:mb-0">
        <Avatar className={`w-10 h-10 border-2 mr-3 flex-shrink-0 ${isSelected ? 'border-primary' : rider.injured ? 'border-red-400' : 'border-transparent'}`}>
          <AvatarImage src={safeImageUrl(rider.image)} alt={rider.name} className="object-cover" />
          <AvatarFallback className={`${avatarBgColor} text-white`}>
            {getInitials(rider.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h4 className="font-heading font-bold text-secondary truncate">{rider.name}</h4>
          <div className="flex flex-wrap items-center text-sm">
            <span className={`${rider.gender === 'male' ? 'text-blue-600' : 'text-pink-600'} font-medium mr-2`}>
              {rider.gender === 'male' ? 'Male' : 'Female'}
            </span>
            <span className="text-gray-600 truncate">{rider.team}</span>
            {rider.injured && (
              <span className="ml-2 text-red-600 font-medium text-xs">Injured</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto mt-2 sm:mt-0">
        <span className="font-accent font-bold text-primary text-lg mr-3">{formatCost(rider.cost)}</span>
        <button 
          className={`${isSelected ? 'bg-green-500' : 'bg-primary'} text-white w-8 h-8 rounded-full flex items-center justify-center transition duration-200 ${isSelected ? 'hover:bg-green-600' : 'hover:bg-red-700'}`}
          onClick={(e) => {
            e.stopPropagation(); // Prevent event bubbling
            onClick();
          }}
        >
          {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
