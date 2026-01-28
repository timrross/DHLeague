import assert from "node:assert";
import express from "express";
import { afterEach, before, describe, it, mock } from "node:test";
import request from "../test-utils/supertest";
import type { User } from "@shared/schema";

let checkUsernameAvailability: typeof import("./me.controller")["checkUsernameAvailability"];
let storageModule: typeof import("../storage");

const testUser: User = {
  id: "user-1",
  email: "sample@example.com",
  username: "sample",
  firstName: null,
  lastName: null,
  profileImageUrl: null,
  isAdmin: false,
  isActive: true,
  jokerCardUsed: false,
  jokerActiveRaceId: null,
  jokerActiveTeamType: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function buildApp(handler: express.RequestHandler) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).oidc = { user: { sub: testUser.id } };
    next();
  });
  app.get("/me/username/check", handler);
  return app;
}

describe("me.controller", () => {
  before(async () => {
    const controllerModule = await import("./me.controller");
    checkUsernameAvailability = controllerModule.checkUsernameAvailability;
    storageModule = await import("../storage");
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe("checkUsernameAvailability", () => {
    it("returns available for current user username", async () => {
      mock.method(storageModule.storage as any, "getUserByUsername", async () => testUser);
      const app = buildApp(checkUsernameAvailability);
      const response = await request(app).get("/me/username/check?username=sample");

      assert.equal(response.status, 200);
      assert.equal(response.body.available, true);
      assert.equal(response.body.normalized, "sample");
    });

    it("returns taken when another user has username", async () => {
      const otherUser = { ...testUser, id: "user-2", username: "taken" };
      mock.method(storageModule.storage as any, "getUserByUsername", async () => otherUser);
      const app = buildApp(checkUsernameAvailability);
      const response = await request(app).get("/me/username/check?username=taken");

      assert.equal(response.status, 200);
      assert.equal(response.body.available, false);
      assert.equal(response.body.reason, "taken");
    });

    it("returns invalid for malformed usernames", async () => {
      const app = buildApp(checkUsernameAvailability);
      const response = await request(app).get("/me/username/check?username=@@@");

      assert.equal(response.status, 200);
      assert.equal(response.body.available, false);
      assert.equal(response.body.reason, "invalid");
    });
  });
});
