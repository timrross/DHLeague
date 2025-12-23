import assert from "node:assert";
import { before, describe, it } from "node:test";
import {
  type Rider,
  type TeamWithRiders,
  type User
} from "@shared/schema";

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
  totalPoints: number,
  riders: Rider[] = []
): TeamWithRiders => ({
  id,
  userId,
  teamType: "elite",
  name,
  createdAt: baseDate,
  updatedAt: baseDate,
  totalPoints,
  swapsUsed: 0,
  swapsRemaining: 2,
  currentRaceId: null,
  isLocked: false,
  lockedAt: null,
  riders,
  totalCost: riders.reduce((sum, rider) => sum + rider.cost, 0)
});

let buildLeaderboardEntries: typeof import("./storage")["buildLeaderboardEntries"];

before(async () => {
  process.env.OIDC_ISSUER_URL ||= "https://example.com";
  process.env.OIDC_CLIENT_ID ||= "test-client";
  process.env.AUTH_DOMAINS ||= "localhost";
  process.env.SESSION_SECRET ||= "test-secret";
  process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/testdb";

  ({ buildLeaderboardEntries } = await import("./storage"));
});

describe("leaderboard contracts", () => {
  it("computes last round points from the latest race results", () => {
    const rider1 = createRider(1);
    const rider2 = createRider(2);
    const rider3 = createRider(3);

    const teams = [
      {
        team: createTeam(10, "Summit Flyers", "u-1", 150, [rider1, rider2]),
        user: createUser("u-1")
      },
      {
        team: createTeam(11, "Valley Riders", "u-2", 120, [rider3]),
        user: createUser("u-2")
      }
    ];

    const latestRacePoints = new Map<number, number>([
      [rider1.id, 25],
      [rider2.id, 30],
      [rider3.id, 40],
      [999, 999]
    ]);

    const leaderboard = buildLeaderboardEntries(teams, latestRacePoints);

    assert.equal(leaderboard[0].team.name, "Summit Flyers");
    assert.equal(leaderboard[0].lastRoundPoints, 55);
    assert.equal(leaderboard[1].team.name, "Valley Riders");
    assert.equal(leaderboard[1].lastRoundPoints, 40);
  });

  it("orders teams deterministically by total points then name", () => {
    const riderA = createRider(4);
    const riderB = createRider(5);
    const riderC = createRider(6);

    const teams = [
      {
        team: createTeam(20, "Zeta Gravity", "u-3", 200, [riderA]),
        user: createUser("u-3")
      },
      {
        team: createTeam(21, "Apex Velocity", "u-4", 200, [riderB]),
        user: createUser("u-4")
      },
      {
        team: createTeam(22, "Cascade Racing", "u-5", 180, [riderC]),
        user: createUser("u-5")
      }
    ];

    const leaderboard = buildLeaderboardEntries(teams, new Map());

    assert.deepEqual(
      leaderboard.map((entry) => entry.team.name),
      ["Apex Velocity", "Zeta Gravity", "Cascade Racing"]
    );
    assert.deepEqual(
      leaderboard.map((entry) => entry.rank),
      [1, 2, 3]
    );
  });
});
