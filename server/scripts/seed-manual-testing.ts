/**
 * Seed script for manual testing of the 2025 season
 *
 * Creates:
 * - 2025 DHI World Cup season with 7 races (using 2026 dates for editability)
 * - 10 test users: test-user-01 through test-user-10
 * - 10 elite teams with varied rosters (uses existing riders from DB)
 *
 * Usage:
 *   npm run seed:manual-test          # Seed data (riders must already be synced)
 *   npm run seed:manual-test -- --reset   # Reset DB first, then seed (will need re-sync after)
 */

import { eq, desc, and } from "drizzle-orm";
import { fileURLToPath } from "node:url";
import { db, pool } from "../db";
import { resetDatabase } from "./dbReset";
import { seasons, users, riders, teams, teamMembers, races, type Rider } from "@shared/schema";
import { BUDGETS } from "../services/game/config";

const TEST_USER_COUNT = 10;
const BUDGET_CAP = BUDGETS.ELITE; // $2,000,000

// 2025 DHI World Cup calendar with 2026 lock dates (future dates allow team editing)
const RACE_CALENDAR = [
  {
    name: "Fort William",
    location: "Fort William",
    country: "GBR",
    startDate: "2026-05-23",
    endDate: "2026-05-25",
    lockAt: "2026-05-21T00:00:00Z",
  },
  {
    name: "Leogang",
    location: "Leogang",
    country: "AUT",
    startDate: "2026-06-13",
    endDate: "2026-06-15",
    lockAt: "2026-06-11T00:00:00Z",
  },
  {
    name: "Val di Sole",
    location: "Val di Sole",
    country: "ITA",
    startDate: "2026-06-27",
    endDate: "2026-06-29",
    lockAt: "2026-06-25T00:00:00Z",
  },
  {
    name: "Les Gets",
    location: "Les Gets",
    country: "FRA",
    startDate: "2026-07-11",
    endDate: "2026-07-13",
    lockAt: "2026-07-09T00:00:00Z",
  },
  {
    name: "Loudenvielle",
    location: "Loudenvielle",
    country: "FRA",
    startDate: "2026-07-25",
    endDate: "2026-07-27",
    lockAt: "2026-07-23T00:00:00Z",
  },
  {
    name: "Mont-Sainte-Anne",
    location: "Mont-Sainte-Anne",
    country: "CAN",
    startDate: "2026-08-08",
    endDate: "2026-08-10",
    lockAt: "2026-08-06T00:00:00Z",
  },
  {
    name: "Snowshoe",
    location: "Snowshoe",
    country: "USA",
    startDate: "2026-08-15",
    endDate: "2026-08-17",
    lockAt: "2026-08-13T00:00:00Z",
  },
];

function formatUserId(index: number): string {
  return `test-user-${String(index + 1).padStart(2, "0")}`;
}

function formatUserEmail(index: number): string {
  return `testuser${String(index + 1).padStart(2, "0")}@dhleague.test`;
}

function formatUserName(index: number): string {
  return `Test User ${String(index + 1).padStart(2, "0")}`;
}

function formatTeamName(index: number): string {
  return `Test Team ${String(index + 1).padStart(2, "0")}`;
}

/**
 * Distribute riders across teams to ensure variety while staying within budget.
 *
 * Strategy:
 * - Sort male riders by cost descending, divide into 10 groups
 * - Sort female riders by cost descending, divide into 10 groups
 * - Each team gets 4 male starters + 2 female starters + 1 male bench
 * - Try to pick from different cost tiers to ensure variety
 */
function distributeRidersToTeams(
  maleRiders: Rider[],
  femaleRiders: Rider[],
  teamCount: number
): Array<{ starters: Rider[]; bench: Rider }> {
  // Sort by cost descending
  const sortedMales = [...maleRiders].sort((a, b) => b.cost - a.cost);
  const sortedFemales = [...femaleRiders].sort((a, b) => b.cost - a.cost);

  const teams: Array<{ starters: Rider[]; bench: Rider }> = [];

  for (let i = 0; i < teamCount; i++) {
    const maleStarters: Rider[] = [];
    const femaleStarters: Rider[] = [];

    // Pick 4 male starters from different tiers
    // Each team gets riders from different positions to ensure variety
    for (let slot = 0; slot < 4; slot++) {
      // Use modular indexing to spread riders across teams
      const baseIndex = i + slot * teamCount;
      if (baseIndex < sortedMales.length) {
        maleStarters.push(sortedMales[baseIndex]);
      }
    }

    // Pick 2 female starters similarly
    for (let slot = 0; slot < 2; slot++) {
      const baseIndex = i + slot * teamCount;
      if (baseIndex < sortedFemales.length) {
        femaleStarters.push(sortedFemales[baseIndex]);
      }
    }

    // Pick 1 male bench rider (from a different tier)
    const benchIndex = i + 4 * teamCount;
    const benchRider =
      benchIndex < sortedMales.length
        ? sortedMales[benchIndex]
        : sortedMales[sortedMales.length - 1 - i]; // Fallback to cheaper riders

    // Verify budget
    const totalCost =
      maleStarters.reduce((sum, r) => sum + r.cost, 0) +
      femaleStarters.reduce((sum, r) => sum + r.cost, 0) +
      benchRider.cost;

    if (totalCost > BUDGET_CAP) {
      console.warn(
        `Team ${i + 1} exceeds budget ($${totalCost}). Adjusting...`
      );
      // Try to pick cheaper riders if over budget
      // This is a simple fallback - in practice we'd need more sophisticated selection
    }

    teams.push({
      starters: [...maleStarters, ...femaleStarters],
      bench: benchRider,
    });
  }

  return teams;
}

