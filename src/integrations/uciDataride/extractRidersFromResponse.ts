export type ObjectRankingRow = {
  ObjectId?: number | string | null;
  Rank?: number | string | null;
  UciId: number | string;
  IndividualFullName?: string | null;
  DisplayName?: string | null;
  FullName?: string | null;
  TeamName?: string | null;
  TeamCode?: string | null;
  DisplayTeam?: string | null;
  Points?: number | string | null;
  CountryIsoCode2?: string | null;
  NationCode?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRiderCandidate(value: unknown): value is ObjectRankingRow {
  if (!isRecord(value)) return false;
  return (
    "UciId" in value &&
    value.UciId !== null &&
    value.UciId !== undefined &&
    value.UciId !== ""
  );
}

export function extractRidersFromResponse(
  responseJson: unknown,
): ObjectRankingRow[] {
  if (responseJson == null) {
    return [];
  }

  const riders: ObjectRankingRow[] = [];
  const seen = new Set<string>();
  const visitedObjects = new WeakSet<object>();

  const visit = (node: unknown) => {
    if (node == null) return;

    if (Array.isArray(node)) {
      for (const item of node) {
        visit(item);
      }
      return;
    }

    if (!isRecord(node)) {
      return;
    }

    if (visitedObjects.has(node)) {
      return;
    }
    visitedObjects.add(node);

    if (isRiderCandidate(node)) {
      const key = `${node.UciId ?? ""}:${node.ObjectId ?? ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        riders.push({
          ObjectId: node.ObjectId,
          Rank: node.Rank,
          UciId: node.UciId,
          IndividualFullName: node.IndividualFullName ?? node.FullName ?? null,
          DisplayName: node.DisplayName ?? null,
          TeamName: node.TeamName ?? null,
          TeamCode: node.TeamCode ?? null,
          DisplayTeam: node.DisplayTeam ?? null,
          Points: node.Points ?? null,
          CountryIsoCode2: node.CountryIsoCode2 ?? node.NationCode ?? null,
        });
      }
    }

    if (Array.isArray((node as { data?: unknown }).data)) {
      visit((node as { data?: unknown }).data);
    }

    if (Array.isArray((node as { ObjectRankings?: unknown }).ObjectRankings)) {
      visit((node as { ObjectRankings?: unknown }).ObjectRankings);
    }

    for (const [, value] of Object.entries(node)) {
      if (typeof value === "object" && value !== null) {
        visit(value);
      }
    }
  };

  visit(responseJson);
  return riders;
}
