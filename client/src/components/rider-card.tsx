import { Rider } from "@shared/schema";
import { Check, Plus } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface RiderCardProps {
  rider: Rider;
  isSelected: boolean;
  onClick: () => void;
}

export default function RiderCard({ rider, isSelected, onClick }: RiderCardProps) {
  // Get rider initials for avatar
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  };

  // Format cost as currency
  const formatCost = (cost: number) => {
    return `$${cost.toLocaleString()}`;
  };

  return (
    <div 
      className={`border ${isSelected ? 'border-primary bg-red-50' : 'border-gray-200'} rounded-md p-3 hover:bg-gray-50 transition duration-200 cursor-pointer flex justify-between items-center`}
      onClick={onClick}
    >
      <div className="flex items-center">
        <Avatar className={`w-10 h-10 border-2 mr-3 ${isSelected ? 'border-primary' : 'border-transparent'}`}>
          <AvatarImage src={rider.image} alt={rider.name} className="object-cover" />
          <AvatarFallback className={`${isSelected ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}>
            {getInitials(rider.name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h4 className="font-heading font-bold text-secondary">{rider.name}</h4>
          <div className="flex items-center text-sm">
            <span className={`${rider.gender === 'male' ? 'text-blue-600' : 'text-pink-600'} font-medium mr-2`}>
              {rider.gender === 'male' ? 'Male' : 'Female'}
            </span>
            <span className="text-gray-600">{rider.team}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center">
        <span className="font-accent font-bold text-primary text-lg mr-3">{formatCost(rider.cost)}</span>
        <button 
          className={`${isSelected ? 'bg-green-500' : 'bg-primary'} text-white w-8 h-8 rounded-full flex items-center justify-center hover:${isSelected ? 'bg-green-600' : 'bg-red-700'} transition duration-200`}
          onClick={onClick}
        >
          {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
