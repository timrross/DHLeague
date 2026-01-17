import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import MobileAccordionSection from "@/components/my-team/MobileAccordionSection";
import MobileStickyActionBar from "@/components/my-team/MobileStickyActionBar";
import MobileStickyHeader from "@/components/my-team/MobileStickyHeader";
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
  const [mobileSections, setMobileSections] = useState({
    next: false,
    performance: true,
    riders: true,
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const showJunior = juniorTeamEnabled;
  const eliteRound = nextRounds?.elite ?? null;
  const juniorRound = showJunior ? nextRounds?.junior ?? null : null;

  const headerSections = useMemo(() => {
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
  }, [eliteRound, juniorRound, showJunior, isAuthenticated]);

  const combinedNextRound = useMemo(() => {
    if (!showJunior) return eliteRound;
    if (!eliteRound) return juniorRound;
    if (!juniorRound) return eliteRound;
    const eliteLock = eliteRound.lockAt ? new Date(eliteRound.lockAt).getTime() : Infinity;
    const juniorLock = juniorRound.lockAt ? new Date(juniorRound.lockAt).getTime() : Infinity;
    return eliteLock <= juniorLock ? eliteRound : juniorRound;
  }, [eliteRound, juniorRound, showJunior]);

  const mobileActions = useMemo(() => {
    const actions = [];
    if (eliteRound?.editingOpen) {
      const remaining =
        teams?.eliteTeam && typeof teams.eliteTeam.totalCost === "number"
          ? (teams.eliteTeam.budgetCap ?? 2000000) - teams.eliteTeam.totalCost
          : null;
      const summary =
        remaining !== null
          ? `Elite budget: $${remaining.toLocaleString()} remaining`
          : "Elite team edits are open";
      actions.push({
        label: showJunior ? "Edit Elite Team" : "Edit Team",
        href: "/team-builder?teamType=ELITE",
        summary,
      });
    }
    if (showJunior && juniorRound?.editingOpen) {
      const remaining =
        teams?.juniorTeam && typeof teams.juniorTeam.totalCost === "number"
          ? (teams.juniorTeam.budgetCap ?? 500000) - teams.juniorTeam.totalCost
          : null;
      const summary =
        remaining !== null
          ? `Junior budget: $${remaining.toLocaleString()} remaining`
          : "Junior team edits are open";
      actions.push({
        label: "Edit Junior Team",
        href: "/team-builder?teamType=JUNIOR",
        summary,
      });
    }
    return actions;
  }, [eliteRound, juniorRound, showJunior, teams]);

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
    <div className="min-h-screen bg-neutral pb-24 lg:pb-0">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-secondary">
            My Team
          </h1>
          <p className="text-sm text-gray-500">
            Review performance, confirm your roster, and jump into edits before lock.
          </p>
        </div>

        <div className="lg:hidden space-y-4">
          <MobileStickyHeader round={combinedNextRound} now={now} />
          <MobileAccordionSection
            title="Next Round"
            isOpen={mobileSections.next}
            onToggle={() =>
              setMobileSections((prev) => ({ ...prev, next: !prev.next }))
            }
          >
            <MyTeamHeaderCard now={now} sections={headerSections} />
          </MobileAccordionSection>
          <MobileAccordionSection
            title="Performance"
            isOpen={mobileSections.performance}
            onToggle={() =>
              setMobileSections((prev) => ({
                ...prev,
                performance: !prev.performance,
              }))
            }
          >
            <PerformancePanel
              data={performance}
              isLoading={performanceLoading || featuresLoading}
              isError={performanceError}
              juniorEnabled={showJunior}
              nextRound={combinedNextRound}
              now={now}
            />
          </MobileAccordionSection>
          <MobileAccordionSection
            title="My Riders"
            isOpen={mobileSections.riders}
            onToggle={() =>
              setMobileSections((prev) => ({ ...prev, riders: !prev.riders }))
            }
          >
            <section className="space-y-4">
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
                    nextRound={eliteRound}
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
                          nextRound={juniorRound}
                          showBuilderLink
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </MobileAccordionSection>
        </div>

        <div className="hidden lg:block space-y-6">
          <MyTeamHeaderCard now={now} sections={headerSections} />

          <PerformancePanel
            data={performance}
            isLoading={performanceLoading || featuresLoading}
            isError={performanceError}
            juniorEnabled={showJunior}
            nextRound={combinedNextRound}
            now={now}
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
                  nextRound={eliteRound}
                  showBuilderLink
                />

                {showJunior && (
                  <TeamRosterPanel
                    team={teams?.juniorTeam ?? null}
                    teamType="junior"
                    nextRound={juniorRound}
                    showBuilderLink
                  />
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      <MobileStickyActionBar actions={mobileActions} />
    </div>
  );
}
