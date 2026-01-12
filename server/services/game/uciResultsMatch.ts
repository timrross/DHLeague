import type { ResultStatus } from "./config";

export type ParsedUciResult = {
  firstName: string;
  lastName: string;
  name: string;
  status: ResultStatus;
  position: number | null;
};

export type RiderIdentityRow = {
  uciId: string;
  firstName: string | null;
  lastName: string | null;
  name: string;
};

const normalizeNamePart = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();

const buildNameKey = (firstName: string, lastName: string) =>
  `${normalizeNamePart(firstName)}:${normalizeNamePart(lastName)}`;

const getRiderNameKeys = (rider: RiderIdentityRow) => {
  const keys = new Set<string>();
  const primaryFirstName = rider.firstName?.trim();
  const primaryLastName = rider.lastName?.trim();

  if (primaryFirstName && primaryLastName) {
    keys.add(buildNameKey(primaryFirstName, primaryLastName));
  }

  const fallbackName = rider.name?.trim() ?? "";
  const parts = fallbackName.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const fallbackFirstName = parts[0];
    const fallbackLastName = parts.slice(1).join(" ");
    keys.add(buildNameKey(fallbackFirstName, fallbackLastName));
    keys.add(buildNameKey(fallbackLastName, fallbackFirstName));
  }

  return Array.from(keys);
};

export function matchUciResultsToRiders(
  parsedResults: ParsedUciResult[],
  riderRows: RiderIdentityRow[],
) {
  const riderKeys = new Map<string, Array<{ uciId: string; name: string }>>();

  for (const rider of riderRows) {
    for (const key of getRiderNameKeys(rider)) {
      const matches = riderKeys.get(key) ?? [];
      matches.push({ uciId: rider.uciId, name: rider.name });
      riderKeys.set(key, matches);
    }
  }

  const missingNames = new Set<string>();
  const ambiguousNames = new Map<string, string[]>();
  const resultsByUciId = new Map<
    string,
    { uciId: string; status: ResultStatus; position: number | null }
  >();

  for (const result of parsedResults) {
    const key = buildNameKey(result.firstName, result.lastName);
    const matches = riderKeys.get(key) ?? [];
    if (matches.length === 0) {
      missingNames.add(result.name);
      continue;
    }
    if (matches.length > 1) {
      ambiguousNames.set(
        result.name,
        matches.map((match) => match.name),
      );
      continue;
    }

    resultsByUciId.set(matches[0].uciId, {
      uciId: matches[0].uciId,
      status: result.status,
      position: result.position,
    });
  }

  const results = Array.from(resultsByUciId.values());
  if (results.length === 0) {
    throw new Error("No matching riders found for the selected category");
  }

  return { results, missingNames, ambiguousNames };
}
