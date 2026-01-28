import assert from "node:assert";
import express from "express";
import { afterEach, before, describe, it, mock } from "node:test";
import type { User, Friend, FriendWithUser } from "@shared/schema";
import request from "../test-utils/supertest";

let getFriends: typeof import("./friends.controller")["getFriends"];
let getPendingRequests: typeof import("./friends.controller")["getPendingRequests"];
let getPendingRequestCount: typeof import("./friends.controller")["getPendingRequestCount"];
let getFriendStatus: typeof import("./friends.controller")["getFriendStatus"];
let sendFriendRequest: typeof import("./friends.controller")["sendFriendRequest"];
let acceptFriendRequest: typeof import("./friends.controller")["acceptFriendRequest"];
let rejectFriendRequest: typeof import("./friends.controller")["rejectFriendRequest"];
let removeFriend: typeof import("./friends.controller")["removeFriend"];
let storageModule: typeof import("../storage");

const testUser: User = {
  id: "user-1",
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
  profileImageUrl: null,
  isAdmin: false,
  isActive: true,
  jokerCardUsed: false,
  jokerActiveRaceId: null,
  jokerActiveTeamType: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const otherUser: User = {
  id: "user-2",
  email: "other@example.com",
  firstName: "Other",
  lastName: "User",
  profileImageUrl: null,
  isAdmin: false,
  isActive: true,
  jokerCardUsed: false,
  jokerActiveRaceId: null,
  jokerActiveTeamType: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const testFriend: Friend = {
  id: 1,
  requesterId: "user-1",
  addresseeId: "user-2",
  status: "accepted",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const pendingFriend: Friend = {
  id: 2,
  requesterId: "user-2",
  addresseeId: "user-1",
  status: "pending",
  createdAt: new Date(),
  updatedAt: new Date(),
};

function buildApp(handler: express.RequestHandler, method: "get" | "post" | "delete" = "get") {
  const app = express();
  app.use(express.json());
  // Mock OIDC middleware
  app.use((req, _res, next) => {
    (req as any).oidc = { user: { sub: testUser.id } };
    next();
  });
  if (method === "get") {
    app.get("/test/:userId?", handler);
    app.get("/test/pending/count", handler);
  } else if (method === "post") {
    app.post("/test/:userId?", handler);
    app.post("/test/accept/:requestId", handler);
  } else {
    app.delete("/test/:requestId?", handler);
    app.delete("/test/reject/:requestId", handler);
  }
  return app;
}

function buildUnauthenticatedApp(handler: express.RequestHandler) {
  const app = express();
  app.use(express.json());
  app.get("/test", handler);
  app.post("/test", handler);
  return app;
}

before(async () => {
  process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/testdb";
  const controllerModule = await import("./friends.controller");
  getFriends = controllerModule.getFriends;
  getPendingRequests = controllerModule.getPendingRequests;
  getPendingRequestCount = controllerModule.getPendingRequestCount;
  getFriendStatus = controllerModule.getFriendStatus;
  sendFriendRequest = controllerModule.sendFriendRequest;
  acceptFriendRequest = controllerModule.acceptFriendRequest;
  rejectFriendRequest = controllerModule.rejectFriendRequest;
  removeFriend = controllerModule.removeFriend;
  storageModule = await import("../storage");
});

afterEach(() => {
  mock.restoreAll();
});

describe("friends.controller", () => {
  describe("getFriends", () => {
    it("returns 401 when not authenticated", async () => {
      const app = buildUnauthenticatedApp(getFriends);
      const response = await request(app).get("/test");
      assert.equal(response.status, 401);
    });

    it("returns friends list", async () => {
      const friendWithUser: FriendWithUser = { ...testFriend, user: otherUser };
      mock.method(storageModule.storage as any, "getFriends", async () => [friendWithUser]);

      const app = buildApp(getFriends);
      const response = await request(app).get("/test");

      assert.equal(response.status, 200);
      assert.equal(Array.isArray(response.body), true);
      assert.equal(response.body.length, 1);
      assert.equal(response.body[0].user.id, otherUser.id);
    });
  });

  describe("getPendingRequests", () => {
    it("returns pending requests", async () => {
      const pendingWithUser: FriendWithUser = { ...pendingFriend, user: otherUser };
      mock.method(storageModule.storage as any, "getPendingFriendRequests", async () => [pendingWithUser]);

      const app = buildApp(getPendingRequests);
      const response = await request(app).get("/test");

      assert.equal(response.status, 200);
      assert.equal(response.body.length, 1);
      assert.equal(response.body[0].status, "pending");
    });
  });

  describe("getPendingRequestCount", () => {
    it("returns count", async () => {
      mock.method(storageModule.storage as any, "getPendingRequestCount", async () => 5);

      const app = buildApp(getPendingRequestCount);
      const response = await request(app).get("/test/pending/count");

      assert.equal(response.status, 200);
      assert.equal(response.body.count, 5);
    });
  });

  describe("getFriendStatus", () => {
    it("returns 400 when checking status with self", async () => {
      const app = buildApp(getFriendStatus);
      const response = await request(app).get(`/test/${testUser.id}`);

      assert.equal(response.status, 400);
    });

    it("returns status for another user", async () => {
      mock.method(storageModule.storage as any, "getFriendStatus", async () => "accepted");

      const app = buildApp(getFriendStatus);
      const response = await request(app).get(`/test/${otherUser.id}`);

      assert.equal(response.status, 200);
      assert.equal(response.body.status, "accepted");
    });
  });

  describe("sendFriendRequest", () => {
    it("returns 400 when sending to self", async () => {
      const app = buildApp(sendFriendRequest, "post");
      const response = await request(app).post(`/test/${testUser.id}`);

      assert.equal(response.status, 400);
    });

    it("returns 404 when user not found", async () => {
      mock.method(storageModule.storage as any, "getUser", async () => undefined);

      const app = buildApp(sendFriendRequest, "post");
      const response = await request(app).post(`/test/${otherUser.id}`);

      assert.equal(response.status, 404);
    });

    it("creates friend request successfully", async () => {
      mock.method(storageModule.storage as any, "getUser", async () => otherUser);
      mock.method(storageModule.storage as any, "sendFriendRequest", async () => pendingFriend);

      const app = buildApp(sendFriendRequest, "post");
      const response = await request(app).post(`/test/${otherUser.id}`);

      assert.equal(response.status, 201);
      assert.equal(response.body.status, "pending");
    });

    it("returns 409 when relationship exists", async () => {
      mock.method(storageModule.storage as any, "getUser", async () => otherUser);
      mock.method(storageModule.storage as any, "sendFriendRequest", async () => {
        throw new Error("Friend relationship already exists");
      });

      const app = buildApp(sendFriendRequest, "post");
      const response = await request(app).post(`/test/${otherUser.id}`);

      assert.equal(response.status, 409);
    });
  });

  describe("acceptFriendRequest", () => {
    it("returns 400 for invalid request ID", async () => {
      const app = express();
      app.use(express.json());
      app.use((req, _res, next) => {
        (req as any).oidc = { user: { sub: testUser.id } };
        next();
      });
      app.post("/test/accept/:requestId", acceptFriendRequest);

      const response = await request(app).post("/test/accept/invalid");
      assert.equal(response.status, 400);
    });

    it("accepts request successfully", async () => {
      mock.method(storageModule.storage as any, "acceptFriendRequest", async () => ({
        ...pendingFriend,
        status: "accepted",
      }));

      const app = express();
      app.use(express.json());
      app.use((req, _res, next) => {
        (req as any).oidc = { user: { sub: testUser.id } };
        next();
      });
      app.post("/test/accept/:requestId", acceptFriendRequest);

      const response = await request(app).post("/test/accept/2");
      assert.equal(response.status, 200);
      assert.equal(response.body.status, "accepted");
    });
  });

  describe("rejectFriendRequest", () => {
    it("returns 404 when request not found", async () => {
      mock.method(storageModule.storage as any, "rejectFriendRequest", async () => false);

      const app = express();
      app.use(express.json());
      app.use((req, _res, next) => {
        (req as any).oidc = { user: { sub: testUser.id } };
        next();
      });
      app.delete("/test/reject/:requestId", rejectFriendRequest);

      const response = await request(app).delete("/test/reject/999");
      assert.equal(response.status, 404);
    });

    it("rejects request successfully", async () => {
      mock.method(storageModule.storage as any, "rejectFriendRequest", async () => true);

      const app = express();
      app.use(express.json());
      app.use((req, _res, next) => {
        (req as any).oidc = { user: { sub: testUser.id } };
        next();
      });
      app.delete("/test/reject/:requestId", rejectFriendRequest);

      const response = await request(app).delete("/test/reject/2");
      assert.equal(response.status, 204);
    });
  });

  describe("removeFriend", () => {
    it("returns 404 when friendship not found", async () => {
      mock.method(storageModule.storage as any, "removeFriend", async () => false);

      const app = express();
      app.use(express.json());
      app.use((req, _res, next) => {
        (req as any).oidc = { user: { sub: testUser.id } };
        next();
      });
      app.delete("/test/:friendId", removeFriend);

      const response = await request(app).delete("/test/999");
      assert.equal(response.status, 404);
    });

    it("removes friend successfully", async () => {
      mock.method(storageModule.storage as any, "removeFriend", async () => true);

      const app = express();
      app.use(express.json());
      app.use((req, _res, next) => {
        (req as any).oidc = { user: { sub: testUser.id } };
        next();
      });
      app.delete("/test/:friendId", removeFriend);

      const response = await request(app).delete("/test/1");
      assert.equal(response.status, 204);
    });
  });
});
