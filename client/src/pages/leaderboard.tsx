import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LeaderboardEntry } from "@shared/schema";
import LeaderboardTable from "@/components/leaderboard-table";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { FooterAd } from "@/components/ui/google-ad";

export default function Leaderboard() {
  const [viewMode, setViewMode] = useState<'global' | 'leagues' | 'friends'>('global');
  const { user, isAuthenticated } = useAuth();

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['/api/leaderboard'],
  });

  let filteredLeaderboard = leaderboard as LeaderboardEntry[];
  
  // For demonstration, add mock filtering for the other views
  if (viewMode === 'leagues' && filteredLeaderboard) {
    // In a real app, this would filter to leagues the user is part of
    filteredLeaderboard = filteredLeaderboard.slice(0, 3);
  } else if (viewMode === 'friends' && filteredLeaderboard) {
    // In a real app, this would filter to the user's friends
    filteredLeaderboard = filteredLeaderboard.slice(0, 2);
  }

  return (
    <div className="min-h-screen bg-neutral">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <h2 className="text-2xl md:text-3xl font-heading font-bold text-secondary mb-6">FANTASY LEADERBOARD</h2>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden p-6">
          <div className="mb-4 flex flex-wrap gap-2">
            <Button
              className={viewMode === 'global' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
              onClick={() => setViewMode('global')}
            >
              GLOBAL
            </Button>
            <Button
              className={viewMode === 'leagues' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
              onClick={() => setViewMode('leagues')}
              disabled={!isAuthenticated}
            >
              MY LEAGUES
            </Button>
            <Button
              className={viewMode === 'friends' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
              onClick={() => setViewMode('friends')}
              disabled={!isAuthenticated}
            >
              FRIENDS
            </Button>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <LeaderboardTable 
              leaderboard={filteredLeaderboard} 
              userId={isAuthenticated ? user?.id : undefined}
            />
          )}

          {!isAuthenticated && (viewMode === 'leagues' || viewMode === 'friends') && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md text-center">
              <p className="text-gray-700 mb-2">You need to be logged in to view your leagues and friends.</p>
              <a href="/api/login" className="text-primary hover:underline">Log In</a>
            </div>
          )}
        </div>
        
        {/* Advertisement - Footer */}
        <div className="mt-10">
          <FooterAd client="" />
        </div>
      </div>
    </div>
  );
}
