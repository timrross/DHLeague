import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import { db } from "../../server/db";
import { riders, type InsertRider, type Rider } from "@shared/schema";
import { generateRiderId } from "@shared/utils";
import { desc } from "drizzle-orm";

type GenderId = 1 | 2;

type UciRider = {
  IndividualFullName?: string;
  DisplayName?: string;
  RiderName?: string;
  FullName?: string;
  TeamName?: string;
  Team?: string;
  NationFullName?: string;
  Country?: string;
  CountryIsoCode2?: string;
  Points?: number;
  Rank?: number;
  Position?: number;
  riderUrl?: string;
};

type CachedPayload = {
  fetchedAt: string;
  male: UciRider[];
  female: UciRider[];
};

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_IMAGE =
  "https://www.uci.org/docs/default-source/imported-images/discipline/discipline-mountain-bike.jpg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_FILE = path.resolve(__dirname, "cache.json");

const riderSchema = z.object({
  name: z.string().min(1, "Rider name is required"),
  gender: z.enum(["male", "female"]),
  team: z.string().min(1, "Team is required"),
  country: z.string().optional().default(""),
  points: z.number().nonnegative(),
  rank: z.number().int().nonnegative().optional(),
  image: z.string().url().optional(),
});

async function readCache(): Promise<CachedPayload | null> {
  try {
    const contents = await fs.readFile(CACHE_FILE, "utf-8");
    const parsed = JSON.parse(contents) as CachedPayload;
    const fetchedAt = new Date(parsed.fetchedAt).getTime();
    if (Number.isNaN(fetchedAt) || Date.now() - fetchedAt > CACHE_TTL_MS) {
      return null;
    }
    return parsed;
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return null;
    }
    console.warn("Failed to read cache", error);
    return null;
  }
}

async function writeCache(data: CachedPayload) {
  await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
  await fs.writeFile(CACHE_FILE, JSON.stringify(data, null, 2), "utf-8");
}

async function fetchRanking(genderId: GenderId): Promise<UciRider[]> {
  const response = await fetch(
    `https://dataride.uci.org/api/Ranking/GetRankingByDiscipline?disciplineId=6&genderId=${genderId}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch rankings for gender ${genderId}`);
  }

  const data = (await response.json()) as unknown;
  if (!Array.isArray(data)) {
    throw new Error("Unexpected response format from UCI API");
  }

  return data as UciRider[];
}

function mapRider(raw: UciRider, gender: "male" | "female"): InsertRider {
  const name =
    raw.IndividualFullName ||
    raw.DisplayName ||
    raw.RiderName ||
    raw.FullName;

  const parsed = riderSchema.parse({
    name,
    gender,
    team: raw.TeamName || raw.Team || "Independent",
    country: raw.NationFullName || raw.Country || raw.CountryIsoCode2 || "",
    points: Number(raw.Points ?? 0),
    rank: raw.Rank ?? raw.Position ?? 0,
    image: DEFAULT_IMAGE,
  });

  const riderId = generateRiderId(parsed.name);
  const [firstName = parsed.name, lastName = parsed.name] = parsed.name.split(" ");
  const points = Math.round(parsed.points);

  return {
    riderId,
    name: parsed.name,
    firstName,
    lastName,
    gender: parsed.gender,
    team: parsed.team,
    country: parsed.country,
    points,
    cost: points * 1000,
    lastYearStanding: parsed.rank ?? 0,
    image: parsed.image ?? DEFAULT_IMAGE,
    form: "[]",
    injured: false,
  } satisfies InsertRider;
}

async function upsertRiders(riderList: InsertRider[]) {
  for (const rider of riderList) {
    await db
      .insert(riders)
      .values(rider)
      .onConflictDoUpdate({
        target: riders.riderId,
        set: {
          name: rider.name,
          firstName: rider.firstName,
          lastName: rider.lastName,
          gender: rider.gender,
          team: rider.team,
          cost: rider.cost,
          lastYearStanding: rider.lastYearStanding,
          image: rider.image,
          country: rider.country,
          points: rider.points,
          form: rider.form,
          injured: rider.injured,
        },
      });
  }
}

export async function syncUciRiders() {
  const cache = await readCache();
  let maleData: UciRider[];
  let femaleData: UciRider[];

  if (cache) {
    ({ male: maleData, female: femaleData } = cache);
    console.log("Using cached UCI rider rankings");
  } else {
    [maleData, femaleData] = await Promise.all([
      fetchRanking(1),
      fetchRanking(2),
    ]);
    await writeCache({
      fetchedAt: new Date().toISOString(),
      male: maleData,
      female: femaleData,
    });
  }

  console.log(
    `Fetched ${maleData.length} male riders and ${femaleData.length} female riders`
  );

  const ridersToUpsert = [
    ...maleData.map((rider) => mapRider(rider, "male")),
    ...femaleData.map((rider) => mapRider(rider, "female")),
  ];

  await upsertRiders(ridersToUpsert);
  console.log(`Upserted ${ridersToUpsert.length} riders`);
}

export async function getTopRiders(limit = 20): Promise<Rider[]> {
  return db.select().from(riders).orderBy(desc(riders.points)).limit(limit);
}

export default syncUciRiders;