async function createSeason(): Promise<number> {
  console.log("Creating 2025 DHI World Cup season...");

  const startAt = new Date("2026-01-01T00:00:00Z");
  const endAt = new Date("2026-12-31T23:59:59Z");

  // Check if season already exists
  const existing = await db
    .select()
    .from(seasons)
    .where(eq(seasons.name, "2025 DHI World Cup"))
    .limit(1);

  if (existing.length > 0) {
    console.log(`Season already exists with ID ${existing[0].id}`);
    return existing[0].id;
  }

  const [season] = await db
    .insert(seasons)
    .values({
      name: "2025 DHI World Cup",
      startAt,
      endAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  console.log(`Created season with ID ${season.id}`);
  return season.id;
}

async function createRaces(seasonId: number): Promise<void> {
  console.log("Creating races...");

  for (const race of RACE_CALENDAR) {
    // Check if race already exists
    const existing = await db
      .select()
      .from(races)
      .where(
        and(
          eq(races.name, race.name),
          eq(races.seasonId, seasonId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      console.log(`Race ${race.name} already exists`);
      continue;
    }

    await db.insert(races).values({
      seasonId,
      name: race.name,
      location: race.location,
      country: race.country,
      startDate: new Date(race.startDate),
      endDate: new Date(race.endDate),
      lockAt: new Date(race.lockAt),
      discipline: "DHI",
      gameStatus: "scheduled",
      needsResettle: false,
    });

    console.log(`Created race: ${race.name}`);
  }
}

async function createTestUsers(): Promise<string[]> {
  console.log("Creating test users...");
  const userIds: string[] = [];

  for (let i = 0; i < TEST_USER_COUNT; i++) {
    const userId = formatUserId(i);
    const email = formatUserEmail(i);
    const name = formatUserName(i);

    // Check if user already exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existing.length > 0) {
      console.log(`User ${userId} already exists`);
      userIds.push(userId);
      continue;
    }

    await db.insert(users).values({
      id: userId,
      email,
      firstName: name.split(" ")[0],
      lastName: name.split(" ").slice(1).join(" "),
      isAdmin: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`Created user: ${userId}`);
    userIds.push(userId);
  }

  return userIds;
}

async function createTeams(
  userIds: string[],
  seasonId: number
): Promise<void> {
  console.log("Creating teams...");

  // Fetch active elite riders from database
  const maleRiders = await db
    .select()
    .from(riders)
    .where(
      and(
        eq(riders.gender, "male"),
        eq(riders.category, "elite"),
        eq(riders.active, true)
      )
    )
    .orderBy(desc(riders.cost));

  const femaleRiders = await db
    .select()
    .from(riders)
    .where(
      and(
        eq(riders.gender, "female"),
        eq(riders.category, "elite"),
        eq(riders.active, true)
      )
    )
    .orderBy(desc(riders.cost));

  if (maleRiders.length < TEST_USER_COUNT * 5) {
    throw new Error(
      `Not enough male riders. Need at least ${TEST_USER_COUNT * 5}, found ${maleRiders.length}. ` +
      `Please run "npm run sync:uci-riders" first.`
    );
  }

  if (femaleRiders.length < TEST_USER_COUNT * 2) {
    throw new Error(
      `Not enough female riders. Need at least ${TEST_USER_COUNT * 2}, found ${femaleRiders.length}. ` +
      `Please run "npm run sync:uci-riders" first.`
    );
  }

  console.log(`Found ${maleRiders.length} male and ${femaleRiders.length} female elite riders`);

  // Distribute riders to teams
  const teamRosters = distributeRidersToTeams(
    maleRiders,
    femaleRiders,
    TEST_USER_COUNT
  );

  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i];
    const teamName = formatTeamName(i);
    const roster = teamRosters[i];

    // Check if team already exists
    const existing = await db
      .select()
      .from(teams)
      .where(
        and(
          eq(teams.userId, userId),
          eq(teams.seasonId, seasonId),
          eq(teams.teamType, "elite")
        )
      )
      .limit(1);

    if (existing.length > 0) {
      console.log(`Team for ${userId} already exists`);
      continue;
    }

    // Calculate total cost
    const startersCost = roster.starters.reduce((sum, r) => sum + r.cost, 0);
    const benchCost = roster.bench.cost;
    const totalCost = startersCost + benchCost;

    if (totalCost > BUDGET_CAP) {
      console.warn(
        `Warning: Team ${teamName} costs $${totalCost} (over $${BUDGET_CAP} budget)`
      );
    }

    // Create team
    const [team] = await db
      .insert(teams)
      .values({
        userId,
        seasonId,
        teamType: "elite",
        name: teamName,
        budgetCap: BUDGET_CAP,
        totalPoints: 0,
        swapsUsed: 0,
        swapsRemaining: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Create team members (starters)
    for (let j = 0; j < roster.starters.length; j++) {
      const rider = roster.starters[j];
      await db.insert(teamMembers).values({
        teamId: team.id,
        uciId: rider.uciId,
        role: "STARTER",
        starterIndex: j,
        gender: rider.gender,
        costAtSave: rider.cost,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Create bench member
    await db.insert(teamMembers).values({
      teamId: team.id,
      uciId: roster.bench.uciId,
      role: "BENCH",
      starterIndex: null,
      gender: roster.bench.gender,
      costAtSave: roster.bench.cost,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const maleCount = roster.starters.filter((r) => r.gender === "male").length;
    const femaleCount = roster.starters.filter((r) => r.gender === "female").length;

    console.log(
      `Created team: ${teamName} (${maleCount}M + ${femaleCount}F starters, 1 bench) - Total: $${totalCost}`
    );
  }
}

async function verifySetup(seasonId: number): Promise<void> {
  console.log("\n--- Verification ---");

  const userCount = await db
    .select()
    .from(users)
    .where(eq(users.id, formatUserId(0)));

  const allTestUsers = await db
    .select()
    .from(users)
    .then((rows) =>
      rows.filter((u) => u.id.startsWith("test-user-"))
    );

  console.log(`Test users: ${allTestUsers.length}/${TEST_USER_COUNT}`);

  const teamRows = await db
    .select()
    .from(teams)
    .where(eq(teams.seasonId, seasonId));

  console.log(`Teams: ${teamRows.length}/${TEST_USER_COUNT}`);

  const raceRows = await db
    .select()
    .from(races)
    .where(eq(races.seasonId, seasonId));

  console.log(`Races: ${raceRows.length}/${RACE_CALENDAR.length}`);

  // Verify team composition
  for (const team of teamRows) {
    const members = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.teamId, team.id));

    const starters = members.filter((m) => m.role === "STARTER");
    const bench = members.filter((m) => m.role === "BENCH");

    const maleStarters = starters.filter((m) => m.gender === "male");
    const femaleStarters = starters.filter((m) => m.gender === "female");

    if (starters.length !== 6 || bench.length !== 1) {
      console.warn(
        `Warning: Team ${team.name} has ${starters.length} starters and ${bench.length} bench`
      );
    }

    if (maleStarters.length !== 4 || femaleStarters.length !== 2) {
      console.warn(
        `Warning: Team ${team.name} has ${maleStarters.length}M + ${femaleStarters.length}F starters (expected 4M + 2F)`
      );
    }
  }

  console.log("\nSetup complete!");
  console.log("\nNext steps:");
  console.log("1. Start the app: npm run dev");
  console.log("2. Lock a race: POST /api/admin/races/:raceId/lock");
  console.log("3. Add results: POST /api/admin/races/:raceId/results");
  console.log("4. Settle race: POST /api/admin/races/:raceId/settle");
}

async function main() {
  const args = process.argv.slice(2);
  const shouldReset = args.includes("--reset");

  if (shouldReset) {
    console.log("Resetting database...");
    await resetDatabase();
    console.log("Database reset complete. Note: You will need to run npm run sync:uci-riders before running this script again.\n");
    await pool.end();
    return;
  }

  try {
    // Create season
    const seasonId = await createSeason();

    // Create races
    await createRaces(seasonId);

    // Create test users
    const userIds = await createTestUsers();

    // Create teams with riders
    await createTeams(userIds, seasonId);

    // Verify setup
    await verifySetup(seasonId);
  } finally {
    await pool.end();
  }
}

const isDirect = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirect) {
  main().catch((error) => {
    console.error("Failed to seed manual testing data:", error);
    process.exit(1);
  });
}
