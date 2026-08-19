import { describe, it, expect } from "vitest";
import {
  clearedFilterParams,
  parseAssetFilters,
  parseRefQuery,
  hasActiveFilters,
  widenSuggestionKey,
  type AssetFilters,
} from "@/lib/db/asset-filters";

const base: AssetFilters = {
  category: null,
  jurisdiction: null,
  dealType: null,
  priceMinCents: null,
  priceMaxCents: null,
  q: null,
  refQuery: null,
  sort: "newest",
  page: 1,
};

describe("parseAssetFilters", () => {
  it("returns defaults for empty params", () => {
    expect(parseAssetFilters({})).toEqual(base);
  });

  it("accepts a valid category and rejects an invalid one", () => {
    expect(parseAssetFilters({ category: "FINTECH" }).category).toBe("FINTECH");
    expect(parseAssetFilters({ category: "NOPE" }).category).toBeNull();
  });

  it("normalises jurisdiction to a two-letter uppercase code", () => {
    expect(parseAssetFilters({ jurisdiction: "de" }).jurisdiction).toBe("DE");
    expect(parseAssetFilters({ jurisdiction: "deu" }).jurisdiction).toBeNull();
    expect(parseAssetFilters({ jurisdiction: "1a" }).jurisdiction).toBeNull();
  });

  it("coerces price to non-negative integer cents", () => {
    expect(parseAssetFilters({ price_min: "100000" }).priceMinCents).toBe(100000);
    expect(parseAssetFilters({ price_max: "-5" }).priceMaxCents).toBeNull();
    expect(parseAssetFilters({ price_min: "abc" }).priceMinCents).toBeNull();
    expect(parseAssetFilters({ price_min: "" }).priceMinCents).toBeNull();
  });

  it("trims the search term and drops empties", () => {
    expect(parseAssetFilters({ q: "  bank " }).q).toBe("bank");
    expect(parseAssetFilters({ q: "   " }).q).toBeNull();
  });

  it("falls back to newest for an unknown sort", () => {
    expect(parseAssetFilters({ sort: "price_asc" }).sort).toBe("price_asc");
    expect(parseAssetFilters({ sort: "banana" }).sort).toBe("newest");
  });

  it("clamps page to at least 1", () => {
    expect(parseAssetFilters({ page: "3" }).page).toBe(3);
    expect(parseAssetFilters({ page: "0" }).page).toBe(1);
    expect(parseAssetFilters({ page: "-2" }).page).toBe(1);
    expect(parseAssetFilters({ page: "x" }).page).toBe(1);
  });

  it("takes the first value when a param repeats", () => {
    expect(parseAssetFilters({ category: ["FINTECH", "BANK"] }).category).toBe("FINTECH");
  });

  it("extracts a ref from a search query while keeping the text query", () => {
    const f = parseAssetFilters({ q: "Asset #113" });
    expect(f.q).toBe("Asset #113");
    expect(f.refQuery).toBe(113);
  });

  it("leaves refQuery null for a non-numeric query", () => {
    expect(parseAssetFilters({ q: "fintech" }).refQuery).toBeNull();
  });
});

describe("parseRefQuery", () => {
  it("parses the three ref input shapes", () => {
    expect(parseRefQuery("113")).toBe(113);
    expect(parseRefQuery("#113")).toBe(113);
    expect(parseRefQuery("Asset #113")).toBe(113);
  });

  it("tolerates casing and missing space", () => {
    expect(parseRefQuery("asset 113")).toBe(113);
    expect(parseRefQuery("ASSET#113")).toBe(113);
  });

  it("returns null for non-ref queries", () => {
    expect(parseRefQuery("fintech")).toBeNull();
    expect(parseRefQuery("11 3")).toBeNull();
    expect(parseRefQuery("12ab")).toBeNull();
    expect(parseRefQuery("0")).toBeNull();
    expect(parseRefQuery("")).toBeNull();
  });
});

describe("hasActiveFilters", () => {
  it("is false with no filters", () => {
    expect(hasActiveFilters(base)).toBe(false);
  });

  it("is true when any filter is set", () => {
    expect(hasActiveFilters({ ...base, category: "BANK" })).toBe(true);
    expect(hasActiveFilters({ ...base, priceMaxCents: 5000 })).toBe(true);
    expect(hasActiveFilters({ ...base, q: "fintech" })).toBe(true);
  });
});

describe("widenSuggestionKey", () => {
  it("prioritises price, then jurisdiction, then category, then search", () => {
    expect(widenSuggestionKey({ ...base, priceMinCents: 1, category: "BANK" })).toBe(
      "widenPrice",
    );
    expect(widenSuggestionKey({ ...base, jurisdiction: "DE", category: "BANK" })).toBe(
      "widenJurisdiction",
    );
    expect(widenSuggestionKey({ ...base, category: "BANK", q: "x" })).toBe("widenCategory");
    expect(widenSuggestionKey({ ...base, q: "x" })).toBe("widenSearch");
    expect(widenSuggestionKey(base)).toBe("generic");
  });
});

describe("clearedFilterParams", () => {
  it("nulls every filter key so a stale interpretation cannot survive a new search", () => {
    expect(clearedFilterParams("fintech")).toEqual({
      category: null,
      jurisdiction: null,
      deal_type: null,
      price_min: null,
      price_max: null,
      q: "fintech",
    });
  });

  it("treats an empty or whitespace-only query as no query at all", () => {
    expect(clearedFilterParams("   ").q).toBeNull();
    expect(clearedFilterParams("").q).toBeNull();
    expect(clearedFilterParams(null).q).toBeNull();
    expect(clearedFilterParams("  german fintech  ").q).toBe("german fintech");
  });
});
