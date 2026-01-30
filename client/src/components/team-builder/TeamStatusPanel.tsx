import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type TeamIssue } from "@/lib/team-builder";
import { AlertTriangle, CheckCircle2, Lock, HelpCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type TeamStatusPanelProps = {
  lockStatusLabel: string;
  lockCountdownLabel: string;
  issues: TeamIssue[];
  isTeamLocked: boolean;
};

const issueTone = {
  error: "text-red-700",
  warning: "text-amber-700",
  info: "text-gray-700",
};

const issueIcon = {
  error: AlertTriangle,
  warning: AlertTriangle,
  info: CheckCircle2,
};

export default function TeamStatusPanel({
  lockStatusLabel,
  lockCountdownLabel,
  issues,
  isTeamLocked,
}: TeamStatusPanelProps) {
  const displayIssues = issues.length
    ? issues
    : [{ level: "info" as const, message: "Team valid" }];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Team Status
          </p>
          <div className="mt-1 flex items-center gap-2">
            <Lock className="h-4 w-4 text-gray-500" />
            <p className="font-heading text-lg font-bold text-secondary">
              {lockStatusLabel}
            </p>
          </div>
          <p className="text-sm text-gray-600">{lockCountdownLabel}</p>
        </div>
        <Badge
          variant={isTeamLocked ? "destructive" : "outline"}
          className="text-xs"
        >
          {isTeamLocked ? "Locked for this round" : "Editing Open"}
        </Badge>
      </div>

      <div className="mt-4 space-y-2">
        {displayIssues.map((issue, index) => {
          const Icon = issueIcon[issue.level];
          const isBenchWarning = issue.message === "Bench rider not selected";
          return (
            <div key={`${issue.message}-${index}`} className="flex items-start gap-2">
              <Icon className={cn("mt-0.5 h-4 w-4", issueTone[issue.level])} />
              <p className={cn("text-sm font-medium", issueTone[issue.level])}>
                {issue.message}
              </p>
              {isBenchWarning && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                      How does this work?
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 text-sm">
                    <h4 className="mb-2 font-semibold">Bench Rider</h4>
                    <p className="mb-2 text-gray-600">
                      Your bench rider is a backup who only scores if one of your starters
                      doesn't race (DNS, DNF, or DNQ).
                    </p>
                    <ul className="mb-2 list-disc space-y-1 pl-4 text-gray-600">
                      <li>Only substitutes for the <strong>same gender</strong></li>
                      <li>Maximum <strong>one substitution</strong> per round</li>
                      <li>Never adds extra points—only replaces missing ones</li>
                    </ul>
                    <p className="text-gray-500 text-xs">
                      Tip: Choose a bench rider who matches the gender most likely to miss a race.
                    </p>
                    <p className="mt-2 text-gray-600 text-xs">
                      To add a bench rider, click <strong>Add Bench</strong> then select a rider from the list.
                    </p>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-xs text-gray-600">
        <p>After lock, changes will not affect this round.</p>
      </div>
    </div>
  );
}
