import { db } from "../../../server/db";
import { riders, type InsertRider, type Rider } from "@shared/schema";
import { eq } from "drizzle-orm";

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

type SyncOptions = {
  seasonId?: number | "latest";
  rankingTypeId?: number;
  dryRun?: boolean;
  log?: Logger;
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
  form["filter[logic]"] = "and";
  for (const filter of filters) {
    if (filter.value === undefined || filter.value === null || filter.value === "") {
      continue;
    }

    form[`filter[filters][${index}][field]`] = filter.field;
    form[`filter[filters][${index}][operator]`] = "eq";
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
  errors: number;
};

function genderFromCategory(category: CategoryKey): "male" | "female" {
  return category === "ELITE_WOMEN" || category === "JUNIOR_WOMEN"
    ? "female"
    : "male";
}

async function fetchLatestSeasonId(log: Logger): Promise<number> {
  const path = `/iframe/GetDisciplineSeasons/?disciplineId=${SPORT.MTB}`;
  log(`GET ${BASE_URL}${path}`);
  const seasons = (await getJson(path)) as Season[];
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

async function fetchRaceTypes(seasonId: number, log: Logger): Promise<RaceType[]> {
  const path = `/iframe/GetRankingsRaceTypes/?disciplineId=${SPORT.MTB}&disciplineSeasonId=${seasonId}`;
  log(`GET ${BASE_URL}${path}`);
  const raceTypes = (await getJson(path)) as RaceType[];
  const allowedIds = new Set([RACE_TYPES.DHI, RACE_TYPES.XCO]);
  const allowedCodes = new Set(["DHI", "XCO"]);
  return raceTypes.filter(rt => {
    const id = resolveRaceTypeId(rt);
    if (id && allowedIds.has(id)) return true;
    const code = rt.Code?.toUpperCase();
    return Boolean(code && allowedCodes.has(code));
  });
}

async function fetchCategories(seasonId: number, log: Logger) {
  const path = `/iframe/GetRankingsCategories/?disciplineId=${SPORT.MTB}&disciplineSeasonId=${seasonId}`;
  log(`GET ${BASE_URL}${path}`);
  const categories = (await getJson(path)) as Category[];

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

async function fetchRankingIds(
  seasonId: number,
  raceTypeId: number,
  categoryId: number,
  rankingTypeId: number,
  log: Logger,
): Promise<number[]> {
  const path = `/iframe/RankingsDiscipline/`;
  const form: Record<string, string | number> = {
    disciplineId: SPORT.MTB,
    take: PAGE_SIZE,
    skip: 0,
    page: 1,
    pageSize: PAGE_SIZE,
  };
  applyKendoFilters(form, [
    { field: "RaceTypeId", value: raceTypeId },
    { field: "CategoryId", value: categoryId },
    { field: "SeasonId", value: seasonId },
  ]);
  log(`POST ${BASE_URL}${path} body=${JSON.stringify(form)}`);
  const response = (await postForm(path, form)) as
    | RankingsDisciplineGroup[]
    | { data?: RankingsDisciplineGroup[] };

  const groups = Array.isArray(response)
    ? response
    : Array.isArray(response?.data)
      ? response.data
      : [];

  const rankingIds = new Set<number>();
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
      rankingIds.add(id);
    }
  }

  return Array.from(rankingIds);
}

async function fetchRankingRows(
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
    const requestPayload = {
      rankingId,
      disciplineId: SPORT.MTB,
      rankingTypeId,
      take: PAGE_SIZE,
      skip,
      page,
      pageSize: PAGE_SIZE,
      RaceTypeId: filters.raceTypeId,
      CategoryId: filters.categoryId,
      SeasonId: filters.seasonId,
    };
    applyKendoFilters(requestPayload, [
      { field: "RaceTypeId", value: filters.raceTypeId },
      { field: "CategoryId", value: filters.categoryId },
      { field: "SeasonId", value: filters.seasonId },
    ]);
    log(
      `POST ${BASE_URL}${path}?rankingId=${rankingId}&page=${page} body=${JSON.stringify(requestPayload)}`,
    );
    const response = (await postForm(path, requestPayload)) as {
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

async function upsertRiders(
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
      team: rider.team,
      country: rider.country,
      points: rider.points,
      cost: rider.cost,
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

    await db
      .insert(riders)
      .values(insertPayload)
      .onConflictDoUpdate({
        target: riders.uciId,
        set: {
          name: rider.name,
          firstName: rider.firstName,
          lastName: rider.lastName,
          gender: rider.gender,
          team: rider.team,
          country: rider.country,
          points: rider.points,
          cost: rider.cost,
          image: rider.image,
          datarideObjectId: rider.datarideObjectId,
          datarideTeamCode: rider.datarideTeamCode,
        },
      });

    if (existing) {
      summary.ridersUpdated += 1;
    } else {
      summary.ridersUpserted += 1;
      const refreshed = await db
        .select()
        .from(riders)
        .where(eq(riders.uciId, rider.uciId));
      if (refreshed[0]) {
        existingByUciId.set(rider.uciId, refreshed[0]);
      }
    }
  }
}

export async function syncRidersFromRankings(options: SyncOptions = {}): Promise<Summary> {
  const log: Logger = options.log ?? (() => {});

  const summary: Summary = {
    seasonId: 0,
    combosProcessed: 0,
    rankingsProcessed: 0,
    pagesFetched: 0,
    ridersUpserted: 0,
    ridersUpdated: 0,
    skippedRows: 0,
    errors: 0,
  };

  const rankingTypeId = options.rankingTypeId ?? 1;

  const seasonId =
    options.seasonId && options.seasonId !== "latest"
      ? options.seasonId
      : await fetchLatestSeasonId(log);

  log(`Using season ${seasonId}${options.seasonId === "latest" || !options.seasonId ? " (latest)" : ""}`);
  summary.seasonId = seasonId;

  const raceTypes = await fetchRaceTypes(seasonId, log);
  log(`Fetched ${raceTypes.length} race types`);
  const categories = await fetchCategories(seasonId, log);
  log(`Fetched ${categories.size} categories`);

  const relevantCategories = Array.from(categories.entries()).filter(([key]) =>
    ["ELITE_MEN", "ELITE_WOMEN", "JUNIOR_MEN", "JUNIOR_WOMEN"].includes(key),
  );

  log(`Processing ${relevantCategories.length} category/race type combinations`);

  const existingRiders = new Map<string, Rider>();
  const existingRows = await db.select().from(riders);
  for (const rider of existingRows) {
    existingRiders.set(rider.uciId, rider);
  }

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

      const rankingIds = await fetchRankingIds(
        seasonId,
        raceTypeId,
        category.DisciplineSeasonCategoryId,
        rankingTypeId,
        log,
      );
      summary.rankingsProcessed += rankingIds.length;

      const categoryLabel =
        category.CategoryName ?? category.CategoryCode ?? category.DisciplineSeasonCategoryId;
      const raceLabel =
        raceType.DisplayText ??
        ([raceType.Code, raceType.Name].filter(Boolean).join(" / ") || raceTypeId);
      log(
        `Fetched ${rankingIds.length} ranking IDs for ${raceLabel} / ${categoryLabel}`,
      );

      for (const rankingId of rankingIds) {
        try {
          const rows = await fetchRankingRows(
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
            normalizeRiderRow(row, genderFromCategory(categoryKey)),
          );

          await upsertRiders(normalizedRows, existingRiders, summary, options.dryRun);
        } catch (error) {
          summary.errors += 1;
          // eslint-disable-next-line no-console
          console.error(`Failed to process ranking ${rankingId}`, error);
          log(`Failed to process ranking ${rankingId}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  }

  log(
    `Finished. Upserted ${summary.ridersUpserted}, updated ${summary.ridersUpdated}, skipped ${summary.skippedRows}, errors ${summary.errors}.`,
  );

  return summary;
}

export default syncRidersFromRankings;
