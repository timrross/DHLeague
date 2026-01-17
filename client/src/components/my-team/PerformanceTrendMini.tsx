import { cn } from "@/lib/utils";

type PerformanceTrendMiniProps = {
  values: Array<number | null>;
  className?: string;
};

export default function PerformanceTrendMini({ values, className }: PerformanceTrendMiniProps) {
  const numericValues = values.map((value) => value ?? 0);
  const maxValue = Math.max(1, ...numericValues);

  return (
    <div className={cn("flex items-end gap-1", className)} aria-hidden="true">
      {values.map((value, index) => {
        const height = Math.max(10, (Number(value ?? 0) / maxValue) * 40);
        const tone = value === null ? "bg-gray-200" : "bg-primary/70";
        return (
          <div
            key={`trend-${index}`}
            className={cn("w-3 rounded-sm", tone)}
            style={{ height: `${height}px` }}
          />
        );
      })}
    </div>
  );
}
