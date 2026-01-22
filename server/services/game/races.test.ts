import assert from "node:assert";
import { afterEach, before, beforeEach, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import {
  riders,
  races,
  raceResults,
  raceResultImports,
  raceResultSets,
  raceScores,
  raceSnapshots,
  riderCostUpdates,
  teamSwaps,
  seasons,
  teams,
  users,
} from "@shared/schema";

const hasDb = Boolean(process.env.DATABASE_URL);

let db: typeof import("../../db").db;
let deleteRace: typeof import("./races").deleteRace;
let ensureDatabaseSchema: typeof import("../../setupDatabase").ensureDatabaseSchema;

if (hasDb) {
  ({ db } = await import("../../db"));
  ({ deleteRace } = await import("./races"));
  ({ ensureDatabaseSchema } = await import("../../setupDatabase"));
}

const now = new Date();

if (!hasDb) {
  describe.skip("races integration", () => {
    it("requires DATABASE_URL to run", () => {});
  });
}

if (hasDb) {
  describe("deleteRace", () => {
    let seasonId: number;
    let raceId: number;
    let userId: string;
    let riderId: number;
    let riderUciId: string;

    before(async () => {
      await ensureDatabaseSchema();
    });

    beforeEach(async () => {
      const runId = `test-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      userId = `user-${runId}`;
      riderUciId = `rider-${runId}`;

      // Create season
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

      // Create race
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

      // Create user
      await db.insert(users).values({
        id: userId,
        email: `${userId}@test.com`,
        firstName: "Test",
        lastName: "User",
        createdAt: now,
        updatedAt: now,
      });

      // Create rider
      const [rider] = await db
        .insert(riders)
        .values({
          riderId: riderUciId,
          uciId: riderUciId,
          name: "Test Rider",
          firstName: "Test",
          lastName: "Rider",
          gender: "male",
          category: "elite",
          team: "Test Team",
          cost: 100000,
          lastYearStanding: 0,
          image: "",
          imageSource: "placeholder",
          country: "",
          points: 0,
          form: "[]",
          injured: false,
          active: false,
        })
        .returning();
      riderId = rider.id;
    });

    afterEach(async () => {
      // Clean up in case test failed before delete
      await db.delete(raceScores).where(eq(raceScores.raceId, raceId));
      await db.delete(riderCostUpdates).where(eq(riderCostUpdates.raceId, raceId));
      await db.delete(raceResultSets).where(eq(raceResultSets.raceId, raceId));
      await db.delete(raceResults).where(eq(raceResults.raceId, raceId));
      await db.delete(raceResultImports).where(eq(raceResultImports.raceId, raceId));
      await db.delete(raceSnapshots).where(eq(raceSnapshots.raceId, raceId));
      await db.delete(teamSwaps).where(eq(teamSwaps.raceId, raceId));
      await db.delete(races).where(eq(races.id, raceId));
      await db.delete(users).where(eq(users.id, userId));
      await db.delete(riders).where(eq(riders.uciId, riderUciId));
      await db.delete(seasons).where(eq(seasons.id, seasonId));
    });

    it("deletes a race with no dependent records", async () => {
      const result = await deleteRace(raceId);

      assert.equal(result.deleted, true);
      assert.equal(result.raceId, raceId);

      const [deletedRace] = await db
        .select()
        .from(races)
        .where(eq(races.id, raceId));
      assert.equal(deletedRace, undefined);
    });

    it("deletes a race and all dependent records", async () => {
      // Add dependent records
      await db.insert(raceResults).values({
        raceId,
        uciId: riderUciId,
        status: "FIN",
        position: 1,
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(raceResultImports).values({
        raceId,
        gender: "male",
        category: "elite",
        discipline: "DHI",
        isFinal: true,
        updatedAt: now,
      });

      await db.insert(raceSnapshots).values({
        raceId,
        userId,
        teamType: "ELITE",
        startersJson: JSON.stringify([]),
        benchJson: null,
        totalCostAtLock: 0,
        snapshotHash: "test-hash",
        createdAt: now,
      });

      await db.insert(raceScores).values({
        raceId,
        userId,
        teamType: "ELITE",
        totalPoints: 100,
        breakdownJson: JSON.stringify({}),
        snapshotHashUsed: "test-hash",
        resultsHashUsed: "results-hash",
        settledAt: now,
      });

      await db.insert(riderCostUpdates).values({
        raceId,
        uciId: riderUciId,
        status: "FIN",
        position: 1,
        previousCost: 100000,
        updatedCost: 110000,
        delta: 10000,
        resultsHash: "results-hash",
        createdAt: now,
      });

      // Delete the race
      const result = await deleteRace(raceId);
      assert.equal(result.deleted, true);

      // Verify race is deleted
      const [deletedRace] = await db
        .select()
        .from(races)
        .where(eq(races.id, raceId));
      assert.equal(deletedRace, undefined);

      // Verify dependent records are deleted
      const results = await db
        .select()
        .from(raceResults)
        .where(eq(raceResults.raceId, raceId));
      assert.equal(results.length, 0);

      const imports = await db
        .select()
        .from(raceResultImports)
        .where(eq(raceResultImports.raceId, raceId));
      assert.equal(imports.length, 0);

      const snapshots = await db
        .select()
        .from(raceSnapshots)
        .where(eq(raceSnapshots.raceId, raceId));
      assert.equal(snapshots.length, 0);

      const scores = await db
        .select()
        .from(raceScores)
        .where(eq(raceScores.raceId, raceId));
      assert.equal(scores.length, 0);

      const costUpdates = await db
        .select()
        .from(riderCostUpdates)
        .where(eq(riderCostUpdates.raceId, raceId));
      assert.equal(costUpdates.length, 0);
    });

    it("throws error for non-existent race", async () => {
      await assert.rejects(
        async () => await deleteRace(999999),
        /Race 999999 not found/
      );
    });
  });
}
