import { describe, it, expect } from "vitest";

import {
  MAX_RESIDUAL_QUERY_LEN,
  narrowSearchIntent,
  searchIntentToParams,
  type SearchIntent,
} from "@/lib/ai/search-intent";
import { parseAssetFilters } from "@/lib/db/asset-filters";

const empty: SearchIntent = {
  category: null,
  jurisdiction: null,
  dealType: null,
  priceMinCents: null,
  priceMaxCents: null,
  query: null,
};

// A well-formed model response with everything unset, so each test states only what it varies.
const raw = (over: Record<string, unknown> = {}) => ({
  category: "UNSPECIFIED",
  jurisdiction: "UNSPECIFIED",
  dealType: "UNSPECIFIED",
  priceMinEur: 0,
  priceMaxEur: 0,
  query: "",
  ...over,
});

describe("narrowSearchIntent — valid response", () => {
  it("maps every field and converts euros to integer cents", () => {
    expect(
      narrowSearchIntent(
        raw({
          category: "FINTECH",
          jurisdiction: "DE",
          dealType: "MAJORITY_STAKE",
          priceMinEur: 2_000_000,
          priceMaxEur: 5_000_000,
          query: "  profitable  exchange ",
        }),
      ),
    ).toEqual({
      category: "FINTECH",
      jurisdiction: "DE",
      dealType: "MAJORITY_STAKE",
      priceMinCents: 200_000_000,
      priceMaxCents: 500_000_000,
      query: "profitable exchange",
    });
  });

  it("trims and uppercases enum values before matching", () => {
    expect(narrowSearchIntent(raw({ category: " fintech ", jurisdiction: "de" }))).toMatchObject({
      category: "FINTECH",
      jurisdiction: "DE",
    });
  });

  it("rounds fractional euros to whole cents", () => {
    expect(narrowSearchIntent(raw({ priceMaxEur: 1_234.567 }))?.priceMaxCents).toBe(123_457);
  });

  it("truncates a residual query that echoed the whole sentence", () => {
    const long = "a".repeat(MAX_RESIDUAL_QUERY_LEN + 40);
    expect(narrowSearchIntent(raw({ query: long }))?.query).toHaveLength(MAX_RESIDUAL_QUERY_LEN);
  });
});

describe("narrowSearchIntent — unknown values are dropped, not fatal", () => {
  it("drops an unknown category and keeps the other fields", () => {
    expect(
      narrowSearchIntent(raw({ category: "INSURANCE", jurisdiction: "PL", query: "insurance" })),
    ).toEqual({ ...empty, jurisdiction: "PL", query: "insurance" });
  });

  it("drops a jurisdiction that is a real ISO code but not one we have rows for", () => {
    expect(narrowSearchIntent(raw({ jurisdiction: "IS", category: "CRYPTO" }))).toEqual({
      ...empty,
      category: "CRYPTO",
    });
  });

  it("drops an unknown deal type", () => {
    expect(narrowSearchIntent(raw({ dealType: "JOINT_VENTURE", category: "BANK" }))).toEqual({
      ...empty,
      category: "BANK",
    });
  });
});

describe("narrowSearchIntent — out-of-range prices", () => {
  it("drops negative, zero and non-finite bounds", () => {
    expect(narrowSearchIntent(raw({ priceMinEur: -5, priceMaxEur: 0, category: "EMI" }))).toEqual({
      ...empty,
      category: "EMI",
    });
    expect(
      narrowSearchIntent(raw({ priceMinEur: Number.NaN, priceMaxEur: Infinity, category: "EMI" })),
    ).toEqual({ ...empty, category: "EMI" });
  });

  it("drops an implausibly large bound", () => {
    expect(narrowSearchIntent(raw({ priceMaxEur: 1e15, category: "EMI" }))).toEqual({
      ...empty,
      category: "EMI",
    });
  });

  it("drops BOTH bounds when min exceeds max, rather than returning an empty range", () => {
    expect(
      narrowSearchIntent(
        raw({ priceMinEur: 5_000_000, priceMaxEur: 2_000_000, category: "PAYMENT" }),
      ),
    ).toEqual({ ...empty, category: "PAYMENT" });
  });

  it("keeps an equal min and max", () => {
    expect(
      narrowSearchIntent(raw({ priceMinEur: 1_000_000, priceMaxEur: 1_000_000 })),
    ).toMatchObject({ priceMinCents: 100_000_000, priceMaxCents: 100_000_000 });
  });
});

describe("narrowSearchIntent — empty response", () => {
  it("returns null when the model found nothing to apply", () => {
    expect(narrowSearchIntent(raw())).toBeNull();
  });

  it("returns null when only whitespace came back as the residual query", () => {
    expect(narrowSearchIntent(raw({ query: "   " }))).toBeNull();
  });
});

describe("narrowSearchIntent — malformed response", () => {
  it("returns null for anything that is not an object", () => {
    expect(narrowSearchIntent(null)).toBeNull();
    expect(narrowSearchIntent(undefined)).toBeNull();
    expect(narrowSearchIntent("FINTECH")).toBeNull();
    expect(narrowSearchIntent([])).toBeNull();
    expect(narrowSearchIntent(42)).toBeNull();
  });

  it("returns null when a field has the wrong type", () => {
    expect(narrowSearchIntent(raw({ category: 123 }))).toBeNull();
    expect(narrowSearchIntent(raw({ priceMinEur: "5m" }))).toBeNull();
    expect(narrowSearchIntent(raw({ query: ["a", "b"] }))).toBeNull();
  });

  it("tolerates missing keys", () => {
    expect(narrowSearchIntent({ category: "BANK" })).toEqual({ ...empty, category: "BANK" });
  });
});

describe("searchIntentToParams", () => {
  it("falls back to the raw sentence as q when there is no interpretation", () => {
    expect(searchIntentToParams(null, "  german fintech  ")).toEqual({
      category: null,
      jurisdiction: null,
      deal_type: null,
      price_min: null,
      price_max: null,
      q: "german fintech",
    });
  });

  it("writes all six keys so a previous interpretation cannot survive", () => {
    expect(searchIntentToParams({ ...empty, category: "BANK" }, "banks")).toEqual({
      category: "BANK",
      jurisdiction: null,
      deal_type: null,
      price_min: null,
      price_max: null,
      q: null,
    });
  });

  it("round-trips through parseAssetFilters — the ADR-3 URL contract", () => {
    const intent: SearchIntent = {
      category: "FINTECH",
      jurisdiction: "DE",
      dealType: "MAJORITY_STAKE",
      priceMinCents: 200_000_000,
      priceMaxCents: 500_000_000,
      query: "profitable",
    };
    const params = searchIntentToParams(intent, "german fintech 2-5m profitable");
    const url = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== null),
    ) as Record<string, string>;

    expect(parseAssetFilters(url)).toEqual({
      category: "FINTECH",
      jurisdiction: "DE",
      dealType: "MAJORITY_STAKE",
      priceMinCents: 200_000_000,
      priceMaxCents: 500_000_000,
      q: "profitable",
      refQuery: null,
      sort: "newest",
      page: 1,
    });
  });
});
