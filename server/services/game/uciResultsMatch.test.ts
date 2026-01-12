import assert from "node:assert";
import { describe, it } from "node:test";
import { matchUciResultsToRiders } from "./uciResultsMatch";

describe("matchUciResultsToRiders", () => {
  it("matches results when stored rider names are reversed", () => {
    const riders = [
      {
        uciId: "uci-1",
        firstName: null,
        lastName: null,
        name: "BRUNI Loic",
      },
    ];
    const results = [
      {
        firstName: "Loic",
        lastName: "Bruni",
        name: "Loic Bruni",
        status: "FIN",
        position: 1,
      },
    ];

    const outcome = matchUciResultsToRiders(results, riders);

    assert.equal(outcome.results.length, 1);
    assert.equal(outcome.results[0].uciId, "uci-1");
    assert.equal(outcome.missingNames.size, 0);
    assert.equal(outcome.ambiguousNames.size, 0);
  });

  it("throws when no riders match results", () => {
    const riders = [
      {
        uciId: "uci-2",
        firstName: "Jane",
        lastName: "Doe",
        name: "Jane Doe",
      },
    ];
    const results = [
      {
        firstName: "John",
        lastName: "Smith",
        name: "John Smith",
        status: "FIN",
        position: 2,
      },
    ];

    assert.throws(
      () => matchUciResultsToRiders(results, riders),
      /No matching riders found for the selected category/,
    );
  });
});
