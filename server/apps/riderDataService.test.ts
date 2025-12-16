import assert from "node:assert";
import { afterEach, before, describe, it, mock } from "node:test";
import { Race, RaceWithResults, Rider, Result } from "@shared/schema";
import request from "../test-utils/supertest";

const now = new Date();
const day = 24 * 60 * 60 * 1000;

const riders: Rider[] = [
  {
    id: 1,
    uciId: "uci-123",
    riderId: "uci-123",
    name: "Ava Lopez",
    firstName: "Ava",
    lastName: "Lopez",
    team: "Gravity Co.",
    country: "USA",
    cost: 420000,
    points: 180,
    gender: "female",
    image: "https://example.com/ava.jpg",
    lastYearStanding: 0,
    form: "[]",
    injured: false,
    datarideObjectId: null,
    datarideTeamCode: null,
  },
];

const races: Race[] = [
  {
    id: 10,
    name: "Fort William",
    location: "Scotland",
    country: "UK",
    startDate: new Date(now.getTime() - 5 * day),
    endDate: new Date(now.getTime() - 4 * day),
    imageUrl: "https://example.com/fort-william.jpg",
  },
  {
    id: 11,
    name: "Val di Sole",
    location: "Trentino",
    country: "Italy",
    startDate: new Date(now.getTime() + 4 * day),
    endDate: new Date(now.getTime() + 5 * day),
    imageUrl: "https://example.com/val-di-sole.jpg",
  },
];

const raceResults: RaceWithResults = {
  ...races[1],
  results: [
    {
      id: 100,
      raceId: races[1].id,
      riderId: riders[0].id,
      position: 1,
      points: 250,
      rider: riders[0],
    } as Result & { rider: Rider },
  ],
};

let storage: typeof import("../storage")['storage'];
let createService: typeof import("./riderDataService")['createRiderDataService'];

before(async () => {
  process.env.OIDC_ISSUER_URL ||= "https://example.com";
  process.env.OIDC_CLIENT_ID ||= "test-client";
  process.env.AUTH_DOMAINS ||= "localhost";
  process.env.SESSION_SECRET ||= "test-secret";
  process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/testdb";
  ({ storage } = await import("../storage"));
  ({ createRiderDataService: createService } = await import("./riderDataService"));
});

afterEach(() => {
  mock.restoreAll();
});

describe("rider data contract", () => {
  it("returns the rider list", async () => {
    mock.method(storage, "getRiders", async () => riders);
    mock.method(storage, "getRidersFiltered", async () => ({
      riders,
      total: riders.length,
    }));

    const app = createService();
    const response = await request(app).get<Rider[]>("/riders");

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      data: riders,
      total: riders.length,
      page: 1,
      pageSize: 50,
    });
  });

  it("returns a rider by id", async () => {
    mock.method(storage, "getRider", async (id: number) =>
      riders.find((r) => r.id === id),
    );

    const app = createService();
    const response = await request(app).get<Rider>(`/riders/${riders[0].id}`);

    assert.equal(response.status, 200);
    assert.equal(response.body?.id, riders[0].id);
    assert.equal(response.body?.firstName, riders[0].firstName);
  });

  it("marks the closest upcoming race as next", async () => {
    mock.method(storage, "getRaces", async () => races.map((race) => ({ ...race })));

    const app = createService();
    const response = await request(app).get<Race[]>("/races");

    assert.equal(response.status, 200);
    const nextRace = (response.body as Race[]).find((race) => race.status === "next");
    assert.ok(nextRace, "expected a race to be marked as next");
    assert.equal(nextRace?.id, races[1].id);
  });

  it("returns a single race with computed status", async () => {
    mock.method(storage, "getRace", async (id: number) =>
      races.find((race) => race.id === id),
    );
    mock.method(storage, "getRaces", async () => races.map((race) => ({ ...race })));

    const app = createService();
    const response = await request(app).get<Race>(`/races/${races[1].id}`);

    assert.equal(response.status, 200);
    assert.equal(response.body?.id, races[1].id);
    assert.equal(response.body?.status, "next");
  });

  it("returns race results with rider details", async () => {
    mock.method(storage, "getRaceWithResults", async (id: number) =>
      id === raceResults.id ? raceResults : undefined,
    );

    const app = createService();
    const response = await request(app).get<(Result & { rider: Rider })[]>(
      `/races/${raceResults.id}/results`,
    );

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(response.body));
    assert.equal(response.body[0].rider.id, riders[0].id);
    assert.equal(response.body[0].position, 1);
  });
});
