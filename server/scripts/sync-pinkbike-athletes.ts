import { db } from "../db";
import { riders, type InsertRider, type Rider } from "../../shared/schema";
import { eq, or, sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

type PinkbikeAthlete = {
  name: string;
  pinkbikeProfileUrl: string;
  rawCells: string[];
};

type SyncSummary = {
  totalAthletes: number;
  matched: number;
  created: number;
  skipped: number;
  errors: number;
};

/**
 * Normalize a name for matching purposes:
 * - Remove diacritics
 * - Collapse whitespace
 * - Lowercase
 */
function normalizeNameForMatching(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Build a name key from first and last name for matching.
 * Returns tokens sorted alphabetically to handle name order differences.
 */
function buildSortedNameKey(name: string): string {
  const tokens = normalizeNameForMatching(name).split(" ").filter(Boolean);
  return tokens.sort().join(" ");
}

/**
 * Parse gender from Pinkbike rawCells.
 * rawCells[3] is "Male" or "Female"
 */
function parseGender(rawCells: string[]): "male" | "female" {
  const genderCell = rawCells[3]?.toLowerCase();
  return genderCell === "female" ? "female" : "male";
}

/**
 * Generate a unique riderId for a new rider.
 * Format: firstname-lastname in lowercase with hyphens
 */
function generateRiderId(name: string): string {
  return normalizeNameForMatching(name).replace(/\s+/g, "-");
}

/**
 * Generate a placeholder uciId for riders not in UCI system.
 * Format: PB-firstname-lastname
 */
function generatePlaceholderUciId(name: string): string {
  return `PB-${normalizeNameForMatching(name).replace(/\s+/g, "-")}`;
}

/**
 * Parse name into first and last name.
 * Pinkbike format is "Firstname Lastname"
 */
function parseName(name: string): { firstName: string; lastName: string } {
  const tokens = name.trim().split(/\s+/);
  if (tokens.length === 1) {
    return { firstName: tokens[0], lastName: "" };
  }
  const firstName = tokens[0];
  const lastName = tokens.slice(1).join(" ");
  return { firstName, lastName };
}

async function syncPinkbikeAthletes(options: {
  dryRun?: boolean;
  log?: (msg: string) => void;
}): Promise<SyncSummary> {
  const log = options.log ?? console.log;
  const dryRun = options.dryRun ?? false;

  const summary: SyncSummary = {
    totalAthletes: 0,
    matched: 0,
    created: 0,
    skipped: 0,
    errors: 0,
  };

  // Load Pinkbike data
  const dataPath = path.resolve(
    __dirname,
    "../../docs/api/pinkbike/fantasy-dh-athletes.json"
  );

  if (!fs.existsSync(dataPath)) {
    throw new Error(`Pinkbike athletes file not found: ${dataPath}`);
  }

  const athletes: PinkbikeAthlete[] = JSON.parse(
    fs.readFileSync(dataPath, "utf-8")
  );
  summary.totalAthletes = athletes.length;
  log(`Loaded ${athletes.length} Pinkbike athletes`);

  // Load all existing riders and build name lookup
  const existingRiders = await db.select().from(riders);
  const ridersByNameKey = new Map<string, Rider>();

  for (const rider of existingRiders) {
    const nameKey = buildSortedNameKey(rider.name);
    ridersByNameKey.set(nameKey, rider);

    // Also index by first+last if available
    if (rider.firstName && rider.lastName) {
      const altKey = buildSortedNameKey(`${rider.firstName} ${rider.lastName}`);
      if (!ridersByNameKey.has(altKey)) {
        ridersByNameKey.set(altKey, rider);
      }
    }
  }

  log(`Loaded ${existingRiders.length} existing riders, ${ridersByNameKey.size} name keys`);

  // Process each Pinkbike athlete
  for (const athlete of athletes) {
    try {
      const nameKey = buildSortedNameKey(athlete.name);
      const gender = parseGender(athlete.rawCells);
      const { firstName, lastName } = parseName(athlete.name);

      // Try to find matching rider
      const existingRider = ridersByNameKey.get(nameKey);

      if (existingRider) {
        // Rider already exists - no need to update, Dataride is primary
        summary.matched += 1;
        log(`Matched: ${athlete.name} -> ${existingRider.name} (uciId: ${existingRider.uciId})`);
      } else {
        // Create new rider (Pinkbike-only privateer)
        if (dryRun) {
          summary.created += 1;
          log(`[DRY RUN] Would create: ${athlete.name} (${gender})`);
          continue;
        }

        const riderId = generateRiderId(athlete.name);
        const uciId = generatePlaceholderUciId(athlete.name);

        const insertPayload: InsertRider = {
          riderId,
          uciId,
          name: athlete.name,
          firstName,
          lastName,
          gender,
          category: "elite",
          team: "Privateer",
          country: null,
          points: 0,
          cost: 10000, // Minimum cost for unranked riders
          lastYearStanding: 0,
          image: "",
          active: false, // Will be set by activation logic
        };

        await db.insert(riders).values(insertPayload).onConflictDoNothing();
        summary.created += 1;
        log(`Created: ${athlete.name} (${gender}) - uciId: ${uciId}`);
      }
    } catch (error) {
      summary.errors += 1;
      log(`Error processing ${athlete.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  log(`\nSync complete:`);
  log(`  Total athletes: ${summary.totalAthletes}`);
  log(`  Matched to existing: ${summary.matched}`);
  log(`  Created new: ${summary.created}`);
  log(`  Skipped: ${summary.skipped}`);
  log(`  Errors: ${summary.errors}`);

  return summary;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  try {
    const summary = await syncPinkbikeAthletes({ dryRun });
    console.log("\nPinkbike athletes synced successfully", summary);
    process.exit(0);
  } catch (error) {
    console.error("Failed to sync Pinkbike athletes", error);
    process.exit(1);
  }
}

void main();

export { syncPinkbikeAthletes };
