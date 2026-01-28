import assert from "node:assert";
import express from "express";
import { afterEach, before, describe, it, mock } from "node:test";
import request from "../test-utils/supertest";

let checkTeamNameAvailability: typeof import("./teams.controller")["checkTeamNameAvailability"];
let storageModule: typeof import("../storage");

function buildApp(handler: express.RequestHandler) {
  const app = express();
  app.use(express.json());
  app.get("/api/teams/check-name", handler);
  return app;
}

before(async () => {
  process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/testdb";
  const controllerModule = await import("./teams.controller");
  checkTeamNameAvailability = controllerModule.checkTeamNameAvailability;
  storageModule = await import("../storage");
});

afterEach(() => {
  mock.restoreAll();
});

describe("teams.controller", () => {
  describe("checkTeamNameAvailability", () => {
    it("returns 400 when name is missing", async () => {
      const app = buildApp(checkTeamNameAvailability);
      const response = await request(app).get("/api/teams/check-name");

      assert.equal(response.status, 400);
      assert.equal(response.body.message, "Team name is required");
    });

    it("returns unavailable for names shorter than 3 characters", async () => {
      const app = buildApp(checkTeamNameAvailability);
      const response = await request(app).get("/api/teams/check-name?name=AB");

      assert.equal(response.status, 200);
      assert.equal(response.body.available, false);
      assert.equal(response.body.reason, "Team name must be at least 3 characters");
    });

    it("returns unavailable for names longer than 50 characters", async () => {
      const longName = "A".repeat(51);
      const app = buildApp(checkTeamNameAvailability);
      const response = await request(app).get(`/api/teams/check-name?name=${encodeURIComponent(longName)}`);

      assert.equal(response.status, 200);
      assert.equal(response.body.available, false);
      assert.equal(response.body.reason, "Team name must be 50 characters or less");
    });

    it("returns available when name is not taken", async () => {
      mock.method(storageModule.storage as any, "isTeamNameAvailable", async () => true);

      const app = buildApp(checkTeamNameAvailability);
      const response = await request(app).get("/api/teams/check-name?name=My%20Awesome%20Team");

      assert.equal(response.status, 200);
      assert.equal(response.body.available, true);
      assert.equal(response.body.reason, undefined);
    });

    it("returns unavailable when name is already taken", async () => {
      mock.method(storageModule.storage as any, "isTeamNameAvailable", async () => false);

      const app = buildApp(checkTeamNameAvailability);
      const response = await request(app).get("/api/teams/check-name?name=Existing%20Team");

      assert.equal(response.status, 200);
      assert.equal(response.body.available, false);
      assert.equal(response.body.reason, "This team name is already taken");
    });

    it("passes excludeTeamId to storage when provided", async () => {
      const isAvailableMock = mock.method(
        storageModule.storage as any,
        "isTeamNameAvailable",
        async () => true
      );

      const app = buildApp(checkTeamNameAvailability);
      await request(app).get("/api/teams/check-name?name=My%20Team&excludeTeamId=123");

      assert.equal(isAvailableMock.mock.callCount(), 1);
      const args = isAvailableMock.mock.calls[0]?.arguments ?? [];
      assert.equal(args[0], "My Team");
      assert.equal(args[1], 123);
    });

    it("trims whitespace from name", async () => {
      const isAvailableMock = mock.method(
        storageModule.storage as any,
        "isTeamNameAvailable",
        async () => true
      );

      const app = buildApp(checkTeamNameAvailability);
      await request(app).get("/api/teams/check-name?name=%20%20Team%20Name%20%20");

      assert.equal(isAvailableMock.mock.callCount(), 1);
      const args = isAvailableMock.mock.calls[0]?.arguments ?? [];
      assert.equal(args[0], "Team Name");
    });
  });
});
