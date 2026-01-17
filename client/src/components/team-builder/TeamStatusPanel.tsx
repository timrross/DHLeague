import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type TeamIssue } from "@/lib/team-builder";
import { AlertTriangle, CheckCircle2, Lock } from "lucide-react";

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
          return (
            <div key={`${issue.message}-${index}`} className="flex items-start gap-2">
              <Icon className={cn("mt-0.5 h-4 w-4", issueTone[issue.level])} />
              <p className={cn("text-sm font-medium", issueTone[issue.level])}>
                {issue.message}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 space-y-1 text-xs text-gray-600">
        <p>After lock, changes will not affect this round.</p>
        <p>
          Bench auto-subs only if a same-gender starter DNS. One auto-sub per
          round.
        </p>
      </div>
    </div>
  );
}
