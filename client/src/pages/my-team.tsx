import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import NextRacePanel from "@/components/my-team/NextRacePanel";
import PerformancePanel from "@/components/my-team/PerformancePanel";
import TeamRosterPanel from "@/components/my-team/TeamRosterPanel";
import { useAuth } from "@/hooks/useAuth";
import { useFeatures } from "@/hooks/useFeatures";
import {
  useMyPerformanceQuery,
  useMyTeamsQuery,
  useNextRoundsQuery,
} from "@/services/myTeamApi";

export default function MyTeam() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { juniorTeamEnabled, isLoading: featuresLoading } = useFeatures();

  const { data: nextRounds } = useNextRoundsQuery();

  const {
    data: teams,
    isLoading: teamsLoading,
    isError: teamsError,
  } = useMyTeamsQuery(undefined, { enabled: isAuthenticated });

  const {
    data: performance,
    isLoading: performanceLoading,
    isError: performanceError,
  } = useMyPerformanceQuery(undefined, { enabled: isAuthenticated });

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const showJunior = juniorTeamEnabled;
  const eliteRound = nextRounds?.elite ?? null;
  const juniorRound = showJunior ? nextRounds?.junior ?? null : null;

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral">
        <div className="container mx-auto px-4 py-10">
          <Alert>
            <AlertTitle>Sign in to view your team</AlertTitle>
            <AlertDescription>
              Your saved teams and performance live in your account. Sign in to
              see your roster and stats.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Link href="/login">
              <Button>Sign In</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-secondary">
            My Team
          </h1>
          <p className="text-sm text-gray-500">
            Review performance, confirm your roster, and jump into edits before lock.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
          <div className="space-y-6">
            <PerformancePanel
              data={performance}
              isLoading={performanceLoading || featuresLoading}
              isError={performanceError}
              juniorEnabled={showJunior}
            />
            <NextRacePanel
              now={now}
              eliteRound={eliteRound}
              juniorRound={juniorRound}
              showJunior={showJunior}
            />
          </div>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-heading font-bold text-secondary">
                My Riders
              </h2>
            </div>

            {teamsError && (
              <Alert variant="destructive">
                <AlertTitle>Unable to load teams</AlertTitle>
                <AlertDescription>
                  We could not load your teams right now. Please try again later.
                </AlertDescription>
              </Alert>
            )}

            {teamsLoading && !teamsError && (
              <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
                Loading your teams...
              </div>
            )}

            {!teamsLoading && !teamsError && (
              <div className="space-y-6">
                <TeamRosterPanel
                  team={teams?.eliteTeam ?? null}
                  teamType="elite"
                />

                {showJunior && (
                  <TeamRosterPanel
                    team={teams?.juniorTeam ?? null}
                    teamType="junior"
                  />
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
