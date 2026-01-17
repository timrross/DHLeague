import { getBudgetState } from "@/lib/team-builder";
import { cn } from "@/lib/utils";

type BudgetBarProps = {
  used: number;
  cap: number;
};

const levelText = {
  green: "text-emerald-700",
  amber: "text-amber-700",
  red: "text-red-700",
};

const levelBar = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

export default function BudgetBar({ used, cap }: BudgetBarProps) {
  const budget = getBudgetState(used, cap);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Budget
          </p>
          <p className={cn("text-xl font-heading font-bold", levelText[budget.level])}>
            ${budget.remaining.toLocaleString()} remaining
          </p>
        </div>
        <div className="text-xs font-medium text-gray-500">
          ${budget.used.toLocaleString()} / ${budget.cap.toLocaleString()} used
        </div>
      </div>
      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={cn("h-full transition-all", levelBar[budget.level])}
          style={{ width: `${budget.percent}%` }}
        />
      </div>
    </div>
  );
}
