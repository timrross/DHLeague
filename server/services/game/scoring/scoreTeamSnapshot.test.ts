import assert from "node:assert";
import { describe, it } from "node:test";
import { scoreTeamSnapshot } from "./scoreTeamSnapshot";

const starters = [
  { uciId: "m1", gender: "male" },
  { uciId: "m2", gender: "male" },
  { uciId: "m3", gender: "male" },
  { uciId: "m4", gender: "male" },
  { uciId: "f1", gender: "female" },
  { uciId: "f2", gender: "female" },
];

describe("scoreTeamSnapshot", () => {
  it("scores starters with FIN/DNS/DSQ correctly", () => {
    const results = new Map([
      ["m1", { uciId: "m1", status: "FIN", position: 1 }],
      ["m2", { uciId: "m2", status: "FIN", position: 10 }],
      ["m3", { uciId: "m3", status: "DSQ" }],
      ["m4", { uciId: "m4", status: "DNS" }],
      ["f1", { uciId: "f1", status: "FIN", position: 31 }],
    ]);

    const output = scoreTeamSnapshot({ starters, bench: null }, results);

    const expected = 100 + 30 - 10 + 0 + 0 + 0;
    assert.equal(output.totalPoints, expected);
  });

  it("applies bench substitution for DNS with matching gender", () => {
    const results = new Map([
      ["f1", { uciId: "f1", status: "DNS" }],
      ["f2", { uciId: "f2", status: "DNS" }],
      ["b1", { uciId: "b1", status: "FIN", position: 8 }],
    ]);

    const output = scoreTeamSnapshot(
      {
        starters,
        bench: { uciId: "b1", gender: "female" },
      },
      results,
    );

    assert.equal(output.breakdown.substitution.applied, true);
    assert.equal(output.breakdown.substitution.replacedStarterIndex, 4);
    assert.equal(output.breakdown.starters[4].finalPoints, 40);
  });

  it("skips substitution when bench gender does not match DNS starter", () => {
    const results = new Map([
      ["m1", { uciId: "m1", status: "FIN", position: 12 }],
      ["m2", { uciId: "m2", status: "FIN", position: 14 }],
      ["m3", { uciId: "m3", status: "FIN", position: 16 }],
      ["m4", { uciId: "m4", status: "FIN", position: 18 }],
      ["f1", { uciId: "f1", status: "DNS" }],
      ["f2", { uciId: "f2", status: "FIN", position: 5 }],
      ["b1", { uciId: "b1", status: "FIN", position: 1 }],
    ]);

    const output = scoreTeamSnapshot(
      {
        starters,
        bench: { uciId: "b1", gender: "male" },
      },
      results,
    );

    assert.equal(output.breakdown.substitution.applied, false);
    assert.equal(output.breakdown.substitution.reason, "NO_VALID_SUB");
  });
});
