import assert from "node:assert";
import { describe, it } from "node:test";
import { countTransfers } from "./transfers";

describe("countTransfers", () => {
  it("returns zero for unchanged rosters", () => {
    const result = countTransfers(
      { starters: ["a", "b", "c"], benchId: "d" },
      { starters: ["a", "b", "c"], benchId: "d" },
    );
    assert.equal(result, 0);
  });

  it("counts net changes across starters and bench", () => {
    const result = countTransfers(
      { starters: ["a", "b", "c"], benchId: "d" },
      { starters: ["a", "b", "e"], benchId: "f" },
    );
    assert.equal(result, 2);
  });

  it("counts bench removals as transfers", () => {
    const result = countTransfers(
      { starters: ["a", "b", "c"], benchId: "d" },
      { starters: ["a", "b", "c"], benchId: null },
    );
    assert.equal(result, 1);
  });
});
