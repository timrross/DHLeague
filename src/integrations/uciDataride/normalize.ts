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
  category: "elite" | "junior";
  team: string;
  country?: string;
  points: number;
  cost: number;
  lastYearStanding: number;
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
  const normalizedCode = category.code?.toUpperCase() ?? "";
  const normalizedName = category.name?.toLowerCase() ?? "";
  const nameTokens = normalizedName.split(/[^a-z]+/).filter(Boolean);

  const hasElite = nameTokens.includes("elite");
  const hasJunior = nameTokens.includes("junior");
  const hasWomen = nameTokens.includes("women") || nameTokens.includes("woman");
  const hasMen = nameTokens.includes("men") || nameTokens.includes("man");

  const isEliteWomen =
    ["WE", "EW", "WE-XCO", "WE-DHI"].includes(normalizedCode) ||
    (hasElite && hasWomen);
  const isEliteMen =
    ["ME", "EM", "ME-XCO", "ME-DHI"].includes(normalizedCode) ||
    (hasElite && hasMen);
  const isJuniorMen =
    ["MJ", "MJ-XCO", "MJ-DHI", "MJCR"].includes(normalizedCode) ||
    (hasJunior && hasMen);
  const isJuniorWomen =
    ["WJ", "WJ-XCO", "WJ-DHI", "WJCR"].includes(normalizedCode) ||
    (hasJunior && hasWomen);

  if (isEliteMen) {
    return "ELITE_MEN";
  }

  if (isEliteWomen) {
    return "ELITE_WOMEN";
  }

  if (isJuniorMen) {
    return "JUNIOR_MEN";
  }

  if (isJuniorWomen) {
    return "JUNIOR_WOMEN";
  }

  return null;
}

function stripLeadingAsterisk(value?: string | null): {
  value?: string;
  hadAsterisk: boolean;
} {
  if (!value) return { value: value ?? undefined, hadAsterisk: false };
  const trimmed = value.trim();
  if (!trimmed.startsWith("*")) {
    return { value: trimmed, hadAsterisk: false };
  }
  return {
    value: trimmed.replace(/^\*\s*/, "").trim(),
    hadAsterisk: true,
  };
}

function isUppercaseToken(token: string): boolean {
  if (!token) return false;
  const hasLetter = /[A-Z]/i.test(token);
  return hasLetter && token === token.toUpperCase();
}

function splitName(name: string): { firstName?: string; lastName?: string } {
  const cleaned = name.trim();
  if (!cleaned) return {};

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return {};
  if (tokens.length === 1) return { firstName: tokens[0], lastName: undefined };

  let uppercaseCount = 0;
  for (const token of tokens) {
    if (isUppercaseToken(token)) {
      uppercaseCount += 1;
    } else {
      break;
    }
  }

  if (uppercaseCount === 0) {
    const [firstName, ...rest] = tokens;
    return { firstName, lastName: rest.join(" ") || undefined };
  }

  const hasMixedCaseTail = uppercaseCount < tokens.length;
  const lastNameTokens = hasMixedCaseTail
    ? tokens.slice(0, uppercaseCount)
    : tokens.slice(0, Math.max(tokens.length - 1, 1));
  const firstNameTokens = hasMixedCaseTail
    ? tokens.slice(uppercaseCount)
    : tokens.slice(Math.max(tokens.length - 1, 1));

  const firstName = firstNameTokens.join(" ").trim() || undefined;
  const lastName = lastNameTokens.join(" ").trim() || undefined;

  return { firstName, lastName };
}

export function normalizeRiderRow(
  row: ObjectRankingRow,
  gender: "male" | "female",
  category: "elite" | "junior" = "elite",
): NormalizedRider {
  const cleanedFullName = stripLeadingAsterisk(row.IndividualFullName);
  const displayName = stripLeadingAsterisk(row.DisplayName);
  const name = (cleanedFullName.value || displayName.value || "").trim();
  const isJunior = cleanedFullName.hadAsterisk || displayName.hadAsterisk;
  const team = row.TeamName ?? row.DisplayTeam ?? "";
  // Use UCI ranking position as lastYearStanding for cost calculation.
  const lastYearStanding = row.Rank ?? 0;
  // Riders start with zero points; points are earned from race results.
  const points = 0;
  // Cost is derived from standing using a power law: higher ranked = more expensive.
  // Formula: 500,000 / (position ^ 0.4), minimum $10,000
  const cost =
    lastYearStanding > 0
      ? Math.max(10000, Math.round(500000 / Math.pow(lastYearStanding, 0.4)))
      : 10000;
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
    category: isJunior ? "junior" : category,
    team,
    country: row.CountryIsoCode2,
    points,
    cost,
    lastYearStanding,
    image: DEFAULT_RIDER_IMAGE,
  };
}
