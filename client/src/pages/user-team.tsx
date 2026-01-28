import { Link, useParams } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import TeamRosterPanel from "@/components/my-team/TeamRosterPanel";
import PerformancePanel from "@/components/my-team/PerformancePanel";
import { useFeatures } from "@/hooks/useFeatures";
import {
  useUserTeamsQuery,
  useUserPerformanceQuery,
} from "@/services/userTeamApi";
import { ArrowLeft } from "lucide-react";

export default function UserTeam() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId ?? "";
  const { juniorTeamEnabled, isLoading: featuresLoading } = useFeatures();

  const {
    data: teamsData,
    isLoading: teamsLoading,
    isError: teamsError,
  } = useUserTeamsQuery(userId);

  const {
    data: performance,
    isLoading: performanceLoading,
    isError: performanceError,
  } = useUserPerformanceQuery(userId);

  const showJunior = juniorTeamEnabled;
  const user = teamsData?.user ?? performance?.user;

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-neutral">
        <div className="container mx-auto px-4 py-10">
          <Alert variant="destructive">
            <AlertTitle>Invalid User</AlertTitle>
            <AlertDescription>No user ID provided.</AlertDescription>
          </Alert>
          <div className="mt-4">
            <Link href="/leaderboard">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Leaderboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (teamsError && performanceError) {
    return (
      <div className="min-h-screen bg-neutral">
        <div className="container mx-auto px-4 py-10">
          <Alert variant="destructive">
            <AlertTitle>User Not Found</AlertTitle>
            <AlertDescription>
              Could not find a user with that ID.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Link href="/leaderboard">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Leaderboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/leaderboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Leaderboard
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary text-white">
                {getInitials(user.displayName)}
              </AvatarFallback>
            </Avatar>
          )}
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-secondary">
              {user?.displayName ?? "Loading..."}
            </h1>
            <p className="text-sm text-gray-500">
              Viewing team and performance
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
          <PerformancePanel
            data={performance}
            isLoading={performanceLoading || featuresLoading}
            isError={performanceError}
            juniorEnabled={showJunior}
          />
          <div />

          <section className="space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-heading font-bold text-secondary">
                Riders
              </h2>
            </div>

            {teamsError && (
              <Alert variant="destructive">
                <AlertTitle>Unable to load teams</AlertTitle>
                <AlertDescription>
                  We could not load the teams right now. Please try again later.
                </AlertDescription>
              </Alert>
            )}

            {teamsLoading && !teamsError && (
              <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
                Loading teams...
              </div>
            )}

            {!teamsLoading && !teamsError && (
              <div className="space-y-6">
                <TeamRosterPanel
                  team={teamsData?.eliteTeam ?? null}
                  teamType="elite"
                />

                {showJunior && (
                  <TeamRosterPanel
                    team={teamsData?.juniorTeam ?? null}
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
