import { Race } from "@shared/schema";
import { cn } from "@/lib/utils";

type DateLike = string | Date;

function formatMonthDay(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatMonthDayYear(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRaceDateRange(start: DateLike, end: DateLike) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const startValid = Number.isFinite(startDate.getTime());
  const endValid = Number.isFinite(endDate.getTime());

  if (!startValid && !endValid) return "";
  if (startValid && !endValid) return formatMonthDayYear(startDate);
  if (!startValid && endValid) return formatMonthDayYear(endDate);

  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  const sameMonth = sameYear && startDate.getMonth() === endDate.getMonth();

  if (sameMonth) {
    const month = startDate.toLocaleDateString("en-US", { month: "short" });
    return `${month} ${startDate.getDate()}–${endDate.getDate()}, ${startDate.getFullYear()}`;
  }

  if (sameYear) {
    return `${formatMonthDay(startDate)} – ${formatMonthDay(endDate)}, ${startDate.getFullYear()}`;
  }

  return `${formatMonthDayYear(startDate)} – ${formatMonthDayYear(endDate)}`;
}

type RaceLabelProps = {
  race: Race;
  className?: string;
  titleClassName?: string;
  dateClassName?: string;
  subtitleClassName?: string;
  showDates?: boolean;
  showSubtitle?: boolean;
};

export default function RaceLabel({
  race,
  className,
  titleClassName,
  dateClassName,
  subtitleClassName,
  showDates = true,
  showSubtitle = true,
}: RaceLabelProps) {
  const dateRange = formatRaceDateRange(race.startDate, race.endDate);

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span
          className={cn(
            "font-heading uppercase font-bold leading-tight",
            titleClassName,
          )}
        >
          <span className="uppercase">{race.location}</span>, <span className="uppercase">{race.country}</span>
        </span>
        {showDates && dateRange && (
          <span
            className={cn(
              "text-xs opacity-80 whitespace-nowrap",
              dateClassName,
            )}
          >
            {dateRange}
          </span>
        )}
      </div>
      {showSubtitle && (
        <div className={cn("text-xs opacity-80 truncate", subtitleClassName)}>
          {race.name}
        </div>
      )}
    </div>
  );
}

