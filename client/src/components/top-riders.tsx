import { Card, CardContent } from "@/components/ui/card";
import { Rider } from "@shared/schema";
import { formatRiderDisplayName } from "@shared/utils";
import { safeImageUrl } from "@/lib/utils";

interface TopRidersProps {
  riders?: Rider[];
}

export default function TopRiders({ riders }: TopRidersProps) {
  const safeRiders = Array.isArray(riders) ? riders : [];
  const getPoints = (rider: Rider) => rider.points ?? 0;

  // Sort riders by points (descending) and take top 3
  const topRiders = [...safeRiders]
    .sort((a, b) => getPoints(b) - getPoints(a))
    .slice(0, 3);

  // Ensure we have a balanced representation of male/female riders
  const hasGenderBalance = topRiders.some(r => r.gender === "male") && 
                           topRiders.some(r => r.gender === "female");

  // If not balanced, manually ensure we have at least one rider of each gender
  let displayRiders = [...topRiders];
  if (!hasGenderBalance) {
    // Get top male and female riders
    const topMale = safeRiders
      .filter(r => r.gender === "male")
      .sort((a, b) => getPoints(b) - getPoints(a))[0];

    const topFemale = safeRiders
      .filter(r => r.gender === "female")
      .sort((a, b) => getPoints(b) - getPoints(a))[0];

    // Ensure we have both genders represented
    if (!topRiders.some(r => r.gender === "male") && topMale) {
      displayRiders = [topRiders[0], topRiders[1], topMale];
    } else if (!topRiders.some(r => r.gender === "female") && topFemale) {
      displayRiders = [topRiders[0], topRiders[1], topFemale];
    }
  }

  // Parse form values from JSON string
  const getFormArray = (formJson: string): (number | string)[] => {
    try {
      return JSON.parse(formJson || '[]');
    } catch (error) {
      return [];
    }
  };

  // Get CSS class for form indicators based on position
  const getFormClass = (pos: number | string): string => {
    if (pos === 0 || pos === 'D' || pos === 'DNF') return 'bg-red-500'; // DNF
    const numericPos = typeof pos === 'number' ? pos : Number(pos);
    if (!Number.isFinite(numericPos)) return 'bg-yellow-500';
    if (numericPos <= 3) return 'bg-green-500'; // Top 3
    if (numericPos <= 5) return 'bg-green-500'; // Top 5
    if (numericPos <= 10) return 'bg-yellow-500'; // Top 10
    return 'bg-yellow-500'; // Outside top 10
  };

  // Format position string
  const formatPosition = (pos: number | string): string => {
    if (pos === 0) return 'D';
    return String(pos);
  };

  return (
    <section>
      <h2 className="text-2xl md:text-3xl font-heading font-bold text-secondary mb-6">TOP PERFORMING RIDERS</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayRiders.map((rider) => {
          const formArray = getFormArray(rider.form ?? '[]');
          const displayName = formatRiderDisplayName(rider) || rider.name;
          
          return (
            <Card key={rider.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-40 bg-secondary relative overflow-hidden">
                <img 
                  src={safeImageUrl(rider.image) || `https://pixabay.com/get/g3a1af921072d00ed8251d3fe0d9eaeedfb61d355148715a2330a66168baf531a8f01cfc7aac1a2cab21a2271872ba386711d8b1dadd91c9a9928b09f0d99b440_1280.jpg`} 
                  alt={displayName} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <h3 className="font-heading normal-case font-bold text-xl">{displayName}</h3>
                  <p className="text-white/80 text-sm">{rider.team}</p>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-heading font-bold text-gray-700">STATS</span>
                  <span className="font-accent font-bold text-lg text-primary">${rider.cost.toLocaleString()}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Last Year Position:</span>
                    <span className="font-accent font-semibold">
                      {rider.lastYearStanding ? `${rider.lastYearStanding}${
                        rider.lastYearStanding === 1 ? 'st' : 
                        rider.lastYearStanding === 2 ? 'nd' : 
                        rider.lastYearStanding === 3 ? 'rd' : 'th'
                      }` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Season Points:</span>
                    <span className="font-accent font-semibold">{getPoints(rider)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Ownership:</span>
                    <span className="font-accent font-semibold">{Math.floor(Math.random() * 40) + 40}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Form:</span>
                    <div className="flex space-x-1">
                      {formArray.slice(0, 5).map((position, i) => (
                        <span 
                          key={i} 
                          className={`h-4 w-4 ${getFormClass(position)} rounded-full flex items-center justify-center text-white text-xs`}
                        >
                          {formatPosition(position)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
