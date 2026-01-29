import assert from "node:assert";
import { afterEach, describe, it } from "node:test";
import { buildFriendRequestEmail } from "./friendRequests";

const resetEnv = () => {
  delete process.env.PUBLIC_BASE_URL;
  delete process.env.AUTH_BASE_URL;
};

describe("friend request email", () => {
  afterEach(() => {
    resetEnv();
  });

  it("uses requester name when provided", () => {
    process.env.PUBLIC_BASE_URL = "https://example.com";
    const result = buildFriendRequestEmail({
      requesterName: "rider123",
      recipientEmail: "friend@example.com",
    });

    assert.equal(result.subject, "rider123 sent you a friend request");
    assert.ok(result.text?.includes("From: rider123"));
    assert.ok(result.text?.includes("https://example.com/leaderboard"));
  });

  it("falls back to Someone when requester missing", () => {
    process.env.AUTH_BASE_URL = "http://localhost:5001";
    const result = buildFriendRequestEmail({
      requesterName: null,
      recipientEmail: "friend@example.com",
    });

    assert.equal(result.subject, "Someone sent you a friend request");
    assert.ok(result.text?.includes("From: Someone"));
  });
});
