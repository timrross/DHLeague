import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { LeaderboardEntry } from "@shared/schema";
import LeaderboardTable from "@/components/leaderboard-table";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { FooterAd } from "@/components/ui/google-ad";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PendingFriendRequests } from "@/components/pending-friend-requests";
import { useFriendsQuery, usePendingCountQuery } from "@/services/friendsApi";

export default function Leaderboard() {
  const [viewMode, setViewMode] = useState<'global' | 'leagues' | 'friends'>('global');
  const { user, isAuthenticated } = useAuth();

  const { data: leaderboard, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['/api/leaderboard'],
  });

  const { data: friends } = useFriendsQuery({ enabled: isAuthenticated });
  const { data: pendingCountData } = usePendingCountQuery({ enabled: isAuthenticated });
  const pendingCount = pendingCountData?.count ?? 0;

  // Build set of friend user IDs for filtering
  const friendUserIds = useMemo(() => {
    if (!friends) return new Set<string>();
    return new Set(friends.map((f) => f.user.id));
  }, [friends]);

  const filteredLeaderboard = useMemo(() => {
    const entries = leaderboard as LeaderboardEntry[] | undefined;
    if (!entries) return [];

    if (viewMode === 'leagues') {
      // In a real app, this would filter to leagues the user is part of
      return entries.slice(0, 3);
    }

    if (viewMode === 'friends') {
      // Filter to friends + current user
      return entries.filter(
        (entry) => friendUserIds.has(entry.user.id) || entry.user.id === user?.id
      );
    }

    return entries;
  }, [leaderboard, viewMode, friendUserIds, user?.id]);

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
              className={`relative ${viewMode === 'friends' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              onClick={() => setViewMode('friends')}
              disabled={!isAuthenticated}
            >
              FRIENDS
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </Button>
          </div>
          
          {isLoading && (
            <div className="flex justify-center items-center h-64">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {isError && (
            <Alert variant="destructive" className="mb-6">
              <AlertTitle>Unable to load leaderboard</AlertTitle>
              <AlertDescription>
                {error instanceof Error ? error.message : "An unexpected error occurred while fetching leaderboard data."}
              </AlertDescription>
              <div className="mt-4">
                <Button variant="outline" onClick={() => refetch()}>Try again</Button>
              </div>
            </Alert>
          )}

          {viewMode === 'friends' && isAuthenticated && (
            <PendingFriendRequests />
          )}

          {!isLoading && !isError && filteredLeaderboard && filteredLeaderboard.length > 0 && (
            <LeaderboardTable
              leaderboard={filteredLeaderboard}
              userId={isAuthenticated ? user?.id : undefined}
              showFriendButton={isAuthenticated && viewMode === 'global'}
            />
          )}

          {!isLoading && !isError && (!filteredLeaderboard || filteredLeaderboard.length === 0) && (
            <Alert className="bg-gray-50">
              <AlertTitle>No leaderboard data yet</AlertTitle>
              <AlertDescription>
                Start building teams and completing races to see rankings here.
              </AlertDescription>
            </Alert>
          )}

          {!isAuthenticated && (viewMode === 'leagues' || viewMode === 'friends') && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md text-center">
              <p className="text-gray-700 mb-2">You need to be logged in to view your leagues and friends.</p>
              <a href="/login" className="text-primary hover:underline">Log In</a>
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
