import {
  riders,
  type InsertRider,
  type Rider,
} from "../../../shared/schema";
import { FEATURES } from "../../../server/services/features";
import { UCIApiService } from "../../../server/services/uciApi";
import { eq, notInArray } from "drizzle-orm";

import { BASE_URL, RACE_TYPES, SPORT } from "./constants";
import { getJson, postForm } from "./http";
import {
  type CategoryKey,
  type NormalizedRider,
  type ObjectRankingRow,
  normalizeCategoryToKey,
  normalizeRiderRow,
} from "./normalize";

const PAGE_SIZE = 100;

type Logger = (message: string) => void;

type AppDb = typeof import("../../../server/db") extends { db: infer DB }
  ? DB
  : never;

type DatarideHttpClient = {
  getJson: (url: string) => Promise<any>;
  postForm: (
    url: string,
    form: Record<string, string | number | undefined | null>,
  ) => Promise<any>;
};

type SyncOptions = {
  seasonId?: number | "latest";
  rankingTypeId?: number;
  uciSeasonYear?: number;
  filterByUciRidersApi?: boolean;
  dryRun?: boolean;
  log?: Logger;
  httpClient?: DatarideHttpClient;
  db?: AppDb;
};

type Season = {
  DisciplineSeasonId?: number;
  Id?: number;
  SeasonName?: string;
};

type Category = {
  DisciplineSeasonCategoryId?: number;
  Id?: number;
  CategoryName?: string;
  CategoryCode?: string;
  Name?: string;
  Code?: string;
  DisplayText?: string;
};

type RaceType = {
  RankingRaceTypeId?: number;
  Id?: number;
  Name?: string;
  Code?: string;
  DisplayText?: string;
};

type UciRiderProfile = {
  givenName?: string;
  familyName?: string;
  teamName?: string;
  countryCode?: string;
  format?: string;
  url?: string;
};

type UciAllowlistEntry = {
  nameKey: string;
  givenName: string;
  familyName: string;
  teamName?: string;
  countryCode?: string;
};

