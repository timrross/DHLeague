import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { storage } from "../storage";
import { generateRiderId } from "@shared/utils";
import { type InsertRider, type InsertRace } from "@shared/schema";

export type RiderSeed = Partial<InsertRider> & {
  name: string;
  gender: string;
  team: string;
  cost: number;
};
export type RaceSeed = Partial<InsertRace> & {
  name: string;
  location: string;
  country: string;
  startDate: string | Date;
  endDate: string | Date;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function resolveFromScripts(relativePath: string) {
  return path.resolve(__dirname, relativePath);
}

export async function loadSeedFile<T extends object>(filePath: string): Promise<T[]> {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);

  const contents = await fs.readFile(absolutePath, "utf-8");
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".json") {
    const parsed = JSON.parse(contents);
    if (!Array.isArray(parsed)) {
      throw new Error("JSON seed file must contain an array");
    }
    return parsed as T[];
  }

  if (ext === ".csv") {
    const [headerLine, ...rows] = contents
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);

    if (!headerLine) {
      throw new Error("CSV seed file must include a header row");
    }

    const headers = headerLine.split(",").map(h => h.trim());
    return rows.map(row => {
      const values = row.split(",");
      return headers.reduce((acc, header, index) => {
        acc[header] = values[index]?.trim();
        return acc;
      }, {} as Record<string, any>);
    }) as T[];
  }

  throw new Error(`Unsupported seed file format: ${ext}`);
}

export async function upsertRiders(riders: RiderSeed[]) {
  for (const rider of riders) {
    const riderId = rider.riderId ?? generateRiderId(rider.name);
    const uciId = rider.uciId ?? riderId;
    const existing = await storage.getRiderByRiderId(riderId);

    const [derivedFirstName = rider.name, derivedLastName = rider.name] = rider.name.split(" ");

    const payload: InsertRider = {
      uciId,
      riderId,
      name: rider.name,
      firstName: rider.firstName ?? derivedFirstName,
      lastName: rider.lastName ?? derivedLastName,
      gender: rider.gender,
      team: rider.team,
      cost: Number(rider.cost),
      country: rider.country ?? "",
      lastYearStanding: rider.lastYearStanding ? Number(rider.lastYearStanding) : undefined,
      image: rider.image,
      points: rider.points ? Number(rider.points) : 0,
      form: rider.form ?? "[]",
      injured: rider.injured ?? false
    };

    if (existing) {
      await storage.updateRider(existing.id, payload);
      console.log(`Updated rider ${payload.name}`);
    } else {
      await storage.createRider(payload);
      console.log(`Inserted rider ${payload.name}`);
    }
  }
}

export async function upsertRaces(races: RaceSeed[]) {
  for (const race of races) {
    const startDate = typeof race.startDate === "string" ? new Date(race.startDate) : race.startDate;
    const endDate = typeof race.endDate === "string" ? new Date(race.endDate) : race.endDate;

    if (!startDate || !endDate) {
      throw new Error(`Race ${race.name} is missing start/end dates`);
    }

    const payload: InsertRace = {
      name: race.name,
      location: race.location,
      country: race.country,
      startDate,
      endDate,
      imageUrl: race.imageUrl
    };

    const existing = await storage.getRaceByNameAndStartDate(payload.name, payload.startDate as Date);

    if (existing) {
      await storage.updateRace(existing.id, payload);
      console.log(`Updated race ${payload.name}`);
    } else {
      await storage.createRace(payload);
      console.log(`Inserted race ${payload.name}`);
    }
  }
}
