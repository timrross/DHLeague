import assert from "node:assert";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import type { Rider, RaceResult } from "@shared/schema";

const raceId = 101;

function createJoinedRow(overrides?: Partial<Rider>) {
  const rider: Rider = {
    id: 7,
    riderId: "rider-7",
    uciId: "uci-7",
    datarideObjectId: null,
    datarideTeamCode: null,
    name: "Casey Jordan",
    firstName: "Casey",
    lastName: "Jordan",
    gender: "male",
    category: "elite",
    team: "Downhill Factory",
    cost: 123000,
    lastYearStanding: 0,
    image: "",
    imageSource: "placeholder",
    imageOriginalUrl: null,
    imageUpdatedAt: null,
    imageContentHash: null,
    imageMimeType: null,
    country: "USA",
    points: 44,
    form: "[]",
    injured: false,
    ...overrides,
  };

  const result: RaceResult = {
    id: 11,
    raceId,
    uciId: rider.uciId,
    status: "FIN",
    position: 2,
    qualificationPosition: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return { result, rider };
}

async function mockDbSelect(rows: Array<{ result: RaceResult; rider: Rider | null }>) {
  process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/testdb";
  const { db } = await import("./db");

  return mock.method(db as any, "select", () => ({
    from: () => ({
      leftJoin: () => ({
        where: () => Promise.resolve(rows),
      }),
    }),
  }));
}

describe("DatabaseStorage.getRaceResults", () => {
  beforeEach(() => {
    process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/testdb";
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("returns results joined with rider details without per-row lookups", async () => {
    const joinedRow = createJoinedRow();
    await mockDbSelect([joinedRow]);

    const { DatabaseStorage } = await import("./storage");
    const storage = new DatabaseStorage();
    const getRiderMock = mock.method(storage as any, "getRider", () => {
      throw new Error("getRider should not be called for joined result retrieval");
    });

    const results = await storage.getRaceResults(raceId);

    assert.deepStrictEqual(results, [
      {
        ...joinedRow.result,
        rider: joinedRow.rider,
        points: 80,
      },
    ]);
    assert.equal(getRiderMock.mock.callCount(), 0);
  });

  it("logs and filters out results with missing rider records", async () => {
    const presentRow = createJoinedRow({ id: 9, riderId: "rider-9" });
    const missingRow = {
      result: { ...presentRow.result, id: 15, uciId: "missing-uci" },
      rider: null,
    };
    await mockDbSelect([missingRow, presentRow]);

    const warnMock = mock.method(console, "warn", () => {});
    const { DatabaseStorage } = await import("./storage");
    const storage = new DatabaseStorage();

    const results = await storage.getRaceResults(raceId);

    assert.deepStrictEqual(results, [
      {
        ...presentRow.result,
        rider: presentRow.rider,
        points: 80,
      },
    ]);
    assert.equal(warnMock.mock.callCount(), 1);
    const warningArgs = warnMock.mock.calls[0]?.arguments ?? [];
    assert.ok(
      warningArgs.some((arg) => typeof arg === "string" && arg.includes(`${missingRow.result.uciId}`)),
      "expected warning to mention missing rider uci id",
    );
  });
});
