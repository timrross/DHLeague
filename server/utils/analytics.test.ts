import assert from "node:assert";
import { describe, it } from "node:test";
import {
  buildPagePath,
  buildPageViewPayload,
  buildDocumentTitle,
  getLinkClickEvent,
} from "@shared/analytics";

describe("analytics helpers", () => {
  it("builds page path with search and hash", () => {
    const pagePath = buildPagePath({
      pathname: "/leaderboard",
      search: "?season=2025",
      hash: "#top",
    });

    assert.equal(pagePath, "/leaderboard?season=2025#top");
  });

  it("builds page view payload with origin and title", () => {
    const payload = buildPageViewPayload({
      pathname: "/leaderboard",
      search: "?season=2025",
      hash: "#top",
      title: "Leaderboard",
      origin: "https://mtbfantasy.com",
    });

    assert.equal(payload.page_path, "/leaderboard?season=2025#top");
    assert.equal(
      payload.page_location,
      "https://mtbfantasy.com/leaderboard?season=2025#top",
    );
    assert.equal(payload.page_title, "Leaderboard");
  });

  it("builds document titles with prefixes", () => {
    assert.equal(
      buildDocumentTitle("My Team"),
      "My Team - MTB Fantasy | UCI Downhill World Cup",
    );
    assert.equal(buildDocumentTitle(""), "MTB Fantasy | UCI Downhill World Cup");
    assert.equal(
      buildDocumentTitle(null),
      "MTB Fantasy | UCI Downhill World Cup",
    );
  });

  it("creates navigation click payload for internal links", () => {
    const event = getLinkClickEvent({
      href: "/leaderboard?season=2025",
      origin: "https://mtbfantasy.com",
      sourcePath: "/",
    });

    assert.ok(event);
    assert.equal(event?.eventName, "navigation_click");
    assert.deepEqual(event?.params, {
      link_url: "https://mtbfantasy.com/leaderboard",
      link_domain: "mtbfantasy.com",
      link_path: "/leaderboard",
      outbound: false,
      source_path: "/",
    });
  });

  it("creates outbound click payload for external links", () => {
    const event = getLinkClickEvent({
      href: "https://example.com/path?ref=1#section",
      origin: "https://mtbfantasy.com",
      sourcePath: "/leaderboard",
    });

    assert.ok(event);
    assert.equal(event?.eventName, "outbound_click");
    assert.deepEqual(event?.params, {
      link_url: "https://example.com/path",
      link_domain: "example.com",
      link_path: "/path",
      outbound: true,
      source_path: "/leaderboard",
    });
  });

  it("ignores unsupported protocols", () => {
    const mailEvent = getLinkClickEvent({
      href: "mailto:someone@example.com",
      origin: "https://mtbfantasy.com",
      sourcePath: "/",
    });

    const hashEvent = getLinkClickEvent({
      href: "#section",
      origin: "https://mtbfantasy.com",
      sourcePath: "/",
    });

    assert.equal(mailEvent, null);
    assert.equal(hashEvent, null);
  });
});
