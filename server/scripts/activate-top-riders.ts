import path from "path";
import { fileURLToPath } from "url";
import { db } from "../db";
import { riders } from "../../shared/schema";
import { eq, sql, desc, asc, inArray } from "drizzle-orm";

const RIDERS_PER_GENDER = 200;

type ActivationSummary = {
  maleActivated: number;
  femaleActivated: number;
  totalDeactivated: number;
};

/**
 * Activate the top N riders per gender based on:
 * 1. lastYearStanding (lower is better, 0 means unranked -> sorted last)
 * 2. cost (higher is better as tiebreaker)
 */
async function activateTopRiders(options: {
  ridersPerGender?: number;
  dryRun?: boolean;
  log?: (msg: string) => void;
}): Promise<ActivationSummary> {
  const log = options.log ?? console.log;
  const dryRun = options.dryRun ?? false;
  const limit = options.ridersPerGender ?? RIDERS_PER_GENDER;

  const summary: ActivationSummary = {
    maleActivated: 0,
    femaleActivated: 0,
    totalDeactivated: 0,
  };

  log(`Activating top ${limit} riders per gender...`);

  // Step 1: Deactivate all riders first
  if (!dryRun) {
    const deactivated = await db
      .update(riders)
      .set({ active: false })
      .where(eq(riders.active, true))
      .returning({ id: riders.id });
    summary.totalDeactivated = deactivated.length;
    log(`Deactivated ${summary.totalDeactivated} previously active riders`);
  } else {
    const currentlyActive = await db
      .select({ count: sql<number>`count(*)` })
      .from(riders)
      .where(eq(riders.active, true));
    summary.totalDeactivated = Number(currentlyActive[0]?.count ?? 0);
    log(`[DRY RUN] Would deactivate ${summary.totalDeactivated} riders`);
  }

  // Step 2: Get top N male riders
  // Sort by lastYearStanding (non-zero first, ascending), then by cost descending
  const topMales = await db
    .select({ id: riders.id, name: riders.name, lastYearStanding: riders.lastYearStanding, cost: riders.cost })
    .from(riders)
    .where(eq(riders.gender, "male"))
    .orderBy(
      // Ranked riders first (lastYearStanding > 0), then unranked (lastYearStanding = 0)
      sql`CASE WHEN ${riders.lastYearStanding} = 0 THEN 1 ELSE 0 END`,
      asc(riders.lastYearStanding),
      desc(riders.cost)
    )
    .limit(limit);

  log(`Found ${topMales.length} top male riders`);

  if (!dryRun && topMales.length > 0) {
    const maleIds = topMales.map(r => r.id);
    await db
      .update(riders)
      .set({ active: true })
      .where(inArray(riders.id, maleIds));
  }
  summary.maleActivated = topMales.length;

  // Log top 5 males
  for (const rider of topMales.slice(0, 5)) {
    log(`  ${rider.lastYearStanding || "unranked"}: ${rider.name} ($${rider.cost})`);
  }
  if (topMales.length > 5) {
    log(`  ... and ${topMales.length - 5} more`);
  }

  // Step 3: Get top N female riders
  const topFemales = await db
    .select({ id: riders.id, name: riders.name, lastYearStanding: riders.lastYearStanding, cost: riders.cost })
    .from(riders)
    .where(eq(riders.gender, "female"))
    .orderBy(
      sql`CASE WHEN ${riders.lastYearStanding} = 0 THEN 1 ELSE 0 END`,
      asc(riders.lastYearStanding),
      desc(riders.cost)
    )
    .limit(limit);

  log(`Found ${topFemales.length} top female riders`);

  if (!dryRun && topFemales.length > 0) {
    const femaleIds = topFemales.map(r => r.id);
    await db
      .update(riders)
      .set({ active: true })
      .where(inArray(riders.id, femaleIds));
  }
  summary.femaleActivated = topFemales.length;

  // Log top 5 females
  for (const rider of topFemales.slice(0, 5)) {
    log(`  ${rider.lastYearStanding || "unranked"}: ${rider.name} ($${rider.cost})`);
  }
  if (topFemales.length > 5) {
    log(`  ... and ${topFemales.length - 5} more`);
  }

  log(`\nActivation complete:`);
  log(`  Male riders activated: ${summary.maleActivated}`);
  log(`  Female riders activated: ${summary.femaleActivated}`);
  log(`  Previously active deactivated: ${summary.totalDeactivated}`);

  return summary;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.find(arg => arg.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : RIDERS_PER_GENDER;

  try {
    const summary = await activateTopRiders({
      ridersPerGender: limit,
      dryRun,
    });
    console.log("\nTop riders activated successfully", summary);
    process.exit(0);
  } catch (error) {
    console.error("Failed to activate top riders", error);
    process.exit(1);
  }
}

const __filename = fileURLToPath(import.meta.url);
const isDirectRun = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === __filename;

if (isDirectRun) {
  void main();
}

export { activateTopRiders };
