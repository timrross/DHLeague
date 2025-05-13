import { Rider } from "@shared/schema";
import { X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { safeImageUrl, getInitials, getColorFromName } from "@/lib/utils";

interface TeamSummaryProps {
  selectedRiders: Rider[];
  toggleRiderSelection: (rider: Rider) => void;
}

export default function TeamSummary({ selectedRiders, toggleRiderSelection }: TeamSummaryProps) {
  // Count male and female riders
  const maleRidersCount = selectedRiders.filter(r => r.gender === "male").length;
  const femaleRidersCount = selectedRiders.filter(r => r.gender === "female").length;
  
  // Determine if composition is valid
  const isCompositionValid = selectedRiders.length <= 6 && 
                            maleRidersCount <= 4 && 
                            (selectedRiders.length === 6 ? femaleRidersCount >= 2 : true);

  return (
    <div>
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
      
      {/* Selected riders */}
      <div className="space-y-3 mb-5">
        <h4 className="font-heading font-semibold text-gray-700 text-sm">SELECTED RIDERS</h4>
        
        {selectedRiders.length === 0 && (
          <div className="bg-gray-100 rounded-md p-4 text-center text-gray-500 text-sm">
            No riders selected yet. Select up to 6 riders to build your team.
          </div>
        )}
        
        {selectedRiders.map((rider) => (
          <div key={rider.id} className="bg-white rounded-md p-3 shadow-sm flex justify-between items-center">
            <div className="flex items-center">
              <Avatar className={`w-8 h-8 border-2 mr-2 ${rider.gender === 'male' ? 'border-blue-300' : 'border-pink-300'}`}>
                <AvatarImage src={safeImageUrl(rider.image)} alt={rider.name} className="object-cover" />
                <AvatarFallback className={getColorFromName(rider.name)}>
                  {getInitials(rider.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h5 className="font-heading font-bold text-secondary text-sm">{rider.name}</h5>
                <span className={`${rider.gender === 'male' ? 'text-blue-600' : 'text-pink-600'} text-xs font-medium`}>
                  {rider.gender === 'male' ? 'Male' : 'Female'} • {rider.team}
                </span>
              </div>
            </div>
            <div className="flex items-center">
              <span className="font-accent font-semibold text-primary text-sm mr-2">${rider.cost.toLocaleString()}</span>
              <button 
                className="text-gray-400 hover:text-red-500 w-6 h-6 flex items-center justify-center transition duration-200"
                onClick={() => toggleRiderSelection(rider)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
