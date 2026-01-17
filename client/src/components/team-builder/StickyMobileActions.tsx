import { Link } from "wouter";
import { Button } from "@/components/ui/button";

type StickyMobileActionsProps = {
  isAuthenticated: boolean;
  isTeamLocked: boolean;
  primaryLabel: string;
  summaryLabel: string;
  canSave: boolean;
  isSubmitting: boolean;
  onSave: () => void;
};

export default function StickyMobileActions({
  isAuthenticated,
  isTeamLocked,
  primaryLabel,
  summaryLabel,
  canSave,
  isSubmitting,
  onSave,
}: StickyMobileActionsProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur lg:hidden">
      {isAuthenticated ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>{summaryLabel}</span>
            {isTeamLocked && <span className="font-semibold text-red-600">Locked</span>}
          </div>
          <Button
            className="w-full"
            onClick={onSave}
            disabled={!canSave || isSubmitting || isTeamLocked}
            aria-disabled={!canSave || isSubmitting || isTeamLocked}
          >
            {primaryLabel}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Link href="/login">
            <Button className="w-full">Log In to Save Team</Button>
          </Link>
          <p className="text-center text-xs text-gray-500">
            Create an account to save your team and compete this season.
          </p>
        </div>
      )}
    </div>
  );
}
