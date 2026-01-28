import assert from "node:assert";
import { describe, it } from "node:test";
import { generateRandomTeamName, generateTeamNameSuggestions } from "./teamNameGenerator";

describe("teamNameGenerator", () => {
  describe("generateRandomTeamName", () => {
    it("returns a non-empty string", () => {
      const name = generateRandomTeamName();
      assert.ok(typeof name === "string");
      assert.ok(name.length > 0);
    });

    it("returns a name with at least 3 characters", () => {
      for (let i = 0; i < 100; i++) {
        const name = generateRandomTeamName();
        assert.ok(name.length >= 3, `Name "${name}" is too short`);
      }
    });

    it("returns a name with at most 50 characters", () => {
      for (let i = 0; i < 100; i++) {
        const name = generateRandomTeamName();
        assert.ok(name.length <= 50, `Name "${name}" is too long`);
      }
    });

    it("generates different names on multiple calls", () => {
      const names = new Set<string>();
      for (let i = 0; i < 50; i++) {
        names.add(generateRandomTeamName());
      }
      // With random generation, we should get at least a few different names
      assert.ok(names.size > 5, "Expected more variety in generated names");
    });
  });

  describe("generateTeamNameSuggestions", () => {
    it("returns the requested number of suggestions", () => {
      const suggestions = generateTeamNameSuggestions(5);
      assert.equal(suggestions.length, 5);
    });

    it("returns unique suggestions", () => {
      const suggestions = generateTeamNameSuggestions(10);
      const uniqueSet = new Set(suggestions);
      assert.equal(uniqueSet.size, suggestions.length);
    });

    it("defaults to 5 suggestions", () => {
      const suggestions = generateTeamNameSuggestions();
      assert.equal(suggestions.length, 5);
    });

    it("all suggestions are non-empty strings", () => {
      const suggestions = generateTeamNameSuggestions(10);
      for (const suggestion of suggestions) {
        assert.ok(typeof suggestion === "string");
        assert.ok(suggestion.length > 0);
      }
    });
  });
});
