import { and, desc, gte, lte } from "drizzle-orm";
import { db } from "../../db";
import { seasons } from "@shared/schema";

export async function listSeasons() {
  return await db.select().from(seasons).orderBy(desc(seasons.startAt));
}

export async function getSeasonIdForDate(date: Date): Promise<number> {
  const match = await db
    .select()
    .from(seasons)
    .where(and(lte(seasons.startAt, date), gte(seasons.endAt, date)))
    .orderBy(desc(seasons.startAt))
    .limit(1);

  if (match[0]) {
    return match[0].id;
  }

  const latest = await db
    .select()
    .from(seasons)
    .orderBy(desc(seasons.startAt))
    .limit(1);

  if (latest[0]) {
    return latest[0].id;
  }

  const year = date.getUTCFullYear();
  const startAt = new Date(Date.UTC(year, 0, 1));
  const endAt = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

  const [created] = await db
    .insert(seasons)
    .values({
      name: `Season ${year}`,
      startAt,
      endAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return created.id;
}

export async function getActiveSeasonId(): Promise<number> {
  const now = new Date();

  const active = await db
    .select()
    .from(seasons)
    .where(and(lte(seasons.startAt, now), gte(seasons.endAt, now)))
    .orderBy(desc(seasons.startAt))
    .limit(1);

  if (active[0]) {
    return active[0].id;
  }

  const latest = await db
    .select()
    .from(seasons)
    .orderBy(desc(seasons.startAt))
    .limit(1);

  if (latest[0]) {
    return latest[0].id;
  }

  const year = now.getUTCFullYear();
  const startAt = new Date(Date.UTC(year, 0, 1));
  const endAt = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

  const [created] = await db
    .insert(seasons)
    .values({
      name: `Season ${year}`,
      startAt,
      endAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return created.id;
}
