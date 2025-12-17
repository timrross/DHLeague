import { db } from "../../../server/db";
import { riders, type InsertRider, type Rider } from "@shared/schema";
import { eq } from "drizzle-orm";

import { RACE_TYPES, SPORT } from "./constants";
import { getJson, postForm } from "./http";
import {
  type CategoryKey,
  type NormalizedRider,
  type ObjectRankingRow,
  normalizeCategoryToKey,
  normalizeRiderRow,
} from "./normalize";

const PAGE_SIZE = 100;

type SyncOptions = {
  seasonId?: number | "latest";
  rankingTypeId?: number;
  dryRun?: boolean;
  log?: (message: string) => void;
};

type Season = {
  DisciplineSeasonId: number;
  SeasonName?: string;
};

type Category = {
  DisciplineSeasonCategoryId: number;
  CategoryName?: string;
  CategoryCode?: string;
};

type RaceType = {
  RankingRaceTypeId: number;
  Name?: string;
};

type RankingsDisciplineRow = {
  RankingId: number;
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

async function fetchLatestSeasonId(): Promise<number> {
  const seasons = (await getJson(`/iframe/GetDisciplineSeasons/?disciplineId=${SPORT.MTB}`)) as Season[];
  if (!Array.isArray(seasons) || seasons.length === 0) {
    throw new Error("No seasons returned from Dataride");
  }

  const sorted = [...seasons].sort(
    (a, b) => b.DisciplineSeasonId - a.DisciplineSeasonId,
  );
  return sorted[0].DisciplineSeasonId;
}

async function fetchRaceTypes(seasonId: number): Promise<RaceType[]> {
  const raceTypes = (await getJson(
    `/iframe/GetRankingsRaceTypes/?disciplineId=${SPORT.MTB}&disciplineSeasonId=${seasonId}`,
  )) as RaceType[];
  return raceTypes.filter(rt => [RACE_TYPES.DHI, RACE_TYPES.XCO].includes(rt.RankingRaceTypeId));
}

async function fetchCategories(seasonId: number) {
  const categories = (await getJson(
    `/iframe/GetRankingsCategories/?disciplineId=${SPORT.MTB}&disciplineSeasonId=${seasonId}`,
  )) as Category[];

  const wanted = new Map<CategoryKey, Category>();
  for (const category of categories) {
    const key = normalizeCategoryToKey({
      id: category.DisciplineSeasonCategoryId,
      name: category.CategoryName,
      code: category.CategoryCode,
    });

    if (key && !wanted.has(key)) {
      wanted.set(key, category);
    }
  }

  return wanted;
}

async function fetchRankingIds(
  seasonId: number,
  raceTypeId: number,
  categoryId: number,
): Promise<number[]> {
  const response = (await postForm(`/iframe/RankingsDiscipline/`, {
    SeasonId: seasonId,
    RaceTypeId: raceTypeId,
    CategoryId: categoryId,
    take: PAGE_SIZE,
    skip: 0,
    page: 1,
    pageSize: PAGE_SIZE,
  })) as { data: RankingsDisciplineRow[] };

  const rankingIds = new Set<number>();
  for (const row of response?.data ?? []) {
    if (row.RankingId) {
      rankingIds.add(row.RankingId);
    }
  }

  return Array.from(rankingIds);
}

async function fetchRankingRows(
  rankingId: number,
  filters: { seasonId: number; raceTypeId?: number; categoryId?: number },
  rankingTypeId: number,
  summary: Summary,
): Promise<ObjectRankingRow[]> {
  let page = 1;
  let skip = 0;
  const rows: ObjectRankingRow[] = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const response = (await postForm(`/iframe/ObjectRankings/`, {
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
    })) as { data: ObjectRankingRow[]; total: number };

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
  const log = options.log ?? (() => {});

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
      : await fetchLatestSeasonId();

  log(`Using season ${seasonId}${options.seasonId === "latest" || !options.seasonId ? " (latest)" : ""}`);
  summary.seasonId = seasonId;

  const raceTypes = await fetchRaceTypes(seasonId);
  log(`Fetched ${raceTypes.length} race types`);
  const categories = await fetchCategories(seasonId);
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
    for (const [categoryKey, category] of relevantCategories) {
      if (!category) continue;
      summary.combosProcessed += 1;

      const rankingIds = await fetchRankingIds(
        seasonId,
        raceType.RankingRaceTypeId,
        category.DisciplineSeasonCategoryId,
      );
      summary.rankingsProcessed += rankingIds.length;

      const categoryLabel =
        category.CategoryName ?? category.CategoryCode ?? category.DisciplineSeasonCategoryId;
      log(
        `Fetched ${rankingIds.length} ranking IDs for ${raceType.Name ?? raceType.RankingRaceTypeId} / ${categoryLabel}`,
      );

      for (const rankingId of rankingIds) {
        try {
          const rows = await fetchRankingRows(
            rankingId,
            {
              seasonId,
              raceTypeId: raceType.RankingRaceTypeId,
              categoryId: category.DisciplineSeasonCategoryId,
            },
            rankingTypeId,
            summary,
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
