import { CATEGORIES, DISCIPLINES, type TeamType, type Discipline } from "./config";

const normalizeValue = (value: string) => value.trim().toUpperCase();

export function normalizeTeamType(value: string): TeamType {
  const upper = normalizeValue(value);
  if ((CATEGORIES as readonly string[]).includes(upper)) {
    return upper as TeamType;
  }
  throw new Error(`Invalid team type: ${value}`);
}

export function normalizeDiscipline(value: string): Discipline {
  const upper = normalizeValue(value);
  if ((DISCIPLINES as readonly string[]).includes(upper)) {
    return upper as Discipline;
  }
  throw new Error(`Invalid discipline: ${value}`);
}

export function toDbTeamType(value: string): "elite" | "junior" {
  const teamType = normalizeTeamType(value);
  return teamType === "ELITE" ? "elite" : "junior";
}

export function toPublicTeamType(value: string): TeamType {
  if (!value) {
    throw new Error("Team type is required");
  }
  return normalizeTeamType(value);
}
