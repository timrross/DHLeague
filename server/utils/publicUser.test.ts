import assert from "node:assert";
import { describe, it } from "node:test";
import type { User } from "@shared/schema";
import { buildAnonymousPublicUser, buildPublicUser } from "./publicUser";

const baseUser: User = {
  id: "user-1",
  email: "rider@example.com",
  username: null,
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

describe("publicUser", () => {
  it("prefers username when available", () => {
    const user = { ...baseUser, username: "downhillfan" };
    const result = buildPublicUser(user);

    assert.equal(result.username, "downhillfan");
    assert.equal(result.displayName, "downhillfan");
  });

  it("falls back to email prefix when username is missing", () => {
    const result = buildPublicUser(baseUser);

    assert.equal(result.username, null);
    assert.equal(result.displayName, "rider");
  });

  it("falls back to Anonymous when no email", () => {
    const user = { ...baseUser, email: null };
    const result = buildPublicUser(user);

    assert.equal(result.displayName, "Anonymous");
  });

  it("builds anonymous public user", () => {
    const result = buildAnonymousPublicUser("user-2");

    assert.equal(result.id, "user-2");
    assert.equal(result.username, null);
    assert.equal(result.displayName, "Anonymous");
  });
});
