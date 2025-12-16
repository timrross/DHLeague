import { DEFAULT_RIDER_IMAGE } from "./constants";

export type ObjectRankingRow = {
  ObjectId: number;
  Rank: number;
  UciId: number;
  IndividualFullName: string;
  DisplayName: string;
  TeamName: string | null;
  TeamCode: string | null;
  DisplayTeam: string | null;
  Points: number;
  CountryIsoCode2: string;
  NationFullName: string;
  DisciplineSeasonId: number;
  MomentId: number;
  BirthDate: string;
  Ages: number;
  FlagCode: string;
  Position: string;
};

export type NormalizedRider = {
  uciId: string;
  riderId: string;
  datarideObjectId?: string | null;
  datarideTeamCode?: string | null;
  name: string;
  firstName?: string;
  lastName?: string;
  gender: "male" | "female";
  team: string;
  country?: string;
  points: number;
  cost: number;
  image: string;
};

export type CategoryKey =
  | "ELITE_MEN"
  | "ELITE_WOMEN"
  | "JUNIOR_MEN"
  | "JUNIOR_WOMEN";

export function normalizeCategoryToKey(category: {
  id: number;
  name?: string;
  code?: string;
}): CategoryKey | null {
  const normalizedName = category.name?.toLowerCase() ?? "";
  const normalizedCode = category.code?.toUpperCase() ?? "";

  if (
    /elite\s*men|men elite|elite m/.test(normalizedName) ||
    ["ME", "EM", "ME-XCO", "ME-DHI"].includes(normalizedCode)
  ) {
    return "ELITE_MEN";
  }

  if (
    /elite\s*women|women elite|elite w/.test(normalizedName) ||
    ["WE", "EW", "WE-XCO", "WE-DHI"].includes(normalizedCode)
  ) {
    return "ELITE_WOMEN";
  }

  if (
    /junior\s*men|men junior|junior m/.test(normalizedName) ||
    ["MJ", "MJ-XCO", "MJ-DHI", "MJCR"].includes(normalizedCode)
  ) {
    return "JUNIOR_MEN";
  }

  if (
    /junior\s*women|women junior|junior w/.test(normalizedName) ||
    ["WJ", "WJ-XCO", "WJ-DHI", "WJCR"].includes(normalizedCode)
  ) {
    return "JUNIOR_WOMEN";
  }

  return null;
}

function stripLeadingAsterisk(value?: string | null) {
  if (!value) return value ?? undefined;
  return value.replace(/^\*\s*/, "").trim();
}

function splitName(name: string): { firstName?: string; lastName?: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstName: parts[0], lastName: undefined };

  const [firstName, ...rest] = parts;
  return { firstName, lastName: rest.join(" ") || undefined };
}

export function normalizeRiderRow(
  row: ObjectRankingRow,
  gender: "male" | "female",
): NormalizedRider {
  const cleanedFullName = stripLeadingAsterisk(row.IndividualFullName);
  const displayName = stripLeadingAsterisk(row.DisplayName);
  const name = (cleanedFullName || displayName || "").trim();
  const team = row.TeamName ?? row.DisplayTeam ?? "";
  // Points are floats in the feed; round to the nearest integer for storage.
  const points = Math.round(Number(row.Points ?? 0));
  const cost = points * 1000;
  const uciId = String(row.UciId);
  const riderId = uciId;
  const nameParts = splitName(name);

  return {
    uciId,
    riderId,
    datarideObjectId: row.ObjectId ? String(row.ObjectId) : null,
    datarideTeamCode: row.TeamCode ?? null,
    name,
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    gender,
    team,
    country: row.CountryIsoCode2,
    points,
    cost,
    image: DEFAULT_RIDER_IMAGE,
  };
}
