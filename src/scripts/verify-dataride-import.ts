import path from "path";
import { drizzle } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { loadDatarideFixtures, LoadedDatarideFixture } from "../fixtures/loadDatarideFixtures";
import { extractRidersFromResponse } from "../integrations/uciDataride/extractRidersFromResponse";
import {
  NormalizedRider,
  normalizeRiderRow,
} from "../integrations/uciDataride/normalizeRiderRow";
import { riders } from "../../shared/schema";
import { syncRidersFromRankings } from "../integrations/uciDataride/syncRidersFromRankings";

type Summary = {
  fixturesRead: number;
  responsesParsed: number;
  riderRowsFound: number;
  uniqueUciIds: number;
  inserted: number;
  updated: number;
  skipped: number;
};

type FixtureBucket = {
  entries: LoadedDatarideFixture[];
  cursor: number;
};

const TARGET_RACE_TYPE_ID = 19; // Downhill (DHI)
const TARGET_CATEGORY_ID = 22; // Men Elite
const TARGET_RANKING_TYPE_ID = 1; // Individual ranking

const CREATE_RIDERS_SQL = `
CREATE TABLE IF NOT EXISTS riders (
  id SERIAL PRIMARY KEY,
  rider_id TEXT NOT NULL UNIQUE,
  uci_id TEXT NOT NULL UNIQUE,
  dataride_object_id TEXT,
  dataride_team_code TEXT,
  name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  gender TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'elite',
  team TEXT NOT NULL,
  cost INTEGER NOT NULL DEFAULT 0,
  last_year_standing INTEGER NOT NULL DEFAULT 0,
  image TEXT NOT NULL DEFAULT '',
  image_source TEXT NOT NULL DEFAULT 'placeholder',
  image_original_url TEXT,
  image_updated_at TIMESTAMPTZ,
  image_content_hash TEXT,
  image_mime_type TEXT,
  country TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  form TEXT NOT NULL DEFAULT '[]',
  injured BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_riders_uci_id ON riders (uci_id);
`;

const IGNORED_BODY_KEYS = new Set([
  "take",
  "pagesize",
  "filter[logic]",
  "filter%5blogic%5d",
]);

function shouldIgnoreKey(key: string) {
  const lower = key.toLowerCase();
  if (IGNORED_BODY_KEYS.has(lower)) return true;
  if (lower.includes("[operator]") || lower.includes("%5doperator%5d")) {
    return true;
  }
  return false;
}

function encodeFormRecord(
  form: Record<string, string | number | undefined | null>,
) {
  const params = new URLSearchParams();
  for (const key of Object.keys(form).sort()) {
    if (shouldIgnoreKey(key)) continue;
    const value = form[key];
    if (value === undefined || value === null) continue;
    params.append(key, String(value));
  }
  return params.toString();
}

function encodeFormString(
  value?: string,
) {
  if (!value) return "";
  const params = new URLSearchParams(value);
  const sorted = new URLSearchParams();
  Array.from(params.keys())
    .sort()
    .forEach((key) => {
      if (shouldIgnoreKey(key)) {
        return;
      }
      const allValues = params.getAll(key);
      if (!allValues.length) {
        sorted.append(key, "");
      } else {
        allValues.forEach((v) => sorted.append(key, v));
      }
    });
  return sorted.toString();
}

function normalizePathWithQuery(value: string) {
  if (value.startsWith("http")) {
    const parsed = new URL(value);
    return parsed.pathname + parsed.search;
  }
  return value.startsWith("/") ? value : `/${value}`;
}

function makeFixtureKey(
  method: string,
  pathWithQuery: string,
  bodySignature?: string,
) {
  const normalizedMethod = method.toUpperCase();
  const maybeBody = bodySignature ? `|${bodySignature}` : "";
  return `${normalizedMethod} ${pathWithQuery}${maybeBody}`;
}

function getGroupsFromRankingsDisciplineResponse(
  responseJson: unknown,
): Array<{ Rankings?: unknown[] }> {
  if (Array.isArray(responseJson)) return responseJson as any;
  if (
    responseJson &&
    typeof responseJson === "object" &&
    Array.isArray((responseJson as any).data)
  ) {
    return (responseJson as any).data as any;
  }
  return [];
}

