import { useState, useEffect } from "react";
import { Rider } from "@shared/schema";
import { Check, Plus, X } from "lucide-react";
import RiderIdentity from "@/components/rider-identity";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface RiderCardProps {
  rider: Rider;
  isSelected?: boolean;
  selected?: boolean;  // For backward compatibility
  onClick: () => void;
  onRemove?: () => void;
  swapMode?: boolean;
  onSwap?: () => void;
  showRemoveIcon?: boolean;
  disabled?: boolean;
  showSelectIcon?: boolean;
  disabledReason?: string;
  showLockedBadge?: boolean;
}

export default function RiderCard({
  rider,
  isSelected,
  selected,
  onClick,
  onRemove,
  swapMode,
  onSwap,
  showRemoveIcon: _showRemoveIcon,
  disabled,
  showSelectIcon: _showSelectIcon,
  disabledReason,
  showLockedBadge = false,
}: RiderCardProps) {
  const [isHoveringSelected, setIsHoveringSelected] = useState(false);
  // For backward compatibility, use either isSelected or selected
  const isRiderSelected = isSelected !== undefined ? isSelected : (selected || false);
  const canRemove = isRiderSelected && onRemove && !showLockedBadge;

  // Reset hover state when selection changes to prevent showing X immediately after adding
  useEffect(() => {
    setIsHoveringSelected(false);
  }, [isRiderSelected]);
  // Format cost as currency
  const formatCost = (cost: number) => {
    return `$${cost.toLocaleString()}`;
  };

  // Get the color for the avatar background
  // Determine card style based on selected and injured status
  const cardBorderClass = isRiderSelected 
    ? 'border-primary bg-red-50' 
    : rider.injured 
      ? 'border-red-400 bg-red-50' 
      : 'border-gray-200';

  const cardContent = (
    <div 
      className={`border ${cardBorderClass} rounded-md p-3 hover:bg-gray-50 transition duration-200 
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} 
      flex flex-col sm:flex-row justify-between relative`}
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled}
    >
      {(rider.injured || showLockedBadge) && (
        <div className="absolute -top-2 -right-2 z-10 flex flex-col items-end gap-1">
          {rider.injured && (
            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-2 py-1 shadow-sm">
              INJURED
            </span>
          )}
          {showLockedBadge && (
            <span className="bg-slate-700 text-white text-[10px] font-bold rounded-full px-2 py-1 shadow-sm">
              LOCKED
            </span>
          )}
        </div>
      )}
      
      <div className="flex items-center mb-2 sm:mb-0">
        <RiderIdentity
          rider={rider}
          avatarSize="sm"
          avatarHighlight={isRiderSelected || rider.injured}
        />
      </div>
      <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto mt-2 sm:mt-0">
        <span className="font-accent font-bold text-primary text-lg mr-3">{formatCost(rider.cost)}</span>
        
        {/* Swap button when in swap mode */}
        {swapMode && isRiderSelected && onSwap && (
          <button 
            className="bg-blue-500 text-white w-11 h-11 rounded-full flex items-center justify-center transition duration-200 hover:bg-blue-600"
            onClick={(e) => {
              e.stopPropagation(); // Prevent event bubbling
              onSwap();
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
            </svg>
          </button>
        )}
        
        {/* Standard add/remove button */}
        {(!swapMode || !isRiderSelected || !onSwap) && (
          <button
            className={`${
              isRiderSelected
                ? canRemove && isHoveringSelected
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-green-500 hover:bg-green-600'
                : 'bg-primary hover:bg-red-700'
            } text-white w-11 h-11 rounded-full flex items-center justify-center transition duration-200`}
            onClick={(e) => {
              e.stopPropagation();
              if (canRemove) {
                onRemove();
              } else if (!disabled) {
                onClick();
              }
            }}
            onMouseEnter={() => setIsHoveringSelected(true)}
            onMouseLeave={() => setIsHoveringSelected(false)}
            disabled={disabled && !canRemove}
            aria-label={isRiderSelected ? (canRemove ? "Remove rider" : "Selected") : "Add rider"}
          >
            {isRiderSelected ? (
              canRemove && isHoveringSelected ? (
                <X className="h-4 w-4" />
              ) : (
                <Check className="h-4 w-4" />
              )
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );

  if (!disabledReason) {
    return cardContent;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
      <TooltipContent className="border-amber-200 bg-amber-50 text-amber-900 text-[13px]">
        {disabledReason}
      </TooltipContent>
    </Tooltip>
  );
}
