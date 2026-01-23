import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  normalizeCategoryToKey,
  normalizeRiderRow,
  type ObjectRankingRow,
} from "../../../src/integrations/uciDataride/normalize";

describe("normalizeCategoryToKey", () => {
  it("maps elite and junior categories", () => {
    assert.equal(
      normalizeCategoryToKey({ id: 1, name: "Elite Men", code: "ME" }),
      "ELITE_MEN",
    );
    assert.equal(
      normalizeCategoryToKey({ id: 2, name: "Elite Women", code: "WE" }),
      "ELITE_WOMEN",
    );
    assert.equal(
      normalizeCategoryToKey({ id: 3, name: "Junior Men", code: "MJ" }),
      "JUNIOR_MEN",
    );
    assert.equal(
      normalizeCategoryToKey({ id: 4, name: "Junior Women", code: "WJ" }),
      "JUNIOR_WOMEN",
    );
  });

  it("does not misclassify women as men when names contain 'women'", () => {
    assert.equal(
      normalizeCategoryToKey({ id: 23, name: "Women Elite", code: "WE" }),
      "ELITE_WOMEN",
    );
    assert.equal(
      normalizeCategoryToKey({ id: 25, name: "Women Junior", code: "WJ" }),
      "JUNIOR_WOMEN",
    );
    assert.equal(
      normalizeCategoryToKey({ id: 23, name: "Women Elite" }),
      "ELITE_WOMEN",
    );
    assert.equal(
      normalizeCategoryToKey({ id: 25, name: "Women Junior" }),
      "JUNIOR_WOMEN",
    );
  });
});

describe("normalizeRiderRow", () => {
  const baseRow: ObjectRankingRow = {
    ObjectId: 1234,
    Rank: 1,
    UciId: 987654,
    IndividualFullName: "* John Doe",
    DisplayName: "* John Doe",
    TeamName: null,
    TeamCode: "TCO",
    DisplayTeam: "Sample Team",
    Points: 123.6,
    CountryIsoCode2: "US",
    NationFullName: "United States",
    DisciplineSeasonId: 1,
    MomentId: 1,
    BirthDate: "/Date(0)/",
    Ages: 25,
    FlagCode: "US",
    Position: "1",
  };

  it("strips leading asterisks and stringifies ids", () => {
    const normalized = normalizeRiderRow(baseRow, "male");

    assert.equal(normalized.name, "* John Doe".replace(/^\*\s*/, "").trim());
    assert.equal(normalized.uciId, "987654");
    assert.equal(normalized.riderId, "987654");
    assert.equal(normalized.datarideObjectId, "1234");
    assert.equal(normalized.datarideTeamCode, "TCO");
  });

  it("marks junior riders when a leading asterisk is present", () => {
    const normalized = normalizeRiderRow(baseRow, "male", "elite");
    assert.equal(normalized.category, "junior");
  });

  it("sets points to zero and calculates cost from standing", () => {
    const normalized = normalizeRiderRow(baseRow, "male");

    // Riders start with zero points; points are earned from race results
    assert.equal(normalized.points, 0);
    // lastYearStanding is derived from UCI rank position
    assert.equal(normalized.lastYearStanding, 1);
    // Cost is 500,000 / (position ^ 0.4), minimum $10,000
    // For position 1: 500000 / (1 ^ 0.4) = 500000
    assert.equal(normalized.cost, 500000);
  });

  it("calculates cost correctly for lower standings", () => {
    const row10 = { ...baseRow, Rank: 10 };
    const row50 = { ...baseRow, Rank: 50 };
    const row200 = { ...baseRow, Rank: 200 };

    const normalized10 = normalizeRiderRow(row10, "male");
    const normalized50 = normalizeRiderRow(row50, "male");
    const normalized200 = normalizeRiderRow(row200, "male");

    assert.equal(normalized10.lastYearStanding, 10);
    assert.equal(normalized50.lastYearStanding, 50);
    assert.equal(normalized200.lastYearStanding, 200);

    // position 10: 500000 / (10 ^ 0.4) ≈ 199053
    assert.equal(normalized10.cost, Math.round(500000 / Math.pow(10, 0.4)));
    // position 50: 500000 / (50 ^ 0.4) ≈ 89340
    assert.equal(normalized50.cost, Math.round(500000 / Math.pow(50, 0.4)));
    // position 200: 500000 / (200 ^ 0.4) ≈ 49202
    assert.equal(normalized200.cost, Math.round(500000 / Math.pow(200, 0.4)));
  });

  it("applies minimum cost for unranked riders", () => {
    const unrankedRow = { ...baseRow, Rank: 0 };
    const normalized = normalizeRiderRow(unrankedRow, "male");

    assert.equal(normalized.lastYearStanding, 0);
    assert.equal(normalized.cost, 10000);
  });
});
