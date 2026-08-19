import { describe, it, expect } from "vitest";
import { bucketBuyerCategories } from "@/lib/db/buyer-directory-filters";
import { Constants } from "@/lib/types/database";

describe("bucketBuyerCategories", () => {
  it("zero-fills every category when there are no buyers", () => {
    const counts = bucketBuyerCategories([]);
    for (const c of Constants.public.Enums.asset_category) {
      expect(counts[c]).toBe(0);
    }
  });

  it("counts a buyer toward every category in its mandate", () => {
    const counts = bucketBuyerCategories([
      ["FINTECH", "PAYMENT"],
      ["FINTECH"],
      ["BANK"],
    ]);
    expect(counts.FINTECH).toBe(2);
    expect(counts.PAYMENT).toBe(1);
    expect(counts.BANK).toBe(1);
    expect(counts.CRYPTO).toBe(0);
    expect(counts.EMI).toBe(0);
    expect(counts.OTHER).toBe(0);
  });

  it("handles an empty mandate array without inventing counts", () => {
    const counts = bucketBuyerCategories([[], ["CRYPTO"]]);
    expect(counts.CRYPTO).toBe(1);
    expect(counts.FINTECH).toBe(0);
  });
});
