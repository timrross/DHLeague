import type { KeyboardEvent } from "react";
import { LeaderboardEntry } from "@shared/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLocation } from "wouter";
import { FriendButton } from "@/components/friend-button";

interface LeaderboardTableProps {
  leaderboard: LeaderboardEntry[];
  userId?: string;
  showFriendButton?: boolean;
}

export default function LeaderboardTable({ leaderboard, userId, showFriendButton = false }: LeaderboardTableProps) {
  const [, setLocation] = useLocation();

  const getInitials = (value: string | null | undefined): string => {
    if (!value) return "U";
    return value
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  const navigateToUserTeam = (targetUserId: string) => {
    setLocation(`/users/${targetUserId}/team`);
  };

  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, targetUserId: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigateToUserTeam(targetUserId);
    }
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
            <th className="py-3 px-4 text-left font-heading font-bold text-gray-700">TEAM</th>
            <th className="py-3 px-4 text-left font-heading font-bold text-gray-700">USERNAME</th>
            <th className="py-3 px-4 text-left font-heading font-bold text-gray-700">TOTAL</th>
            <th className="py-3 px-4 text-left font-heading font-bold text-gray-700">WINS</th>
            <th className="py-3 px-4 text-left font-heading font-bold text-gray-700">BEST RACE</th>
            <th className="py-3 px-4 text-left font-heading font-bold text-gray-700">PODIUMS</th>
            {showFriendButton && (
              <th className="py-3 px-4 text-center font-heading font-bold text-gray-700">FRIEND</th>
            )}
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((entry) => {
            const isCurrentUser = userId && entry.user.id === userId;
            return (
              <tr
                key={entry.user.id}
                className={`border-b border-gray-200 hover:bg-gray-50 transition cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                  isCurrentUser ? 'bg-yellow-50' : ''
                }`}
                role="link"
                tabIndex={0}
                onClick={() => navigateToUserTeam(entry.user.id)}
                onKeyDown={(event) => handleRowKeyDown(event, entry.user.id)}
                aria-label={`View ${entry.teamName || "team"} details`}
                title={`View ${entry.teamName || "team"} details`}
              >
                <td className="py-3 px-4">
                  <span className={`font-accent font-bold text-secondary inline-block w-8 h-8 rounded-full ${
                    entry.rank <= 3 ? 'bg-yellow-200' : 'bg-gray-100'
                  } text-center leading-8`}>
                    {entry.rank}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-gray-700 font-medium">
                    {entry.teamName || "Unnamed Team"}
                  </span>
                </td>
                <td className="py-3 px-4 flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-primary text-white text-xs">
                      {getInitials(entry.user.username)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-gray-700">
                    {isCurrentUser ? "You" : entry.user.username || "Anonymous"}
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
                {showFriendButton && (
                  <td className="py-3 px-4 text-center">
                    {!isCurrentUser && (
                      <FriendButton
                        userId={entry.user.id}
                        userName={entry.user.username || undefined}
                      />
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
