import assert from "node:assert";
import { describe, it } from "node:test";
import { calculateUpdatedCost } from "./costUpdates";
import { costUpdateFixtureCases } from "../../test-utils/fixtures/gameMechanicFixtures";

describe("calculateUpdatedCost", () => {
  it("applies the deterministic cost update rules", () => {
    for (const entry of costUpdateFixtureCases) {
      const result = calculateUpdatedCost(
        entry.cost,
        entry.status,
        entry.position,
      );
      assert.equal(result.updatedCost, entry.expected);
    }
  });
});
