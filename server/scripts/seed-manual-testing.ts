/**
 * Seed script for manual testing of the 2025 season
 *
 * Creates:
 * - 2025 DHI World Cup season with 7 races (using 2026 dates for editability)
 * - 10 test users: test-user-01 through test-user-10
 * - 10 elite teams with varied rosters (uses existing riders from DB)
 *
 * Prerequisites:
 *   Riders must already be synced: npm run sync:uci-riders
 *
 * Usage:
 *   npm run seed:manual-test
 */

import { eq, desc, and } from "drizzle-orm";
import { fileURLToPath } from "node:url";
import { db, pool } from "../db";
import {
  seasons,
  users,
  riders,
  teams,
  teamMembers,
  races,
  raceSnapshots,
  raceResults,
  raceResultImports,
  raceResultSets,
  raceScores,
  riderCostUpdates,
  teamSwaps,
  type Rider,
} from "@shared/schema";
import { BUDGETS, TEAM_RULES } from "../services/game/config";

const TEST_USER_COUNT = 10;
const BUDGET_CAP = BUDGETS.ELITE; // $2,000,000
const MALE_STARTERS = TEAM_RULES.GENDER_SLOTS.male;
const FEMALE_STARTERS = TEAM_RULES.GENDER_SLOTS.female;

type TeamRoster = { starters: Rider[]; bench: Rider };

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

function formatUserFirstName(index: number): string {
  const firstNames = [
    "Alice", "Bob", "Charlie", "Diana", "Eve",
    "Frank", "Grace", "Henry", "Ivy", "Jack"
  ];
  return firstNames[index % firstNames.length];
}

function formatUserLastName(index: number): string {
  return `Tester${String(index + 1).padStart(2, "0")}`;
}

function formatTeamName(index: number): string {
  return `Test Team ${String(index + 1).padStart(2, "0")}`;
}

function calculateRosterCost(roster: TeamRoster): number {
  return roster.starters.reduce((sum, rider) => sum + rider.cost, 0) + roster.bench.cost;
}

function pickRidersWithOffset(
  pool: Rider[],
  count: number,
  teamIndex: number,
  teamCount: number,
  selectedIds: Set<string>,
): Rider[] {
  const picks: Rider[] = [];

  for (let index = teamIndex; index < pool.length && picks.length < count; index += teamCount) {
    const rider = pool[index];
    if (!selectedIds.has(rider.uciId)) {
      selectedIds.add(rider.uciId);
      picks.push(rider);
    }
  }

  if (picks.length < count) {
    for (const rider of pool) {
      if (!selectedIds.has(rider.uciId)) {
        selectedIds.add(rider.uciId);
        picks.push(rider);
      }
      if (picks.length === count) {
        break;
      }
    }
  }

  if (picks.length < count) {
    throw new Error(`Not enough riders to fill ${count} slots.`);
  }

  return picks;
}

function pickCheapestRiders(
  pool: Rider[],
  count: number,
  selectedIds: Set<string>,
): Rider[] {
  const picks: Rider[] = [];

  for (const rider of pool) {
    if (!selectedIds.has(rider.uciId)) {
      selectedIds.add(rider.uciId);
      picks.push(rider);
    }
    if (picks.length === count) {
      break;
    }
  }

  if (picks.length < count) {
    throw new Error(`Not enough riders to fill ${count} slots.`);
  }

  return picks;
}

function pickBenchRider(pool: Rider[], selectedIds: Set<string>): Rider {
  for (const rider of pool) {
    if (!selectedIds.has(rider.uciId)) {
      selectedIds.add(rider.uciId);
      return rider;
    }
  }

  throw new Error("Not enough riders to assign a bench rider.");
}

function buildRosterWithOffsets(
  malePool: Rider[],
  femalePool: Rider[],
  benchPool: Rider[],
  teamIndex: number,
  teamCount: number,
): TeamRoster {
  const selectedIds = new Set<string>();
  const maleStarters = pickRidersWithOffset(
    malePool,
    MALE_STARTERS,
    teamIndex,
    teamCount,
    selectedIds,
  );
  const femaleStarters = pickRidersWithOffset(
    femalePool,
    FEMALE_STARTERS,
    teamIndex,
    teamCount,
    selectedIds,
  );
  const bench = pickBenchRider(benchPool, selectedIds);

  return {
    starters: [...maleStarters, ...femaleStarters],
    bench,
  };
}

