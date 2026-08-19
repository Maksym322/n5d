// Pure helper for the asset form's price_history editor (ADR-15 chart data). Kept out of the
// component so it is unit-testable (ADR-14) and free of Date/Math.random side effects — the caller
// passes the current year, and the drift is deterministic per point.

export type PriceHistoryPoint = { year: number; value_cents: number };

const YEARS = 6; // six annual points feed the Market Trend chart (DATA-MODEL §3.6)

// Six sequential annual points ending at the last full year (currentYear-1), trending up to the
// anchor with a mild, deterministic wobble so the seller gets a plausible starting curve they can
// adjust rather than a flat line. anchorCents is the asset's asking price (or a sensible fallback
// when unset). Values are always positive integer cents. For 2026 the years are 2020..2025,
// matching the design audit's "Market Trend (2020-2025)".
export function defaultPriceHistory(
  currentYear: number,
  anchorCents: number | null,
): PriceHistoryPoint[] {
  const anchor = anchorCents && anchorCents > 0 ? anchorCents : 1_000_000; // €10k fallback
  const firstYear = currentYear - YEARS; // e.g. 2020 for 2026

  // Growth factors from ~55% of the anchor up to the anchor, with a small mid-series wobble so no
  // two years are identical. Index 5 lands exactly on the anchor (the most recent full year).
  const factors = [0.55, 0.68, 0.62, 0.79, 0.9, 1] as const;

  return factors.map((factor, i) => ({
    year: firstYear + i,
    value_cents: Math.max(1, Math.round(anchor * factor)),
  }));
}
