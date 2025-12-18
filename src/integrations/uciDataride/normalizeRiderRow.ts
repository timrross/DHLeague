import { DEFAULT_RIDER_IMAGE } from "./constants";
import { ObjectRankingRow } from "./extractRidersFromResponse";

export type NormalizedRider = {
  uciId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  team: string;
  country?: string;
  points: number;
  cost: number;
  image: string;
  datarideObjectId?: string | null;
  datarideTeamCode?: string | null;
  gender?: "male" | "female" | "unknown";
};

const COST_MULTIPLIER = 1000;

function stripLeadingMarker(value?: string | null) {
  if (!value) return value ?? undefined;
  return value.replace(/^\*\s*/, "").trim();
}

function splitName(value: string): { firstName?: string; lastName?: string } {
  const parts = value.trim().split(/\s+/);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstName: parts[0] };
  const [first, ...rest] = parts;
  return { firstName: first, lastName: rest.join(" ") || undefined };
}

export function normalizeRiderRow(
  row: ObjectRankingRow,
  options?: { gender?: "male" | "female"; costMultiplier?: number },
): NormalizedRider {
  const uciId = String(row.UciId);
  const cleanedFullName = stripLeadingMarker(
    row.IndividualFullName ?? (row as { FullName?: string }).FullName,
  );
  const displayName = stripLeadingMarker(row.DisplayName);
  const name = (cleanedFullName || displayName || `Unknown Rider ${uciId}`).trim();
  const nameParts = splitName(name);
  const team = row.TeamName ?? row.DisplayTeam ?? "";
  const points = Math.round(Number(row.Points ?? 0)); // round to align with integer DB column
  const costMultiplier = options?.costMultiplier ?? COST_MULTIPLIER;
  const cost = points * costMultiplier;

  return {
    uciId,
    name,
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    team,
    country: row.CountryIsoCode2 ?? undefined,
    points,
    cost,
    image: DEFAULT_RIDER_IMAGE,
    datarideObjectId:
      row.ObjectId === undefined || row.ObjectId === null
        ? undefined
        : String(row.ObjectId),
    datarideTeamCode: row.TeamCode ?? undefined,
    gender: options?.gender ?? "unknown",
  };
}
