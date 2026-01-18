import assert from "node:assert";
import { describe, it } from "node:test";
import { validateTeam, type RiderProfile, type TeamStarterInput } from "./validateTeam";

const baseRiders: RiderProfile[] = [
  { uciId: "m1", gender: "male", category: "elite", cost: 200000 },
  { uciId: "m2", gender: "male", category: "elite", cost: 200000 },
  { uciId: "m3", gender: "male", category: "elite", cost: 200000 },
  { uciId: "m4", gender: "male", category: "elite", cost: 200000 },
  { uciId: "f1", gender: "female", category: "elite", cost: 200000 },
  { uciId: "f2", gender: "female", category: "elite", cost: 200000 },
  { uciId: "b1", gender: "female", category: "elite", cost: 150000 },
];

const toMap = (riders: RiderProfile[]) =>
  new Map(riders.map((rider) => [rider.uciId, rider]));

const starters: TeamStarterInput[] = [
  { uciId: "m1", starterIndex: 0 },
  { uciId: "m2", starterIndex: 1 },
  { uciId: "m3", starterIndex: 2 },
  { uciId: "m4", starterIndex: 3 },
  { uciId: "f1", starterIndex: 4 },
  { uciId: "f2", starterIndex: 5 },
];

describe("validateTeam", () => {
  it("accepts a valid elite roster", () => {
    const result = validateTeam(
      "ELITE",
      starters,
      { uciId: "b1" },
      toMap(baseRiders),
      2_000_000,
    );

    assert.equal(result.ok, true);
    assert.deepStrictEqual(result.errors, []);
  });

  it("rejects invalid gender slots", () => {
    const badStarters = starters.map((starter) => ({ ...starter }));
    badStarters[4] = { uciId: "m4", starterIndex: 4 };

    const result = validateTeam(
      "ELITE",
      badStarters,
      null,
      toMap(baseRiders),
      2_000_000,
    );

    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.code === "GENDER_SLOTS_INVALID"));
  });

  it("rejects duplicate riders across starters and bench", () => {
    const result = validateTeam(
      "ELITE",
      starters,
      { uciId: "m1" },
      toMap(baseRiders),
      2_000_000,
    );

    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.code === "DUPLICATE_RIDER"));
  });

  it("rejects budget overruns", () => {
    const result = validateTeam(
      "ELITE",
      starters,
      { uciId: "b1" },
      toMap(baseRiders),
      500_000,
    );

    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.code === "BUDGET_EXCEEDED"));
  });

  it("uses budget overrides for retained riders", () => {
    const overrides = new Map<string, number>([
      ["m1", 150000],
      ["m2", 150000],
      ["m3", 150000],
      ["m4", 150000],
      ["f1", 150000],
      ["f2", 150000],
      ["b1", 100000],
    ]);

    const result = validateTeam(
      "ELITE",
      starters,
      { uciId: "b1" },
      toMap(baseRiders),
      1_200_000,
      { budgetOverrides: overrides },
    );

    assert.equal(result.ok, true);
  });

  it("rejects category-ineligible riders", () => {
    const riders = baseRiders.map((rider) =>
      rider.uciId === "m1" ? { ...rider, category: "elite" } : rider,
    );
    const result = validateTeam(
      "JUNIOR",
      starters,
      null,
      toMap(riders),
      500_000,
    );

    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.code === "CATEGORY_INELIGIBLE"));
  });
});