function buildCheapestRoster(
  malePool: Rider[],
  femalePool: Rider[],
  benchPool: Rider[],
): TeamRoster {
  const selectedIds = new Set<string>();
  const maleStarters = pickCheapestRiders(malePool, MALE_STARTERS, selectedIds);
  const femaleStarters = pickCheapestRiders(femalePool, FEMALE_STARTERS, selectedIds);
  const bench = pickBenchRider(benchPool, selectedIds);

  return {
    starters: [...maleStarters, ...femaleStarters],
    bench,
  };
}

/**
 * Distribute riders across teams to ensure variety while staying within budget.
 *
 * Strategy:
 * - Sort male riders by cost ascending, divide into 10 groups
 * - Sort female riders by cost ascending, divide into 10 groups
 * - Each team gets 4 male starters + 2 female starters + 1 bench rider
 * - Try to pick from different cost tiers to ensure variety
 */
function distributeRidersToTeams(
  maleRiders: Rider[],
  femaleRiders: Rider[],
  teamCount: number
): TeamRoster[] {
  // Sort by cost ascending to keep seeded teams under budget.
  const sortedMales = [...maleRiders].sort((a, b) => a.cost - b.cost);
  const sortedFemales = [...femaleRiders].sort((a, b) => a.cost - b.cost);
  const benchPool = [...sortedMales, ...sortedFemales].sort((a, b) => a.cost - b.cost);

  const teams: TeamRoster[] = [];

  for (let i = 0; i < teamCount; i++) {
    const roster = buildRosterWithOffsets(
      sortedMales,
      sortedFemales,
      benchPool,
      i,
      teamCount,
    );
    const totalCost = calculateRosterCost(roster);

    if (totalCost > BUDGET_CAP) {
      const fallbackRoster = buildCheapestRoster(sortedMales, sortedFemales, benchPool);
      const fallbackCost = calculateRosterCost(fallbackRoster);

      if (fallbackCost > BUDGET_CAP) {
        throw new Error(
          `Unable to build a valid roster under budget. Cheapest cost: $${fallbackCost}.`
        );
      }

      console.warn(
        `Team ${i + 1} exceeded budget ($${totalCost}). Using cheapest roster ($${fallbackCost}).`
      );
      teams.push(fallbackRoster);
    } else {
      teams.push(roster);
    }
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

  // First, check how many races already exist for this season
  const existingRaces = await db
    .select()
    .from(races)
    .where(eq(races.seasonId, seasonId));

  console.log(`Found ${existingRaces.length} existing races for season ${seasonId}`);

  // Delete existing races and their dependencies for this season
  if (existingRaces.length > 0) {
    const raceIds = existingRaces.map((r) => r.id);
    console.log("Deleting existing races and dependencies for this season...");

    // Delete dependent records first (order matters for foreign keys)
    for (const raceId of raceIds) {
      await db.delete(raceSnapshots).where(eq(raceSnapshots.raceId, raceId));
      await db.delete(raceResults).where(eq(raceResults.raceId, raceId));
      await db.delete(raceResultImports).where(eq(raceResultImports.raceId, raceId));
      await db.delete(raceResultSets).where(eq(raceResultSets.raceId, raceId));
      await db.delete(raceScores).where(eq(raceScores.raceId, raceId));
      await db.delete(riderCostUpdates).where(eq(riderCostUpdates.raceId, raceId));
      await db.delete(teamSwaps).where(eq(teamSwaps.raceId, raceId));
    }

    // Now delete the races
    await db.delete(races).where(eq(races.seasonId, seasonId));
  }

  // Create all races
  for (const race of RACE_CALENDAR) {
    try {
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
    } catch (error) {
      console.error(`Failed to create race ${race.name}:`, error);
      throw error;
    }
  }

  console.log(`Created ${RACE_CALENDAR.length} races`);
}

async function createTestUsers(): Promise<string[]> {
  console.log("Creating test users...");
  const userIds: string[] = [];

  for (let i = 0; i < TEST_USER_COUNT; i++) {
    const userId = formatUserId(i);
    const email = formatUserEmail(i);
    const firstName = formatUserFirstName(i);
    const lastName = formatUserLastName(i);

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
      firstName,
      lastName,
      isAdmin: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`Created user: ${userId} (${firstName} ${lastName})`);
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

    const totalCost = calculateRosterCost(roster);

    if (totalCost > BUDGET_CAP) {
      throw new Error(
        `Team ${teamName} costs $${totalCost} (over $${BUDGET_CAP} budget)`
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
