import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Race } from "@shared/schema";

interface RaceCardProps {
  race: Race;
  index: number;
}

export default function RaceCard({ race, index }: RaceCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric'
    });
  };

  // Determine status class
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'next':
        return 'bg-blue-100 text-blue-800';
      case 'upcoming':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Determine status text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'next':
        return 'Next Race';
      case 'upcoming':
        return 'Upcoming';
      default:
        return status;
    }
  };

  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50 transition">
      <td className="py-3 px-4 font-accent font-bold text-gray-700">{index + 1}</td>
      <td className="py-3 px-4 font-heading font-semibold text-secondary">
        <a href={`#race-${race.id}`} className="hover:text-primary transition">{race.name}</a>
      </td>
      <td className="py-3 px-4 text-gray-700">{race.country}</td>
      <td className="py-3 px-4 font-accent text-gray-700">
        {formatDate(race.startDate.toString())} - {formatDate(race.endDate.toString())}
      </td>
      <td className="py-3 px-4">
        <Badge className={`inline-block text-xs px-2 py-1 rounded-full font-semibold ${getStatusClass(race.status)}`}>
          {getStatusText(race.status)}
        </Badge>
      </td>
    </tr>
  );
}
