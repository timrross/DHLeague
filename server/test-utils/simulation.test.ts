import assert from "node:assert";
import { describe, it } from "node:test";
import { type Rider, type TeamWithRiders, type User } from "@shared/schema";

process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/testdb";

const { createSimulationHarness } = await import("./simulation");

type SimulationHarness = import("./simulation").SimulationHarness;
type PointSources = import("./simulation").PointSources;

const baseDate = new Date("2024-01-01T00:00:00Z");

const createRider = (id: number, overrides: Partial<Rider> = {}): Rider => ({
  id,
  riderId: `r-${id}`,
  uciId: `uci-${id}`,
  datarideObjectId: null,
  datarideTeamCode: null,
  name: `Rider ${id}`,
  firstName: "Rider",
  lastName: `${id}`,
  gender: "male",
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
  ...overrides
});

const createUser = (id: string, overrides: Partial<User> = {}): User => ({
  id,
  email: `${id}@example.com`,
  firstName: `User ${id}`,
  lastName: "Test",
  profileImageUrl: "",
  isAdmin: false,
  isActive: true,
  jokerCardUsed: false,
  createdAt: baseDate,
  updatedAt: baseDate,
  ...overrides
});

const createTeam = (
  id: number,
  name: string,
  userId: string,
  riders: Rider[]
): TeamWithRiders => ({
  id,
  userId,
  teamType: "elite",
  name,
  createdAt: baseDate,
  updatedAt: baseDate,
  totalPoints: 0,
  swapsUsed: 0,
  swapsRemaining: 2,
  currentRaceId: null,
  isLocked: false,
  lockedAt: null,
  riders,
  totalCost: riders.reduce((sum, rider) => sum + rider.cost, 0)
});

const harness = createSimulationHarness();

const findEntry = (
  leaderboard: ReturnType<SimulationHarness["buildLatestLeaderboard"]>,
  name: string
) => {
  const entry = leaderboard.find((candidate) => candidate.team.name === name);
  assert.ok(entry, `expected leaderboard entry for ${name}`);
  return entry;
};

describe("simulation harness", () => {
  it("applies rounds, updates cumulative totals, and uses latest round points", () => {
    const rider1 = createRider(1);
    const rider2 = createRider(2);
    const rider3 = createRider(3);

    const userA = createUser("user-a");
    const userB = createUser("user-b");

    harness.registerUserTeam(
      userA,
      createTeam(10, "Summit Flyers", userA.id, [rider1, rider2])
    );
    harness.registerUserTeam(
      userB,
      createTeam(11, "Valley Riders", userB.id, [rider2, rider3])
    );

    assert.deepEqual([...harness.computeTotals().values()], [0, 0]);

    const round1: PointSources = {
      race: new Map([
        [rider1.id, 30],
        [rider2.id, 20],
        [rider3.id, 10]
      ])
    };
    harness.applyRound("Round 1", round1);

    let leaderboard = harness.buildLatestLeaderboard();
    let summit = findEntry(leaderboard, "Summit Flyers");
    let valley = findEntry(leaderboard, "Valley Riders");

    assert.equal(summit.lastRoundPoints, 50);
    assert.equal(summit.totalPoints, 50);
    assert.equal(valley.lastRoundPoints, 30);
    assert.equal(valley.totalPoints, 30);

    const round2: PointSources = {
      race: new Map([
        [rider1.id, 5],
        [rider2.id, 5],
        [rider3.id, 25]
      ])
    };
    harness.applyRound("Round 2", round2);

    leaderboard = harness.buildLatestLeaderboard();
    summit = findEntry(leaderboard, "Summit Flyers");
    valley = findEntry(leaderboard, "Valley Riders");

    assert.equal(summit.lastRoundPoints, 10);
    assert.equal(valley.lastRoundPoints, 30);
    assert.equal(summit.totalPoints, 60);
    assert.equal(valley.totalPoints, 60);
    assert.deepEqual(
      leaderboard.map((entry) => entry.team.name),
      ["Summit Flyers", "Valley Riders"]
    );
  });

  it("resets state between scenarios and preserves deterministic ranking", () => {
    harness.reset();

    const riderA = createRider(4);
    const riderB = createRider(5);

    const userA = createUser("alpha");
    const userB = createUser("zeta");

    harness.registerUserTeam(
      userA,
      createTeam(20, "Alpine Speed", userA.id, [riderA])
    );
    harness.registerUserTeam(
      userB,
      createTeam(21, "Zenith Flow", userB.id, [riderB])
    );

    harness.applyRound("Sprint", {
      race: new Map([
        [riderA.id, 15],
        [riderB.id, 15]
      ])
    });

    const leaderboard = harness.buildLatestLeaderboard();
    assert.deepEqual(
      leaderboard.map((entry) => ({
        name: entry.team.name,
        rank: entry.rank
      })),
      [
        { name: "Alpine Speed", rank: 1 },
        { name: "Zenith Flow", rank: 2 }
      ]
    );

    harness.reset();
    assert.equal(harness.computeTotals().size, 0);
  });

  it("merges additional point sources into totals and latest round points", () => {
    const rider1 = createRider(1);
    const rider2 = createRider(2);
    const rider3 = createRider(3);

    const userA = createUser("user-extra-a");
    const userB = createUser("user-extra-b");

    harness.registerUserTeam(
      userA,
      createTeam(30, "Quali Masters", userA.id, [rider1, rider2])
    );
    harness.registerUserTeam(
      userB,
      createTeam(31, "Fast Finishers", userB.id, [rider2, rider3])
    );

    harness.applyRound("Qualifying", {
      race: new Map([
        [rider1.id, 10],
        [rider3.id, 5]
      ]),
      extras: new Map([
        [rider1.id, 5],
        [rider2.id, 5]
      ])
    });

    const leaderboard = harness.buildLatestLeaderboard();
    const qualiMasters = findEntry(leaderboard, "Quali Masters");
    const fastFinishers = findEntry(leaderboard, "Fast Finishers");

    assert.equal(qualiMasters.totalPoints, 20);
    assert.equal(fastFinishers.totalPoints, 10);
    assert.equal(qualiMasters.lastRoundPoints, 20);
    assert.equal(fastFinishers.lastRoundPoints, 10);
  });
});
