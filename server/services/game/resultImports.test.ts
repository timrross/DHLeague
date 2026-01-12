import assert from "node:assert";
import { describe, it } from "node:test";
import { getMissingFinalResultSets } from "./resultImports";

describe("result import requirements", () => {
  it("requires only elite result sets to be final", () => {
    const missingWithNone = getMissingFinalResultSets([]);
    assert.equal(missingWithNone.length, 2);

    const missingWithMenElite = getMissingFinalResultSets([
      { gender: "male", category: "elite", isFinal: true },
    ]);
    assert.equal(missingWithMenElite.length, 1);

    const missingWithBothElite = getMissingFinalResultSets([
      { gender: "male", category: "elite", isFinal: true },
      { gender: "female", category: "elite", isFinal: true },
    ]);
    assert.equal(missingWithBothElite.length, 0);
  });
});