function findTargetRankingFromRankingsDiscipline(responseJson: unknown) {
  const groups = getGroupsFromRankingsDisciplineResponse(responseJson);
  for (const group of groups) {
    const rankings = Array.isArray((group as any)?.Rankings)
      ? ((group as any).Rankings as any[])
      : [];
    for (const ranking of rankings) {
      const raceTypeId = Number(ranking?.RaceTypeId);
      const categoryId = Number(ranking?.CategoryId);
      const rankingTypeId = Number(ranking?.RankingTypeId);
      if (
        raceTypeId !== TARGET_RACE_TYPE_ID ||
        categoryId !== TARGET_CATEGORY_ID ||
        rankingTypeId !== TARGET_RANKING_TYPE_ID
      ) {
        continue;
      }

      const rankingId = Number(ranking?.Id ?? ranking?.RankingId);
      if (!Number.isFinite(rankingId)) continue;

      const genderIdRaw = ranking?.GenderId;
      const genderId = Number(genderIdRaw);
      const gender =
        genderId === 2 ? "male" : genderId === 3 ? "female" : "unknown";

      return {
        rankingId,
        genderId: Number.isFinite(genderId) ? genderId : undefined,
        gender,
      };
    }
  }
  return null;
}

function buildFixtureHttpClient(fixtures: LoadedDatarideFixture[]) {
  const buckets = new Map<string, FixtureBucket>();

  for (const fixture of fixtures) {
    if (!fixture.responseJson) continue;
    const pathWithQuery = normalizePathWithQuery(fixture.normalizedPath);
    const bodySignature =
      fixture.bodyData && Object.keys(fixture.bodyData).length
        ? encodeFormRecord(fixture.bodyData)
        : encodeFormString(fixture.bodyText);
    const key = makeFixtureKey(fixture.method, pathWithQuery, bodySignature);
    if (process.env.DATARIDE_DEBUG) {
      console.log(
        `[fixture] ${fixture.fixtureId} -> ${key} (source: ${fixture.sourceDir})`,
      );
    }
    if (!buckets.has(key)) {
      buckets.set(key, { entries: [], cursor: 0 });
    }
    buckets.get(key)!.entries.push(fixture);
  }

  const getResponse = (
    key: string,
    method: string,
    pathWithQuery: string,
  ) => {
    const bucket = buckets.get(key);
    if (!bucket || bucket.entries.length === 0) {
      if (
        method === "POST" &&
        pathWithQuery.startsWith("/iframe/ObjectRankings/")
      ) {
        return { data: [], total: 0 };
      }
      throw new Error(`No fixture available for request ${key}`);
    }
    const index = Math.min(bucket.cursor, bucket.entries.length - 1);
    const entry = bucket.entries[index];
    if (bucket.cursor < bucket.entries.length - 1) {
      bucket.cursor += 1;
    }
    return entry.responseJson;
  };

  return {
    async getJson(url: string) {
      const normalized = normalizePathWithQuery(url);
      const key = makeFixtureKey("GET", normalized);
      return getResponse(key, "GET", normalized);
    },
    async postForm(
      url: string,
      form: Record<string, string | number | undefined | null>,
    ) {
      const normalized = normalizePathWithQuery(url);
      const bodySignature = encodeFormRecord(form);
      const key = makeFixtureKey("POST", normalized, bodySignature);
      return getResponse(key, "POST", normalized);
    },
  };
}

async function setupDatabase() {
  const client = new PGlite();
  await client.exec(CREATE_RIDERS_SQL);
  const db = drizzle(client);
  return { client, db };
}

