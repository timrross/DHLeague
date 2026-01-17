import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FEMALE_SLOTS, MALE_SLOTS } from "@/lib/team-builder";

type GenderSlotsIndicatorProps = {
  maleCount: number;
  femaleCount: number;
};

const slotBase = "h-4 w-8 rounded-full border border-gray-200";

export default function GenderSlotsIndicator({
  maleCount,
  femaleCount,
}: GenderSlotsIndicatorProps) {
  const missingMen = Math.max(0, MALE_SLOTS - maleCount);
  const missingWomen = Math.max(0, FEMALE_SLOTS - femaleCount);

  let statusLabel = "Valid";
  let statusTone = "bg-emerald-100 text-emerald-700";

  if (maleCount > MALE_SLOTS) {
    statusLabel = "Too many men";
    statusTone = "bg-red-100 text-red-700";
  } else if (femaleCount > FEMALE_SLOTS) {
    statusLabel = "Too many women";
    statusTone = "bg-red-100 text-red-700";
  } else if (missingMen > 0 || missingWomen > 0) {
    const parts = [];
    if (missingMen > 0) parts.push(`${missingMen} ${missingMen === 1 ? "man" : "men"}`);
    if (missingWomen > 0) parts.push(`${missingWomen} ${missingWomen === 1 ? "woman" : "women"}`);
    statusLabel = `Need ${parts.join(" and ")}`;
    statusTone = "bg-amber-100 text-amber-700";
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Gender Slots
          </p>
          <p className="text-sm text-gray-600">4 men + 2 women starters</p>
        </div>
        <Badge className={cn("font-semibold", statusTone)}>{statusLabel}</Badge>
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-3">
          <span className="w-12 text-xs font-semibold uppercase text-blue-600">
            Men
          </span>
          <div className="flex gap-2">
            {Array.from({ length: MALE_SLOTS }).map((_, index) => (
              <span
                key={`male-${index}`}
                className={cn(
                  slotBase,
                  index < maleCount ? "bg-blue-500" : "bg-gray-100",
                )}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-12 text-xs font-semibold uppercase text-pink-600">
            Women
          </span>
          <div className="flex gap-2">
            {Array.from({ length: FEMALE_SLOTS }).map((_, index) => (
              <span
                key={`female-${index}`}
                className={cn(
                  slotBase,
                  index < femaleCount ? "bg-pink-500" : "bg-gray-100",
                )}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
