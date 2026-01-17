import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import MyTeamHeaderCard from "@/components/my-team/MyTeamHeaderCard";
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
  const [juniorOpen, setJuniorOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const showJunior = juniorTeamEnabled;

  const headerSections = useMemo(() => {
    const eliteRound = nextRounds?.elite ?? null;
    const juniorRound = showJunior ? nextRounds?.junior ?? null : null;
    const sections: Array<{
      teamType: "elite" | "junior";
      round: typeof eliteRound;
      editHref: string;
      showEdit: boolean;
      showBuilderLink: boolean;
    }> = [
      {
        teamType: "elite" as const,
        round: eliteRound,
        editHref: "/team-builder?teamType=ELITE",
        showEdit: isAuthenticated,
        showBuilderLink: true,
      },
    ];
    if (showJunior) {
      sections.push({
        teamType: "junior" as const,
        round: juniorRound,
        editHref: "/team-builder?teamType=JUNIOR",
        showEdit: isAuthenticated,
        showBuilderLink: true,
      });
    }
    return sections;
  }, [nextRounds, showJunior, isAuthenticated]);

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

        <MyTeamHeaderCard now={now} sections={headerSections} />

        <PerformancePanel
          data={performance}
          isLoading={performanceLoading || featuresLoading}
          isError={performanceError}
          juniorEnabled={showJunior}
        />

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
                nextRound={nextRounds?.elite ?? null}
                showBuilderLink
              />

              {showJunior && (
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full lg:hidden"
                    onClick={() => setJuniorOpen((open) => !open)}
                    aria-expanded={juniorOpen}
                  >
                    {juniorOpen ? "Hide Junior Team" : "Show Junior Team"}
                  </Button>
                  <div className={`${juniorOpen ? "block" : "hidden"} lg:block`}>
                    <TeamRosterPanel
                      team={teams?.juniorTeam ?? null}
                      teamType="junior"
                      nextRound={nextRounds?.junior ?? null}
                      showBuilderLink
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
