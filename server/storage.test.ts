import assert from "node:assert";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import type { Rider, RaceResult, Friend, User } from "@shared/schema";

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
        points: 160,
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
        points: 160,
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

const testUser1: User = {
  id: "user-1",
  email: "test1@example.com",
  username: "test1",
  usernameConfirmed: true,
  firstName: "Test",
  lastName: "User1",
  profileImageUrl: null,
  isAdmin: false,
  isActive: true,
  jokerCardUsed: false,
  jokerActiveRaceId: null,
  jokerActiveTeamType: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const testUser2: User = {
  id: "user-2",
  email: "test2@example.com",
  username: "test2",
  usernameConfirmed: true,
  firstName: "Other",
  lastName: "User2",
  profileImageUrl: null,
  isAdmin: false,
  isActive: true,
  jokerCardUsed: false,
  jokerActiveRaceId: null,
  jokerActiveTeamType: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createTestFriend(overrides?: Partial<Friend>): Friend {
  return {
    id: 1,
    requesterId: "user-1",
    addresseeId: "user-2",
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("DatabaseStorage.getFriendStatus", () => {
  beforeEach(() => {
    process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/testdb";
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("returns 'none' when no relationship exists", async () => {
    const { db } = await import("./db");
    mock.method(db as any, "select", () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    }));

    const { DatabaseStorage } = await import("./storage");
    const storage = new DatabaseStorage();

    const status = await storage.getFriendStatus("user-1", "user-3");
    assert.equal(status, "none");
  });

  it("returns 'accepted' for accepted friendship", async () => {
    const friend = createTestFriend({ status: "accepted" });
    const { db } = await import("./db");
    mock.method(db as any, "select", () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([friend]),
        }),
      }),
    }));

    const { DatabaseStorage } = await import("./storage");
    const storage = new DatabaseStorage();

    const status = await storage.getFriendStatus("user-1", "user-2");
    assert.equal(status, "accepted");
  });

  it("returns 'pending_sent' when user sent request", async () => {
    const friend = createTestFriend({ status: "pending", requesterId: "user-1", addresseeId: "user-2" });
    const { db } = await import("./db");
    mock.method(db as any, "select", () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([friend]),
        }),
      }),
    }));

    const { DatabaseStorage } = await import("./storage");
    const storage = new DatabaseStorage();

    const status = await storage.getFriendStatus("user-1", "user-2");
    assert.equal(status, "pending_sent");
  });

  it("returns 'pending_received' when user received request", async () => {
    const friend = createTestFriend({ status: "pending", requesterId: "user-2", addresseeId: "user-1" });
    const { db } = await import("./db");
    mock.method(db as any, "select", () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([friend]),
        }),
      }),
    }));

    const { DatabaseStorage } = await import("./storage");
    const storage = new DatabaseStorage();

    const status = await storage.getFriendStatus("user-1", "user-2");
    assert.equal(status, "pending_received");
  });
});

describe("DatabaseStorage.getPendingRequestCount", () => {
  beforeEach(() => {
    process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/testdb";
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("returns count of pending requests", async () => {
    const { db } = await import("./db");
    mock.method(db as any, "select", () => ({
      from: () => ({
        where: () => Promise.resolve([{ count: "3" }]),
      }),
    }));

    const { DatabaseStorage } = await import("./storage");
    const storage = new DatabaseStorage();

    const count = await storage.getPendingRequestCount("user-1");
    assert.equal(count, 3);
  });

  it("returns 0 when no pending requests", async () => {
    const { db } = await import("./db");
    mock.method(db as any, "select", () => ({
      from: () => ({
        where: () => Promise.resolve([{ count: "0" }]),
      }),
    }));

    const { DatabaseStorage } = await import("./storage");
    const storage = new DatabaseStorage();

    const count = await storage.getPendingRequestCount("user-1");
    assert.equal(count, 0);
  });
});

describe("DatabaseStorage.isTeamNameAvailable", () => {
  beforeEach(() => {
    process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/testdb";
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("returns false for empty name", async () => {
    const { DatabaseStorage } = await import("./storage");
    const storage = new DatabaseStorage();

    const result = await storage.isTeamNameAvailable("");
    assert.equal(result, false);
  });

  it("returns false for whitespace-only name", async () => {
    const { DatabaseStorage } = await import("./storage");
    const storage = new DatabaseStorage();

    const result = await storage.isTeamNameAvailable("   ");
    assert.equal(result, false);
  });

  it("returns true when no team with name exists", async () => {
    const { db } = await import("./db");
    mock.method(db as any, "select", () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    }));

    const { DatabaseStorage } = await import("./storage");
    const storage = new DatabaseStorage();

    const result = await storage.isTeamNameAvailable("New Team Name");
    assert.equal(result, true);
  });

  it("returns false when team with name exists", async () => {
    const { db } = await import("./db");
    mock.method(db as any, "select", () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ id: 99 }]),
        }),
      }),
    }));

    const { DatabaseStorage } = await import("./storage");
    const storage = new DatabaseStorage();

    const result = await storage.isTeamNameAvailable("Existing Team");
    assert.equal(result, false);
  });

  it("returns true when name belongs to excluded team", async () => {
    const { db } = await import("./db");
    mock.method(db as any, "select", () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ id: 123 }]),
        }),
      }),
    }));

    const { DatabaseStorage } = await import("./storage");
    const storage = new DatabaseStorage();

    const result = await storage.isTeamNameAvailable("My Team", 123);
    assert.equal(result, true);
  });

  it("returns false when name belongs to different team", async () => {
    const { db } = await import("./db");
    mock.method(db as any, "select", () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ id: 456 }]),
        }),
      }),
    }));

    const { DatabaseStorage } = await import("./storage");
    const storage = new DatabaseStorage();

    const result = await storage.isTeamNameAvailable("Their Team", 123);
    assert.equal(result, false);
  });
});
