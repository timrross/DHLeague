import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { eq, inArray } from "drizzle-orm";
import {
  riders,
  races,
  raceResults,
  raceResultSets,
  raceScores,
  raceSnapshots,
  seasons,
  teamMembers,
  teams,
  users,
} from "@shared/schema";

const hasDb = Boolean(process.env.DATABASE_URL);

let db: typeof import("../../db").db;
let lockRace: typeof import("./lockRace").lockRace;
let upsertRaceResults: typeof import("./races").upsertRaceResults;
let settleRace: typeof import("./settleRace").settleRace;

if (hasDb) {
  ({ db } = await import("../../db"));
  ({ lockRace } = await import("./lockRace"));
  ({ upsertRaceResults } = await import("./races"));
  ({ settleRace } = await import("./settleRace"));
}

const now = new Date();

const buildRider = (uciId: string, gender: "male" | "female") => ({
  riderId: uciId,
  uciId,
  datarideObjectId: null,
  datarideTeamCode: null,
  name: `Rider ${uciId}`,
  firstName: `Rider`,
  lastName: uciId,
  gender,
  category: "elite",
  team: "Test Team",
  cost: 100000,
  lastYearStanding: 0,
  image: "",
  imageSource: "placeholder",
  imageOriginalUrl: null,
  imageUpdatedAt: null,
  imageContentHash: null,
  imageMimeType: null,
  country: "",
  points: 0,
  form: "[]",
  injured: false,
});

if (!hasDb) {
  describe.skip("lock/settle integration", () => {
    it("requires DATABASE_URL to run", () => {});
  });
}

if (hasDb) {
  describe("lock/settle integration", () => {
  let seasonId: number;
  let raceId: number;
  let teamId: number;
  let userId: string;
  let uciIds: string[];

  beforeEach(async () => {
    const runId = `test-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    userId = `user-${runId}`;
    uciIds = [
      `m1-${runId}`,
      `m2-${runId}`,
      `m3-${runId}`,
      `m4-${runId}`,
      `f1-${runId}`,
      `f2-${runId}`,
      `b1-${runId}`,
    ];

    const [season] = await db
      .insert(seasons)
      .values({
        name: `Season ${runId}`,
        startAt: now,
        endAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    seasonId = season.id;

    await db.insert(users).values({
      id: userId,
      email: `${userId}@example.com`,
      firstName: "Test",
      lastName: "User",
      isAdmin: false,
      isActive: true,
      jokerCardUsed: false,
      createdAt: now,
      updatedAt: now,
    });

    const riderRows = [
      buildRider(uciIds[0], "male"),
      buildRider(uciIds[1], "male"),
      buildRider(uciIds[2], "male"),
      buildRider(uciIds[3], "male"),
      buildRider(uciIds[4], "female"),
      buildRider(uciIds[5], "female"),
      buildRider(uciIds[6], "female"),
    ];
    await db.insert(riders).values(riderRows);

    const [team] = await db
      .insert(teams)
      .values({
        seasonId,
        userId,
        teamType: "elite",
        name: `Team-${runId}`,
        budgetCap: 2000000,
        createdAt: now,
        updatedAt: now,
        totalPoints: 0,
        swapsUsed: 0,
        swapsRemaining: 2,
        isLocked: false,
      })
      .returning();
    teamId = team.id;

    const starterMembers = uciIds.slice(0, 6).map((uciId, index) => ({
      teamId,
      uciId,
      role: "STARTER",
      starterIndex: index,
      gender: uciId.startsWith("f") ? "female" : "male",
      costAtSave: 100000,
      createdAt: now,
      updatedAt: now,
    }));

    const benchMember = {
      teamId,
      uciId: uciIds[6],
      role: "BENCH",
      starterIndex: null,
      gender: "female",
      costAtSave: 100000,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(teamMembers).values([...starterMembers, benchMember]);

    const [race] = await db
      .insert(races)
      .values({
        seasonId,
        name: `Race-${runId}`,
        location: "Test Location",
        country: "TST",
        startDate: now,
        endDate: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        discipline: "DHI",
        lockAt: now,
        gameStatus: "scheduled",
        needsResettle: false,
      })
      .returning();
    raceId = race.id;
  });

  afterEach(async () => {
    await db.delete(raceScores).where(eq(raceScores.raceId, raceId));
    await db.delete(raceResultSets).where(eq(raceResultSets.raceId, raceId));
    await db.delete(raceResults).where(eq(raceResults.raceId, raceId));
    await db.delete(raceSnapshots).where(eq(raceSnapshots.raceId, raceId));
    await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
    await db.delete(teams).where(eq(teams.id, teamId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(riders).where(inArray(riders.uciId, uciIds));
    await db.delete(races).where(eq(races.id, raceId));
    await db.delete(seasons).where(eq(seasons.id, seasonId));
  });

  it("locks, settles idempotently, and resettles on result changes", async () => {
    const firstLock = await lockRace(raceId, { force: true });
    assert.equal(firstLock.lockedTeams, 1);

    const secondLock = await lockRace(raceId, { force: true });
    assert.equal(secondLock.lockedTeams, 0);

    await upsertRaceResults({
      raceId,
      isFinal: true,
      results: [
        { uciId: uciIds[0], status: "FIN", position: 1 },
        { uciId: uciIds[1], status: "FIN", position: 10 },
        { uciId: uciIds[2], status: "DNS" },
        { uciId: uciIds[3], status: "DSQ" },
        { uciId: uciIds[4], status: "DNS" },
        { uciId: uciIds[5], status: "FIN", position: 2 },
        { uciId: uciIds[6], status: "FIN", position: 8 },
      ],
    });

    const firstSettle = await settleRace(raceId);
    assert.equal(firstSettle.updatedScores, 1);

    const scoresAfterFirst = await db
      .select()
      .from(raceScores)
      .where(eq(raceScores.raceId, raceId));
    assert.equal(scoresAfterFirst.length, 1);
    assert.equal(scoresAfterFirst[0].totalPoints, 240);

    const secondSettle = await settleRace(raceId);
    assert.equal(secondSettle.updatedScores, 0);

    await upsertRaceResults({
      raceId,
      isFinal: true,
      results: [
        { uciId: uciIds[1], status: "FIN", position: 2 },
      ],
    });

    const thirdSettle = await settleRace(raceId);
    assert.equal(thirdSettle.updatedScores, 1);

    const scoresAfterResettle = await db
      .select()
      .from(raceScores)
      .where(eq(raceScores.raceId, raceId));
    assert.equal(scoresAfterResettle[0].totalPoints > scoresAfterFirst[0].totalPoints, true);
  });
}
