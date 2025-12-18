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

  it("rounds points before computing cost", () => {
    const normalized = normalizeRiderRow(baseRow, "male");

    assert.equal(normalized.points, 124);
    assert.equal(normalized.cost, 124000);
  });
});