async function main() {
  console.log("Running Dataride fixture verification...");

  const fixtureDirs = [
    path.resolve(process.cwd(), "docs/api/dataride/fixtures"),
    path.resolve(process.cwd(), "docs/api/dataride/fixtures-1"),
    path.resolve(process.cwd(), "docs/api/dataride/fixtures-2"),
  ];

  const fixtures = await loadDatarideFixtures({
    dirs: fixtureDirs,
  });

  if (!fixtures.length) {
    throw new Error("No fixtures found under docs/api/dataride");
  }

  const httpClient = buildFixtureHttpClient(fixtures);
  const { client, db } = await setupDatabase();

  const summary: Summary = {
    fixturesRead: fixtures.length,
    responsesParsed: 0,
    riderRowsFound: 0,
    uniqueUciIds: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
  };

  try {
    const rankingsDisciplineFixture = fixtures.find(
      (fixture) =>
        fixture.responseJson &&
        fixture.normalizedPath.includes("/iframe/RankingsDiscipline/"),
    );
    if (!rankingsDisciplineFixture?.responseJson) {
      throw new Error("No RankingsDiscipline fixture found");
    }

    const targetRanking = findTargetRankingFromRankingsDiscipline(
      rankingsDisciplineFixture.responseJson,
    );
    if (!targetRanking) {
      throw new Error(
        `Could not find target ranking in RankingsDiscipline (raceTypeId=${TARGET_RACE_TYPE_ID} categoryId=${TARGET_CATEGORY_ID} rankingTypeId=${TARGET_RANKING_TYPE_ID})`,
      );
    }
    if (targetRanking.gender === "unknown") {
      throw new Error(
        `Target ranking ${targetRanking.rankingId} has unknown GenderId (expected 2=male or 3=female)`,
      );
    }
    const targetGender = targetRanking.gender as "male" | "female";

    const objectRankingsFixture = fixtures.find((fixture) => {
      if (
        !fixture.responseJson ||
        fixture.method !== "POST" ||
        !fixture.normalizedPath.includes("/iframe/ObjectRankings/") ||
        !fixture.bodyData
      ) {
        return false;
      }

      const rankingId = fixture.bodyData.rankingId;
      const raceType = fixture.bodyData["filter[filters][0][value]"];
      const category = fixture.bodyData["filter[filters][1][value]"];

      return (
        rankingId === String(targetRanking.rankingId) &&
        raceType === String(TARGET_RACE_TYPE_ID) &&
        category === String(TARGET_CATEGORY_ID) &&
        fixture.sourceDir.endsWith("fixtures-2")
      );
    });

    if (!objectRankingsFixture?.responseJson) {
      throw new Error(
        `No fixtures-2 ObjectRankings fixture found for rankingId=${targetRanking.rankingId}`,
      );
    }

    const expectedRows = extractRidersFromResponse(objectRankingsFixture.responseJson);
    const expectedUciIds = new Set<string>();
    const samples = new Map<string, NormalizedRider>();

    summary.responsesParsed = 1;
    summary.riderRowsFound = expectedRows.length;

    for (const row of expectedRows) {
      const normalized = normalizeRiderRow(row, { gender: targetGender });
      expectedUciIds.add(normalized.uciId);
      if (samples.size < 5 && !samples.has(normalized.uciId)) {
        samples.set(normalized.uciId, normalized);
      }
    }

    const syncResult = await syncRidersFromRankings({
      httpClient,
      db: db as any,
      log: () => {},
      dryRun: false,
    });

    summary.inserted = syncResult.ridersUpserted;
    summary.updated = syncResult.ridersUpdated;
    summary.skipped = syncResult.skippedRows;
    summary.uniqueUciIds = expectedUciIds.size;

    const dbRows = await db
      .select({
        uciId: riders.uciId,
        name: riders.name,
        team: riders.team,
        gender: riders.gender,
        points: riders.points,
        cost: riders.cost,
      })
      .from(riders)
      .orderBy(riders.name);

    const dbUciIds = new Set(dbRows.map((row) => row.uciId));
    const missing = Array.from(expectedUciIds).filter(
      (uciId) => !dbUciIds.has(uciId),
    );
    const unexpected = Array.from(dbUciIds).filter(
      (uciId) => !expectedUciIds.has(uciId),
    );

    if (missing.length || unexpected.length) {
      throw new Error(
        `UCI ID mismatch. missing=${missing.join(",") || "none"} unexpected=${
          unexpected.join(",") || "none"
        }`,
      );
    }

    for (const [uciId, normalized] of Array.from(samples.entries())) {
      const row = dbRows.find((record) => record.uciId === uciId);
      if (!row) {
        throw new Error(`Sample rider ${uciId} missing from database`);
      }
      if (
        row.name !== normalized.name ||
        row.team !== normalized.team ||
        row.gender !== normalized.gender ||
        row.points !== normalized.points ||
        row.cost !== normalized.cost
      ) {
        throw new Error(`Sample rider ${uciId} fields mismatch`);
      }
    }

    console.log(
      JSON.stringify(
        {
          summary,
          syncResult,
          riders: dbRows,
        },
        null,
        2,
      ),
    );

    await client.close();
  } catch (error) {
    await client.close();
    if (error instanceof Error) {
      console.error(error.message);
      if (error.stack) console.error(error.stack);
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  }
}

main();
