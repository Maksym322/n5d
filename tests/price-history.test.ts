import { describe, it, expect } from "vitest";
import { defaultPriceHistory } from "@/lib/price-history";

describe("defaultPriceHistory", () => {
  it("returns six sequential annual points ending at the last full year", () => {
    const points = defaultPriceHistory(2026, 2_000_000);
    expect(points).toHaveLength(6);
    expect(points.map((p) => p.year)).toEqual([2020, 2021, 2022, 2023, 2024, 2025]);
  });

  it("anchors the final point exactly at the asking price", () => {
    const points = defaultPriceHistory(2026, 2_000_000);
    expect(points[5].value_cents).toBe(2_000_000);
  });

  it("keeps every value a positive integer number of cents", () => {
    const points = defaultPriceHistory(2026, 2_000_000);
    for (const p of points) {
      expect(Number.isInteger(p.value_cents)).toBe(true);
      expect(p.value_cents).toBeGreaterThan(0);
    }
  });

  it("falls back to a sane anchor when the asking price is unset", () => {
    const points = defaultPriceHistory(2026, null);
    expect(points[5].value_cents).toBe(1_000_000);
    expect(points.every((p) => p.value_cents > 0)).toBe(true);
  });
});
