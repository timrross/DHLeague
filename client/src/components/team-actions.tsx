import { Link } from "wouter";
import { Rider, TeamWithRiders } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import CountdownTimer from "@/components/countdown-timer";
import TeamSummary from "@/components/team-summary";
import JokerCardButton from "@/components/joker-card-button";
import { formatRaceDateRange } from "@/components/race-label";

interface TeamActionsProps {
  isAuthenticated: boolean;
  isTeamLocked: boolean;
  teamName: string;
  setTeamName: (name: string) => void;
  selectedRiders: Rider[];
  totalBudget: number;
  usedBudget: number;
  remainingBudget: number;
  budgetPercentage: number;
  maleRidersCount: number;
  femaleRidersCount: number;
  userTeam: TeamWithRiders | undefined;
  isCreatingTeam: boolean;
  jokerCardUsed: boolean;
  isTeamValid: boolean;
  isSubmitting: boolean;
  nextRace: any;
  lockDate: Date;
  handleSaveTeam: () => void;
  handleUseJokerCard: () => void;
}

export default function TeamActions({
  isAuthenticated,
  isTeamLocked,
  teamName,
  setTeamName,
  selectedRiders,
  totalBudget,
  usedBudget,
  remainingBudget,
  budgetPercentage,
  maleRidersCount,
  femaleRidersCount,
  userTeam,
  isCreatingTeam,
  jokerCardUsed,
  isTeamValid,
  isSubmitting,
  nextRace,
  lockDate,
  handleSaveTeam,
  handleUseJokerCard
}: TeamActionsProps) {
  return (
    <div className="bg-gray-50 p-5 rounded-lg">
      <div className="mb-4">
        <h3 className="font-heading font-bold text-xl text-secondary">YOUR TEAM</h3>
      </div>
      
      {/* Team lock countdown */}
      {nextRace && isAuthenticated && userTeam && (
        <div className="mb-5">
          <CountdownTimer 
            targetDate={lockDate} 
            title={
              <>
                <span className="font-heading font-bold">
                  <span className="uppercase">{nextRace.location}</span>,{" "}
                  <span className="uppercase">{nextRace.country}</span>
                </span>
                <span className="ml-2 text-xs opacity-80">
                  {formatRaceDateRange(nextRace.startDate, nextRace.endDate)}
                </span>
              </>
            }
            subtitle={nextRace.name}
            showLockStatus
          />
        </div>
      )}
      
      {/* Team name input */}
      <div className="mb-4">
        <Input
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="Team Name"
          disabled={isTeamLocked && !isCreatingTeam}
          className="font-heading font-bold"
        />
      </div>
      
      {/* Team summary */}
      <TeamSummary
        selectedRiders={selectedRiders}
        totalBudget={totalBudget}
        usedBudget={usedBudget}
        remainingBudget={remainingBudget}
        budgetPercentage={budgetPercentage}
        maleRidersCount={maleRidersCount}
        femaleRidersCount={femaleRidersCount}
      />
      
      {/* Action buttons */}
      <div className="flex flex-col md:flex-row gap-3 mt-5">
        {isAuthenticated ? (
          <>
            {/* Save/update button for authenticated users */}
            <Button
              className="w-full"
              onClick={handleSaveTeam}
              disabled={!isTeamValid || isSubmitting}
            >
              {userTeam && !isCreatingTeam ? 'Update Team' : 'Save Team'}
            </Button>
            
            {/* Joker card button */}
            {userTeam && (
              <JokerCardButton
                jokerCardUsed={jokerCardUsed}
                onClick={handleUseJokerCard}
                className="w-full md:w-auto"
              />
            )}
          </>
        ) : (
          <>
            {/* Login CTA button for guests */}
            <div className="w-full">
              <Link href="/login">
                <Button
                  className="w-full"
                >
                  Log In to Save Team
                </Button>
              </Link>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Create an account to save your team and compete in the 2025 fantasy league
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
