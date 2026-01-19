import assert from "node:assert";
import { afterEach, before, beforeEach, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import {
  raceResultImports,
  raceResults,
  raceResultSets,
  raceScores,
  raceSnapshots,
  riderCostUpdates,
  races,
  seasons,
  users,
} from "@shared/schema";

const hasDb = Boolean(process.env.DATABASE_URL);

let db: typeof import("../../db").db;
let settleRace: typeof import("./settleRace").settleRace;
let upsertRaceResults: typeof import("./races").upsertRaceResults;
let ensureDatabaseSchema: typeof import("../../setupDatabase").ensureDatabaseSchema;

if (hasDb) {
  ({ db } = await import("../../db"));
  ({ settleRace } = await import("./settleRace"));
  ({ upsertRaceResults } = await import("./races"));
  ({ ensureDatabaseSchema } = await import("../../setupDatabase"));
}

const now = new Date();

if (!hasDb) {
  describe.skip("result import rules integration", () => {
    it("requires DATABASE_URL to run", () => {});
  });
}

if (hasDb) {
  describe("result import rules integration", () => {
    let seasonId: number;
    let raceId: number;
    let userId: string;

    before(async () => {
      await ensureDatabaseSchema();
    });

    beforeEach(async () => {
      const runId = `test-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      userId = `user-${runId}`;
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
      await db.delete(riderCostUpdates).where(eq(riderCostUpdates.raceId, raceId));
      await db.delete(raceResultSets).where(eq(raceResultSets.raceId, raceId));
      await db.delete(raceResults).where(eq(raceResults.raceId, raceId));
      await db.delete(raceResultImports).where(eq(raceResultImports.raceId, raceId));
      await db.delete(raceSnapshots).where(eq(raceSnapshots.raceId, raceId));
      await db.delete(users).where(eq(users.id, userId));
      await db.delete(races).where(eq(races.id, raceId));
      await db.delete(seasons).where(eq(seasons.id, seasonId));
    });

    it("requires a locked race before results can be added", async () => {
      await assert.rejects(
        () =>
          upsertRaceResults({
            raceId,
            results: [{ uciId: "uci-1", status: "FIN", position: 1 }],
            isFinal: true,
          }),
        (error: unknown) => {
          assert.match(
            (error as Error).message,
            /must be locked before importing results/i,
          );
          return true;
        },
      );

      await db
        .update(races)
        .set({ gameStatus: "locked" })
        .where(eq(races.id, raceId));

      const result = await upsertRaceResults({
        raceId,
        results: [{ uciId: "uci-1", status: "FIN", position: 1 }],
        isFinal: true,
      });
      assert.equal(result.updated, 1);
    });

    it("requires elite result sets to be final before settling", async () => {
      await db
        .update(races)
        .set({ gameStatus: "final" })
        .where(eq(races.id, raceId));

      await assert.rejects(
        () => settleRace(raceId),
        (error: unknown) => {
          assert.match(
            (error as Error).message,
            /missing final results/i,
          );
          return true;
        },
      );

      await db.insert(raceResultImports).values([
        {
          raceId,
          gender: "male",
          category: "elite",
          discipline: "DHI",
          sourceUrl: "test://men-elite",
          isFinal: true,
          updatedAt: now,
        },
        {
          raceId,
          gender: "female",
          category: "elite",
          discipline: "DHI",
          sourceUrl: "test://women-elite",
          isFinal: true,
          updatedAt: now,
        },
      ]);

      await db.insert(raceResults).values({
        raceId,
        uciId: "uci-1",
        status: "FIN",
        position: 1,
        qualificationPosition: null,
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(raceSnapshots).values({
        raceId,
        userId,
        teamType: "ELITE",
        startersJson: [{ uciId: "uci-1", gender: "male" }],
        benchJson: null,
        totalCostAtLock: 0,
        snapshotHash: `snapshot-${raceId}`,
        createdAt: now,
      });

      const result = await settleRace(raceId);
      assert.equal(result.raceId, raceId);
    });

    it("requires results to be loaded before settling", async () => {
      await db
        .update(races)
        .set({ gameStatus: "final" })
        .where(eq(races.id, raceId));

      await db.insert(raceResultImports).values([
        {
          raceId,
          gender: "male",
          category: "elite",
          discipline: "DHI",
          sourceUrl: "test://men-elite",
          isFinal: true,
          updatedAt: now,
        },
        {
          raceId,
          gender: "female",
          category: "elite",
          discipline: "DHI",
          sourceUrl: "test://women-elite",
          isFinal: true,
          updatedAt: now,
        },
      ]);

      await assert.rejects(
        () => settleRace(raceId),
        (error: unknown) => {
          assert.match(
            (error as Error).message,
            /no results loaded/i,
          );
          return true;
        },
      );
    });

    it("requires team snapshots to be present before settling", async () => {
      await db
        .update(races)
        .set({ gameStatus: "final" })
        .where(eq(races.id, raceId));

      await db.insert(raceResultImports).values([
        {
          raceId,
          gender: "male",
          category: "elite",
          discipline: "DHI",
          sourceUrl: "test://men-elite",
          isFinal: true,
          updatedAt: now,
        },
        {
          raceId,
          gender: "female",
          category: "elite",
          discipline: "DHI",
          sourceUrl: "test://women-elite",
          isFinal: true,
          updatedAt: now,
        },
      ]);

      await db.insert(raceResults).values({
        raceId,
        uciId: "uci-1",
        status: "FIN",
        position: 1,
        qualificationPosition: null,
        createdAt: now,
        updatedAt: now,
      });

      await assert.rejects(
        () => settleRace(raceId),
        (error: unknown) => {
          assert.match(
            (error as Error).message,
            /no team snapshots/i,
          );
          return true;
        },
      );
    });
  });
}
