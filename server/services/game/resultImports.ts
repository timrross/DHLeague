import type { RaceResultImport } from "@shared/schema";

export type ResultSetDefinition = {
  gender: "male" | "female";
  category: "elite" | "junior";
  label: string;
};

const ELITE_RESULT_SETS: ResultSetDefinition[] = [
  { gender: "male", category: "elite", label: "Men Elite" },
  { gender: "female", category: "elite", label: "Women Elite" },
];

const JUNIOR_RESULT_SETS: ResultSetDefinition[] = [
  { gender: "male", category: "junior", label: "Men Junior" },
  { gender: "female", category: "junior", label: "Women Junior" },
];

const buildKey = (gender: string, category: string) =>
  `${gender}:${category}`;

const normalizeDisciplineInput = (value: string) =>
  value.trim().toUpperCase().replace(/[_\s]+/g, "-");

export function resolveDisciplineCode(
  discipline: string | undefined | null,
  fallback?: string | null,
): string {
  const normalized = normalizeDisciplineInput(String(discipline ?? ""));

  if (normalized === "DOWNHILL") return "DHI";
  if (normalized === "DHI") {
    return normalized;
  }

  const fallbackValue = normalizeDisciplineInput(String(fallback ?? ""));
  if (fallbackValue === "DHI") {
    return fallbackValue;
  }

  return "DHI";
}

export function getMissingFinalResultSets(
  imports: Pick<RaceResultImport, "gender" | "category" | "isFinal">[],
  options: { includeJunior?: boolean } = {},
): ResultSetDefinition[] {
  const finalKeys = new Set(
    imports
      .filter((row) => row.isFinal)
      .map((row) => buildKey(row.gender, row.category)),
  );

  const requiredSets = options.includeJunior
    ? [...ELITE_RESULT_SETS, ...JUNIOR_RESULT_SETS]
    : ELITE_RESULT_SETS;

  return requiredSets.filter(
    (set) => !finalKeys.has(buildKey(set.gender, set.category)),
  );
}
