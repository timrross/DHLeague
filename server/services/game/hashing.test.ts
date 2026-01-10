import assert from "node:assert";
import { describe, it } from "node:test";
import { hashPayload, stableStringify } from "./hashing";

describe("hashing", () => {
  it("produces stable JSON for equivalent objects", () => {
    const a = { b: 1, a: { d: 2, c: 3 } };
    const b = { a: { c: 3, d: 2 }, b: 1 };

    assert.equal(stableStringify(a), stableStringify(b));
    assert.equal(hashPayload(a), hashPayload(b));
  });

  it("is deterministic for repeated inputs", () => {
    const payload = {
      raceId: 10,
      results: [
        { uciId: "uci-1", status: "FIN", position: 1 },
        { uciId: "uci-2", status: "DNS" },
      ],
    };

    const first = hashPayload(payload);
    const second = hashPayload(payload);

    assert.equal(first, second);
  });
});
