import { describe, it, expect } from "vitest";
import { bucketByCategory } from "@/lib/db/asset-filters";

describe("bucketByCategory", () => {
  it("returns every category key, zero when absent", () => {
    const counts = bucketByCategory([]);
    expect(counts).toEqual({
      BANK: 0,
      FINTECH: 0,
      PAYMENT: 0,
      EMI: 0,
      CRYPTO: 0,
      OTHER: 0,
    });
  });

  it("tallies each category against the filtered rows", () => {
    const counts = bucketByCategory([
      "FINTECH",
      "FINTECH",
      "BANK",
      "CRYPTO",
      "FINTECH",
    ]);
    expect(counts.FINTECH).toBe(3);
    expect(counts.BANK).toBe(1);
    expect(counts.CRYPTO).toBe(1);
    expect(counts.PAYMENT).toBe(0);
  });
});
