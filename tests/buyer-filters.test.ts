import { describe, it, expect } from "vitest";
import {
  parseBuyerFilters,
  hasActiveBuyerFilters,
  widenBuyerSuggestionKey,
} from "@/lib/db/buyer-directory-filters";

describe("parseBuyerFilters", () => {
  it("defaults an empty param set", () => {
    const f = parseBuyerFilters({});
    expect(f).toEqual({
      category: null,
      jurisdiction: null,
      ticketMinCents: null,
      ticketMaxCents: null,
      page: 1,
    });
  });

  it("accepts a valid category and rejects an invalid one", () => {
    expect(parseBuyerFilters({ category: "FINTECH" }).category).toBe("FINTECH");
    expect(parseBuyerFilters({ category: "NONSENSE" }).category).toBeNull();
  });

  it("uppercases a 2-letter jurisdiction and rejects other shapes", () => {
    expect(parseBuyerFilters({ jurisdiction: "de" }).jurisdiction).toBe("DE");
    expect(parseBuyerFilters({ jurisdiction: "DEU" }).jurisdiction).toBeNull();
    expect(parseBuyerFilters({ jurisdiction: "1" }).jurisdiction).toBeNull();
  });

  it("coerces non-negative integer ticket bounds and rejects the rest", () => {
    const f = parseBuyerFilters({ price_min: "200000", price_max: "5000000" });
    expect(f.ticketMinCents).toBe(200000);
    expect(f.ticketMaxCents).toBe(5000000);
    expect(parseBuyerFilters({ price_min: "-5" }).ticketMinCents).toBeNull();
    expect(parseBuyerFilters({ price_max: "1.5" }).ticketMaxCents).toBeNull();
  });

  it("parses a 1-based page and falls back to 1", () => {
    expect(parseBuyerFilters({ page: "3" }).page).toBe(3);
    expect(parseBuyerFilters({ page: "0" }).page).toBe(1);
    expect(parseBuyerFilters({ page: "abc" }).page).toBe(1);
  });
});

describe("hasActiveBuyerFilters", () => {
  it("is false with no filters and true when any is set", () => {
    expect(hasActiveBuyerFilters(parseBuyerFilters({}))).toBe(false);
    expect(hasActiveBuyerFilters(parseBuyerFilters({ category: "BANK" }))).toBe(true);
    expect(hasActiveBuyerFilters(parseBuyerFilters({ price_max: "100" }))).toBe(true);
  });
});

describe("widenBuyerSuggestionKey", () => {
  it("prioritises ticket > jurisdiction > category > generic", () => {
    expect(
      widenBuyerSuggestionKey(parseBuyerFilters({ price_min: "100", category: "BANK" })),
    ).toBe("widenTicket");
    expect(
      widenBuyerSuggestionKey(parseBuyerFilters({ jurisdiction: "DE", category: "BANK" })),
    ).toBe("widenJurisdiction");
    expect(widenBuyerSuggestionKey(parseBuyerFilters({ category: "BANK" }))).toBe(
      "widenCategory",
    );
    expect(widenBuyerSuggestionKey(parseBuyerFilters({}))).toBe("generic");
  });
});
