import { LeaderboardEntry } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface LeaderboardTableProps {
  leaderboard: LeaderboardEntry[];
  userId?: string;
}

export default function LeaderboardTable({ leaderboard, userId }: LeaderboardTableProps) {
  // Get initials for avatar fallback
  const getInitials = (name: string): string => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  // Get ordinal suffix for rank
  const getOrdinalSuffix = (rank: number): string => {
    if (rank === 1) return "st";
    if (rank === 2) return "nd";
    if (rank === 3) return "rd";
    return "th";
  };

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No leaderboard data available yet.</p>
        <p className="text-sm text-gray-400 mt-2">Check back after the first race of the season!</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-gray-100">
          <tr>
            <th className="py-3 px-4 text-left font-heading font-bold text-gray-700">RANK</th>
            <th className="py-3 px-4 text-left font-heading font-bold text-gray-700">MANAGER</th>
            <th className="py-3 px-4 text-left font-heading font-bold text-gray-700">TOTAL</th>
            <th className="py-3 px-4 text-left font-heading font-bold text-gray-700">WINS</th>
            <th className="py-3 px-4 text-left font-heading font-bold text-gray-700">BEST RACE</th>
            <th className="py-3 px-4 text-left font-heading font-bold text-gray-700">PODIUMS</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((entry) => {
            const isCurrentUser = userId && entry.user.id === userId;
            return (
              <tr
                key={entry.user.id}
                className={`border-b border-gray-200 hover:bg-gray-50 transition ${
                  isCurrentUser ? 'bg-yellow-50' : ''
                }`}
              >
                <td className="py-3 px-4">
                  <span className={`font-accent font-bold text-secondary inline-block w-8 h-8 rounded-full ${
                    entry.rank <= 3 ? 'bg-yellow-200' : 'bg-gray-100'
                  } text-center leading-8`}>
                    {entry.rank}
                  </span>
                </td>
                <td className="py-3 px-4 flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage
                      src={entry.user.profileImageUrl || undefined}
                      alt={entry.user.firstName || "User"}
                    />
                    <AvatarFallback className="bg-primary text-white text-xs">
                      {getInitials(entry.user.firstName || entry.user.email || "User")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-gray-700">
                    {isCurrentUser ? 'You' : (entry.user.firstName || entry.user.email || 'Anonymous')}
                  </span>
                </td>
                <td className="py-3 px-4 font-accent font-bold text-primary">
                  {entry.totalPoints}
                </td>
                <td className="py-3 px-4 font-accent font-medium text-gray-700">
                  {entry.raceWins}
                </td>
                <td className="py-3 px-4 font-accent font-medium text-gray-700">
                  {entry.highestSingleRaceScore}
                </td>
                <td className="py-3 px-4 font-accent font-medium text-gray-700">
                  {entry.podiumFinishes}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
