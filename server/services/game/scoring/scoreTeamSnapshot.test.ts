import assert from "node:assert";
import { describe, it } from "node:test";
import { scoreTeamSnapshot } from "./scoreTeamSnapshot";
import {
  benchFemale,
  benchMale,
  startersWithCosts,
} from "../../../test-utils/fixtures/gameMechanicFixtures";

describe("scoreTeamSnapshot", () => {
  it("scores starters with FIN/DNS/DNF/DNQ/DSQ correctly", () => {
    const results = new Map([
      ["m1", { uciId: "m1", status: "FIN", position: 1 }],
      ["m2", { uciId: "m2", status: "FIN", position: 10 }],
      ["m3", { uciId: "m3", status: "DNF" }],
      ["m4", { uciId: "m4", status: "DNS" }],
      ["f1", { uciId: "f1", status: "DNQ" }],
      ["f2", { uciId: "f2", status: "DSQ" }],
    ]);

    const output = scoreTeamSnapshot(
      { starters: startersWithCosts, bench: null },
      results,
    );

    const expected = 200 + 60 + 0 + 0 + 0 + 0;
    assert.equal(output.totalPoints, expected);
  });

  it("applies bench substitution for matching gender DNS/DNF/DNQ", () => {
    const results = new Map([
      ["f1", { uciId: "f1", status: "DNF" }],
      ["f2", { uciId: "f2", status: "DNQ" }],
      ["bf1", { uciId: "bf1", status: "FIN", position: 8 }],
    ]);

    const output = scoreTeamSnapshot(
      {
        starters: startersWithCosts,
        bench: benchFemale,
      },
      results,
    );

    assert.equal(output.breakdown.substitution.applied, true);
    assert.equal(output.breakdown.substitution.replacedStarterIndex, 4);
    assert.equal(output.breakdown.starters[4].finalPoints, 80);
  });

  it("skips substitution when starter is DSQ only", () => {
    const results = new Map([
      ["m1", { uciId: "m1", status: "FIN", position: 3 }],
      ["m2", { uciId: "m2", status: "FIN", position: 7 }],
      ["m3", { uciId: "m3", status: "FIN", position: 12 }],
      ["m4", { uciId: "m4", status: "FIN", position: 18 }],
      ["f1", { uciId: "f1", status: "DSQ" }],
      ["f2", { uciId: "f2", status: "FIN", position: 4 }],
      ["bf1", { uciId: "bf1", status: "FIN", position: 8 }],
    ]);

    const output = scoreTeamSnapshot(
      { starters: startersWithCosts, bench: benchFemale },
      results,
    );

    assert.equal(output.breakdown.substitution.applied, false);
    assert.equal(output.breakdown.substitution.reason, "NO_ELIGIBLE_STARTER");
  });

  it("skips substitution when finisher places outside top 20", () => {
    const results = new Map([
      ["m1", { uciId: "m1", status: "FIN", position: 2 }],
      ["m2", { uciId: "m2", status: "FIN", position: 9 }],
      ["m3", { uciId: "m3", status: "FIN", position: 13 }],
      ["m4", { uciId: "m4", status: "FIN", position: 16 }],
      ["f1", { uciId: "f1", status: "FIN", position: 25 }],
      ["f2", { uciId: "f2", status: "FIN", position: 6 }],
      ["bf1", { uciId: "bf1", status: "FIN", position: 2 }],
    ]);

    const output = scoreTeamSnapshot(
      { starters: startersWithCosts, bench: benchFemale },
      results,
    );

    assert.equal(output.breakdown.substitution.applied, false);
    assert.equal(output.breakdown.substitution.reason, "NO_ELIGIBLE_STARTER");
  });

  it("skips substitution when bench is missing", () => {
    const results = new Map([
      ["f1", { uciId: "f1", status: "DNS" }],
    ]);

    const output = scoreTeamSnapshot(
      { starters: startersWithCosts, bench: null },
      results,
    );

    assert.equal(output.breakdown.substitution.applied, false);
    assert.equal(output.breakdown.substitution.reason, "NO_BENCH");
  });

  it("skips substitution when bench gender does not match eligible starter", () => {
    const results = new Map([
      ["m1", { uciId: "m1", status: "FIN", position: 12 }],
      ["m2", { uciId: "m2", status: "FIN", position: 14 }],
      ["m3", { uciId: "m3", status: "FIN", position: 16 }],
      ["m4", { uciId: "m4", status: "FIN", position: 18 }],
      ["f1", { uciId: "f1", status: "DNF" }],
      ["f2", { uciId: "f2", status: "FIN", position: 5 }],
      ["bm1", { uciId: "bm1", status: "FIN", position: 1 }],
    ]);

    const output = scoreTeamSnapshot(
      {
        starters: startersWithCosts,
        bench: benchMale,
      },
      results,
    );

    assert.equal(output.breakdown.substitution.applied, false);
    assert.equal(output.breakdown.substitution.reason, "NO_VALID_SUB");
  });

  it("uses highest cost then lowest slot index to choose replacement", () => {
    const tiedStarters = startersWithCosts.map((starter) =>
      starter.gender === "female"
        ? { ...starter, costAtLock: 150000 }
        : starter,
    );

    const results = new Map([
      ["f1", { uciId: "f1", status: "DNF" }],
      ["f2", { uciId: "f2", status: "DNF" }],
      ["bf1", { uciId: "bf1", status: "FIN", position: 6 }],
    ]);

    const output = scoreTeamSnapshot(
      { starters: tiedStarters, bench: benchFemale },
      results,
    );

    assert.equal(output.breakdown.substitution.applied, true);
    assert.equal(output.breakdown.substitution.replacedStarterIndex, 4);
  });
});