function normalizeNameToken(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function buildNameKey(firstName: string, lastName: string): string {
  return `${normalizeNameToken(firstName)}:${normalizeNameToken(lastName)}`;
}

function buildNameKeyFromFullName(name: string): string | null {
  const tokens = name.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return null;
  return buildNameKey(tokens[0], tokens.slice(1).join(" "));
}

function buildNameKeyFromRider(rider: NormalizedRider): string | null {
  const firstName = rider.firstName?.trim();
  const lastName = rider.lastName?.trim();
  if (firstName && lastName) {
    return buildNameKey(firstName, lastName);
  }
  return buildNameKeyFromFullName(rider.name);
}

function resolveRaceTypeId(rt: RaceType): number | null {
  const raw =
    rt.RankingRaceTypeId ??
    rt.Id ??
    (rt as { rankingRaceTypeId?: number }).rankingRaceTypeId ??
    (rt as { id?: number }).id;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function applyKendoFilters(
  form: Record<string, string | number | undefined | null>,
  filters: Array<{ field: string; value: string | number | undefined | null }>,
) {
  let index = 0;
  for (const filter of filters) {
    if (filter.value === undefined || filter.value === null) {
      continue;
    }

    form[`filter[filters][${index}][field]`] = filter.field;
    form[`filter[filters][${index}][value]`] = filter.value;
    index += 1;
  }
}

type RankingsDisciplineRow = {
  Id?: number;
  RankingId?: number;
  RaceTypeId?: number;
  CategoryId?: number;
  RankingTypeId?: number;
  GenderId?: number;
  MomentId?: number;
};

type RankingsDisciplineGroup = {
  GroupId?: number;
  GroupName?: string;
  Rankings?: RankingsDisciplineRow[];
};

type Summary = {
  seasonId: number;
  combosProcessed: number;
  rankingsProcessed: number;
  pagesFetched: number;
  ridersUpserted: number;
  ridersUpdated: number;
  skippedRows: number;
  ridersFilteredOut: number;
  ridersDeleted: number;
  uciAllowlistCount: number;
  uciAllowlistKeys: number;
  ambiguousMatches: number;
  errors: number;
};

function genderFromCategory(category: CategoryKey): "male" | "female" {
  return category === "ELITE_WOMEN" || category === "JUNIOR_WOMEN"
    ? "female"
    : "male";
}

async function fetchUciAllowlist(
  log: Logger,
  seasonYear?: number,
): Promise<Map<string, UciAllowlistEntry[]>> {
  const uciApi = new UCIApiService();
  const label = seasonYear ? ` (${seasonYear})` : "";
  log(`Fetching UCI riders allowlist${label}`);
  const riders = (await uciApi.getMTBDownhillRiders(seasonYear)) as UciRiderProfile[];
  const allowlist = new Map<string, UciAllowlistEntry[]>();

  for (const rider of riders) {
    const givenName = rider.givenName?.trim();
    const familyName = rider.familyName?.trim();
    if (!givenName || !familyName) {
      continue;
    }
    const nameKey = buildNameKey(givenName, familyName);
    const entry: UciAllowlistEntry = {
      nameKey,
      givenName,
      familyName,
      teamName: rider.teamName?.trim() || undefined,
      countryCode: rider.countryCode?.trim() || undefined,
    };
    const entries = allowlist.get(nameKey) ?? [];
    entries.push(entry);
    allowlist.set(nameKey, entries);
  }

  log(`UCI allowlist loaded: ${allowlist.size} unique names`);
  return allowlist;
}

async function fetchLatestSeasonId(
  httpClient: DatarideHttpClient,
  log: Logger,
): Promise<number> {
  const path = `/iframe/GetDisciplineSeasons/?disciplineId=${SPORT.MTB}`;
  log(`GET ${BASE_URL}${path}`);
  const seasons = (await httpClient.getJson(path)) as Season[];
  if (!Array.isArray(seasons) || seasons.length === 0) {
    throw new Error("No seasons returned from Dataride");
  }

  const normalized = seasons
    .map((season = {}) => {
      const rawId =
        season.DisciplineSeasonId ??
        season.Id ??
        (season as { disciplineSeasonId?: number }).disciplineSeasonId ??
        (season as { id?: number }).id;
      const parsedId = Number(rawId);
      return Number.isFinite(parsedId)
        ? { ...season, DisciplineSeasonId: parsedId }
        : null;
    })
    .filter(
      (season): season is Season & { DisciplineSeasonId: number } =>
        season !== null && typeof season.DisciplineSeasonId === "number",
    );

  if (!normalized.length) {
    const snippet = JSON.stringify(seasons).slice(0, 200);
    throw new Error(`Invalid season payload from Dataride: ${snippet}`);
  }

  normalized.sort((a, b) => b.DisciplineSeasonId! - a.DisciplineSeasonId!);
  return normalized[0].DisciplineSeasonId!;
}

async function fetchRaceTypes(
  httpClient: DatarideHttpClient,
  seasonId: number,
  log: Logger,
): Promise<RaceType[]> {
  const path = `/iframe/GetRankingsRaceTypes/?disciplineId=${SPORT.MTB}&disciplineSeasonId=${seasonId}`;
  log(`GET ${BASE_URL}${path}`);
  const raceTypes = (await httpClient.getJson(path)) as RaceType[];
  const allowedIds = new Set<number>([RACE_TYPES.DHI]);
  const allowedCodes = new Set(["DHI"]);
  return raceTypes.filter(rt => {
    const id = resolveRaceTypeId(rt);
    if (id && allowedIds.has(id)) return true;
    const code = rt.Code?.toUpperCase();
    return Boolean(code && allowedCodes.has(code));
  });
}

async function fetchCategories(
  httpClient: DatarideHttpClient,
  seasonId: number,
  log: Logger,
) {
  const path = `/iframe/GetRankingsCategories/?disciplineId=${SPORT.MTB}&disciplineSeasonId=${seasonId}`;
  log(`GET ${BASE_URL}${path}`);
  const categories = (await httpClient.getJson(path)) as Category[];

  const wanted = new Map<CategoryKey, Category>();
  for (const rawCategory of categories) {
    const normalizedCategory: Category = {
      ...rawCategory,
      DisciplineSeasonCategoryId:
        Number(
          rawCategory.DisciplineSeasonCategoryId ??
            rawCategory.Id ??
            (rawCategory as { id?: number }).id ??
            (rawCategory as { disciplineSeasonCategoryId?: number })
              .disciplineSeasonCategoryId,
        ),
      CategoryName: rawCategory.CategoryName ?? rawCategory.Name,
      CategoryCode: (rawCategory.CategoryCode ?? rawCategory.Code)?.toUpperCase(),
    };

    if (
      !Number.isFinite(normalizedCategory.DisciplineSeasonCategoryId ?? NaN)
    ) {
      log(
        `Skipping category with missing ID: ${JSON.stringify(rawCategory).slice(0, 120)}`,
      );
      continue;
    }

    const key = normalizeCategoryToKey({
      id: normalizedCategory.DisciplineSeasonCategoryId!,
      name: normalizedCategory.CategoryName ?? normalizedCategory.Name,
      code: normalizedCategory.CategoryCode ?? normalizedCategory.Code,
    });

    if (key && !wanted.has(key)) {
      wanted.set(key, normalizedCategory);
    }
  }

  return wanted;
}

type RankingDefinition = {
  id: number;
  gender?: "male" | "female";
};

async function fetchRankingIds(
  httpClient: DatarideHttpClient,
  seasonId: number,
  raceTypeId: number,
  categoryId: number,
  rankingTypeId: number,
  categoryKey: CategoryKey,
  log: Logger,
): Promise<RankingDefinition[]> {
  const path = `/iframe/RankingsDiscipline/`;
  const form: Record<string, string | number> = {
    disciplineId: SPORT.MTB,
    take: PAGE_SIZE,
    skip: 0,
    page: 1,
    pageSize: PAGE_SIZE,
  };
  applyKendoFilters(form, [
    // Dataride only returns complete ranking definitions when the filters
    // request "All" (value=0) for race type and category. Filter client-side.
    { field: "RaceTypeId", value: 0 },
    { field: "CategoryId", value: 0 },
    { field: "SeasonId", value: seasonId },
  ]);
  log(`POST ${BASE_URL}${path} body=${JSON.stringify(form)}`);
  const response = (await httpClient.postForm(path, form)) as
    | RankingsDisciplineGroup[]
    | { data?: RankingsDisciplineGroup[] };

  const groups = Array.isArray(response)
    ? response
    : Array.isArray(response?.data)
      ? response.data
      : [];

  const rankingDefs: RankingDefinition[] = [];
  for (const group of groups) {
    for (const ranking of group?.Rankings ?? []) {
      const id = ranking.Id ?? ranking.RankingId;
      if (!id) continue;
      if (
        typeof raceTypeId === "number" &&
        ranking.RaceTypeId &&
        ranking.RaceTypeId !== raceTypeId
      ) {
        continue;
      }
      if (
        typeof categoryId === "number" &&
        ranking.CategoryId &&
        ranking.CategoryId !== categoryId
      ) {
        continue;
      }
      if (
        typeof rankingTypeId === "number" &&
        ranking.RankingTypeId &&
        ranking.RankingTypeId !== rankingTypeId
      ) {
        continue;
      }
      const gender =
        ranking.GenderId === 2
          ? "male"
          : ranking.GenderId === 3
            ? "female"
            : undefined;
      rankingDefs.push({ id, gender: gender ?? genderFromCategory(categoryKey) ?? undefined });
    }
  }

  const deduped = new Map<number, RankingDefinition>();
  for (const def of rankingDefs) {
    const existing = deduped.get(def.id);
    if (!existing || (!existing.gender && def.gender)) {
      deduped.set(def.id, def);
    }
  }

  return Array.from(deduped.values());
}

async function fetchRankingRows(
  httpClient: DatarideHttpClient,
  rankingId: number,
  filters: { seasonId: number; raceTypeId?: number; categoryId?: number },
  rankingTypeId: number,
  summary: Summary,
  log: Logger,
): Promise<ObjectRankingRow[]> {
  let page = 1;
  let skip = 0;
  const rows: ObjectRankingRow[] = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const path = `/iframe/ObjectRankings/`;
    const requestPayload: Record<string, string | number | undefined | null> = {
      rankingId,
      disciplineId: SPORT.MTB,
      rankingTypeId,
      take: PAGE_SIZE,
      skip,
      page,
      pageSize: PAGE_SIZE,
    };
    applyKendoFilters(requestPayload, [
      { field: "RaceTypeId", value: filters.raceTypeId },
      { field: "CategoryId", value: filters.categoryId },
      { field: "SeasonId", value: filters.seasonId },
      { field: "MomentId", value: 0 },
      { field: "CountryId", value: "" },
      { field: "IndividualName", value: "" },
      { field: "TeamName", value: "" },
    ]);
    log(
      `POST ${BASE_URL}${path}?rankingId=${rankingId}&page=${page} body=${JSON.stringify(requestPayload)}`,
    );
    const response = (await httpClient.postForm(path, requestPayload)) as {
      data: ObjectRankingRow[];
      total: number;
    };

    summary.pagesFetched += 1;

    if (!response?.data?.length) {
      break;
    }

    rows.push(...response.data);

    if (rows.length >= response.total) {
      break;
    }

    page += 1;
    skip += PAGE_SIZE;
  }

  return rows;
}

function applyUciAllowlist(
  normalizedRows: NormalizedRider[],
  allowlist: Map<string, UciAllowlistEntry[]>,
  summary: Summary,
  log: Logger,
): NormalizedRider[] {
  const filtered: NormalizedRider[] = [];

  for (const rider of normalizedRows) {
    const nameKey = buildNameKeyFromRider(rider);
    if (!nameKey) {
      summary.skippedRows += 1;
      summary.ridersFilteredOut += 1;
      continue;
    }

    const matches = allowlist.get(nameKey);
    if (!matches || matches.length === 0) {
      summary.ridersFilteredOut += 1;
      continue;
    }

    if (matches.length > 1) {
      summary.ambiguousMatches += 1;
      summary.ridersFilteredOut += 1;
      log(
        `Skipping ${rider.name} due to ambiguous UCI allowlist matches (${matches.length}).`,
      );
      continue;
    }

    const match = matches[0];
    if (match.teamName) {
      filtered.push({ ...rider, team: match.teamName });
    } else {
      filtered.push(rider);
    }
  }

  return filtered;
}

async function upsertRiders(
  database: AppDb,
  normalized: NormalizedRider[],
  existingByUciId: Map<string, Rider>,
  summary: Summary,
  dryRun?: boolean,
) {
  for (const rider of normalized) {
    const existing = existingByUciId.get(rider.uciId);

    const insertPayload: InsertRider = {
      riderId: existing?.riderId ?? rider.riderId,
      uciId: rider.uciId,
      datarideObjectId: rider.datarideObjectId,
      datarideTeamCode: rider.datarideTeamCode,
      name: rider.name,
      firstName: rider.firstName,
      lastName: rider.lastName,
      gender: rider.gender,
      category: rider.category,
      team: rider.team,
      country: rider.country,
      points: rider.points,
      cost: rider.cost,
      lastYearStanding: rider.lastYearStanding,
      image: rider.image,
    };

    if (dryRun) {
      if (existing) {
        summary.ridersUpdated += 1;
      } else {
        summary.ridersUpserted += 1;
      }
      continue;
    }

    await database
      .insert(riders)
      .values(insertPayload)
      .onConflictDoUpdate({
        target: riders.uciId,
        set: {
          name: rider.name,
          firstName: rider.firstName,
          lastName: rider.lastName,
          gender: rider.gender,
          category: rider.category,
          team: rider.team,
          country: rider.country,
          points: rider.points,
          cost: rider.cost,
          lastYearStanding: rider.lastYearStanding,
          datarideObjectId: rider.datarideObjectId,
          datarideTeamCode: rider.datarideTeamCode,
        },
      });

    if (existing) {
      summary.ridersUpdated += 1;
    } else {
      summary.ridersUpserted += 1;
      const refreshed = await database
        .select()
        .from(riders)
        .where(eq(riders.uciId, rider.uciId));
      if (refreshed[0]) {
        existingByUciId.set(rider.uciId, refreshed[0]);
      }
    }
  }
}

let cachedDbPromise: Promise<AppDb> | null = null;

async function resolveDatabase(provided?: AppDb) {
  if (provided) return provided;
  if (!cachedDbPromise) {
    cachedDbPromise = import("../../../server/db").then((module) => module.db as AppDb);
  }
  return cachedDbPromise;
}

export async function syncRidersFromRankings(options: SyncOptions = {}): Promise<Summary> {
  const log: Logger = options.log ?? (() => {});
  const httpClient: DatarideHttpClient = options.httpClient ?? {
    getJson,
    postForm,
  };
  const database = await resolveDatabase(options.db);

  const summary: Summary = {
    seasonId: 0,
    combosProcessed: 0,
    rankingsProcessed: 0,
    pagesFetched: 0,
    ridersUpserted: 0,
    ridersUpdated: 0,
    skippedRows: 0,
    ridersFilteredOut: 0,
    ridersDeleted: 0,
    uciAllowlistCount: 0,
    uciAllowlistKeys: 0,
    ambiguousMatches: 0,
    errors: 0,
  };

  const rankingTypeId = options.rankingTypeId ?? 1;

  const seasonId =
    options.seasonId && options.seasonId !== "latest"
      ? options.seasonId
      : await fetchLatestSeasonId(httpClient, log);

  log(`Using season ${seasonId}${options.seasonId === "latest" || !options.seasonId ? " (latest)" : ""}`);
  summary.seasonId = seasonId;

  const raceTypes = await fetchRaceTypes(httpClient, seasonId, log);
  log(`Fetched ${raceTypes.length} race types`);
  const categories = await fetchCategories(httpClient, seasonId, log);
  log(`Fetched ${categories.size} categories`);

  const allowedCategoryKeys = FEATURES.JUNIOR_TEAM_ENABLED
    ? ["ELITE_MEN", "ELITE_WOMEN", "JUNIOR_MEN", "JUNIOR_WOMEN"]
    : ["ELITE_MEN", "ELITE_WOMEN"];
  const relevantCategories = Array.from(categories.entries()).filter(([key]) =>
    allowedCategoryKeys.includes(key),
  );

  log(
    `Processing ${raceTypes.length * relevantCategories.length} category/race type combinations`,
  );

  const useUciAllowlist = options.filterByUciRidersApi === true;
  const uciSeasonYear =
    options.uciSeasonYear ??
    (process.env.UCI_RIDERS_SEASON_YEAR
      ? Number(process.env.UCI_RIDERS_SEASON_YEAR)
      : undefined);
  const uciAllowlist = useUciAllowlist
    ? await fetchUciAllowlist(log, uciSeasonYear)
    : null;

  if (uciAllowlist) {
    summary.uciAllowlistKeys = uciAllowlist.size;
    summary.uciAllowlistCount = Array.from(uciAllowlist.values()).reduce(
      (total, entries) => total + entries.length,
      0,
    );
  }

  const existingRiders = new Map<string, Rider>();
  const existingRows = await database.select().from(riders);
  for (const rider of existingRows) {
    existingRiders.set(rider.uciId, rider);
  }

  const allowlistedUciIds = new Set<string>();

  for (const raceType of raceTypes) {
    const raceTypeId = resolveRaceTypeId(raceType);
    if (!raceTypeId) {
      log(
        `Skipping race type with missing ID: ${JSON.stringify(raceType).slice(0, 120)}`,
      );
      continue;
    }
    for (const [categoryKey, category] of relevantCategories) {
      if (!category) continue;
      summary.combosProcessed += 1;

      const rankingDefs = await fetchRankingIds(
        httpClient,
        seasonId,
        raceTypeId,
        category.DisciplineSeasonCategoryId!,
        rankingTypeId,
        categoryKey,
        log,
      );
      summary.rankingsProcessed += rankingDefs.length;

      const categoryLabel =
        category.CategoryName ?? category.CategoryCode ?? category.DisciplineSeasonCategoryId;
      const raceLabel =
        raceType.DisplayText ??
        ([raceType.Code, raceType.Name].filter(Boolean).join(" / ") || raceTypeId);
      log(
        `Fetched ${rankingDefs.length} ranking IDs for ${raceLabel} / ${categoryLabel}`,
      );

      for (const { id: rankingId, gender } of rankingDefs) {
        const normalizedGender = gender ?? genderFromCategory(categoryKey);
        if (!normalizedGender) {
          log(`Skipping ranking ${rankingId} due to unknown gender (GenderId=${gender ?? "n/a"})`);
          continue;
        }
        try {
          const normalizedCategory =
            categoryKey === "JUNIOR_MEN" || categoryKey === "JUNIOR_WOMEN"
              ? "junior"
              : "elite";
          const rows = await fetchRankingRows(
            httpClient,
            rankingId,
            {
              seasonId,
              raceTypeId,
              categoryId: category.DisciplineSeasonCategoryId,
            },
            rankingTypeId,
            summary,
            log,
          );

          const normalizedRows = rows.map(row =>
            normalizeRiderRow(row, normalizedGender, normalizedCategory),
          );

          const rowsToUpsert = uciAllowlist
            ? applyUciAllowlist(normalizedRows, uciAllowlist, summary, log)
            : normalizedRows;

          if (uciAllowlist) {
            for (const rider of rowsToUpsert) {
              allowlistedUciIds.add(rider.uciId);
            }
          }

          await upsertRiders(
            database,
            rowsToUpsert,
            existingRiders,
            summary,
            options.dryRun,
          );
        } catch (error) {
          summary.errors += 1;
          // eslint-disable-next-line no-console
          console.error(`Failed to process ranking ${rankingId}`, error);
          log(`Failed to process ranking ${rankingId}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  }

  if (uciAllowlist && !options.dryRun) {
    if (allowlistedUciIds.size === 0) {
      log("Skipping rider cleanup because no allowlisted riders matched.");
    } else {
      const deleted = await database
        .delete(riders)
        .where(notInArray(riders.uciId, Array.from(allowlistedUciIds)))
        .returning({ uciId: riders.uciId });
      summary.ridersDeleted = deleted.length;
      log(`Removed ${summary.ridersDeleted} riders not in UCI allowlist.`);
    }
  }

  log(
    `Finished. Upserted ${summary.ridersUpserted}, updated ${summary.ridersUpdated}, skipped ${summary.skippedRows}, errors ${summary.errors}.`,
  );

  return summary;
}

export default syncRidersFromRankings;
