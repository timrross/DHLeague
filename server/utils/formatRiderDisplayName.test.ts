import assert from "node:assert";
import { describe, it } from "node:test";
import { formatRiderDisplayName } from "@shared/utils";

describe("formatRiderDisplayName", () => {
  it("prefers explicit first and last names", () => {
    const result = formatRiderDisplayName({
      name: "VAN DER POEL Mathieu",
      firstName: "mathieu",
      lastName: "VAN DER POEL",
    });

    assert.equal(result, "Mathieu VAN DER POEL");
  });

  it("swaps first/last when firstName looks like a surname", () => {
    const result = formatRiderDisplayName({
      name: "O'CONNOR Liam",
      firstName: "O'CONNOR",
      lastName: "Liam",
    });

    assert.equal(result, "Liam O'CONNOR");
  });

  it("reorders uppercase last names that precede the given name", () => {
    const result = formatRiderDisplayName({
      name: "GARCIA LOPEZ Maria Fernanda",
    });

    assert.equal(result, "Maria Fernanda GARCIA LOPEZ");
  });

  it("handles multi-word uppercase surnames", () => {
    const result = formatRiderDisplayName({ name: "VAN DER POEL Mathieu" });

    assert.equal(result, "Mathieu VAN DER POEL");
  });

  it("assumes the trailing token is the given name when all tokens are uppercase", () => {
    const result = formatRiderDisplayName({ name: "SMITH JOHN" });

    assert.equal(result, "John SMITH");
  });

  it("returns title-cased name when already in natural order", () => {
    const result = formatRiderDisplayName({ name: "Loana lecomte" });

    assert.equal(result, "Loana LECOMTE");
  });

  it("preserves punctuation while capitalizing", () => {
    const result = formatRiderDisplayName({ name: "O'CONNOR Liam" });

    assert.equal(result, "Liam O'CONNOR");
  });
});
