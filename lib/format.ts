// Presentation-boundary formatting (ADR-4). Money is bigint cents everywhere in the
// domain; it is turned into a human string only here. Never format money by hand elsewhere.

type Cents = bigint | number;

function toUnits(cents: Cents): number {
  // Cents are integers below 2^53, so Number() is exact; dividing yields the major unit.
  return Number(cents) / 100;
}

// The symbol is deliberately NOT locale-dependent. Left to the viewer's locale, EUR resolves to
// the literal string "EUR" in uk (and in most non-Latin locales), so a price rendered "EUR5M"
// instead of "€5M" — the symbol is a currency mark, not a translated word. Resolving it from one
// fixed locale with `narrowSymbol` gives the same mark on every surface in every language.
const SYMBOL_LOCALE = "en";

function currencySymbol(currency: string): string {
  const parts = new Intl.NumberFormat(SYMBOL_LOCALE, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).formatToParts(0);
  return parts.find((p) => p.type === "currency")?.value ?? currency;
}

/** Full amount, e.g. `€1,300,000`. Whole amounts drop the decimals. */
export function formatMoney(cents: Cents, currency = "EUR", locale = "en"): string {
  const units = toUnits(cents);
  const hasFraction = Math.round(units * 100) % 100 !== 0;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    // Grouping, decimal separator and symbol placement stay locale-correct — uk renders
    // "1 300 000 €", en "€1,300,000". Only the mark itself is pinned (see currencySymbol).
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(units);
}

/** One decimal, magnitude-suffixed value, e.g. `2`, `M` for 2,000,000. */
function compactParts(
  units: number,
  locale: string,
): { num: string; unit: "" | "K" | "M" | "B" } {
  // Grouping off: the scaled value can reach four digits (999,999 -> "1000K"), and a grouped
  // "1,000K" reads as a formatting bug. The decimal separator still follows the locale, so uk
  // gets "2,5M" where en gets "2.5M".
  const decimal = (n: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 1, useGrouping: false }).format(n);

  const tiers: ReadonlyArray<readonly [number, "B" | "M" | "K"]> = [
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  for (const [factor, unit] of tiers) {
    if (Math.abs(units) >= factor) {
      const scaled = Math.round((units / factor) * 10) / 10;
      return { num: decimal(scaled), unit };
    }
  }
  return { num: decimal(Math.round(units)), unit: "" };
}

/** Compact amount, e.g. `€130K`, `€2.5M`. */
export function formatMoneyCompact(cents: Cents, currency = "EUR", locale = "en"): string {
  const { num, unit } = compactParts(toUnits(cents), locale);
  return `${currencySymbol(currency)}${num}${unit}`;
}

/**
 * The two words this range needs, supplied by the caller.
 *
 * They arrive as arguments rather than being looked up here because this module is a pure
 * formatter — importing the next-intl runtime into it would drag a React/request-scoped
 * dependency into something that is called from tests and from the seed. The caller already
 * holds a `t`, so translation stays at the presentation boundary where the rest of it lives.
 */
export type TicketRangeLabels = {
  /** Already interpolated — pass `(value) => t("ticket.upTo", { value })`. */
  upTo: (value: string) => string;
  /** Shown when neither bound is set. */
  any: string;
};

/**
 * Ticket range as shown in the buyer directory, e.g. `€2–5M`, `€200K+`, `Up to €5M`, `Any`.
 * Handles open-ended and unset bounds. When both bounds share a magnitude unit, the symbol
 * and unit are printed once (`€2–5M`) rather than twice (`€2M–€5M`).
 */
export function formatTicketRange(
  minCents: Cents | null | undefined,
  maxCents: Cents | null | undefined,
  labels: TicketRangeLabels,
  currency = "EUR",
  locale = "en",
): string {
  const sym = currencySymbol(currency);
  const min = minCents ?? null;
  const max = maxCents ?? null;

  if (min === null && max === null) return labels.any;
  if (min !== null && max === null) return `${sym}${compactSuffix(min, locale)}+`;
  if (min === null && max !== null) return labels.upTo(`${sym}${compactSuffix(max, locale)}`);
  if (min !== null && max !== null) {
    const lo = compactParts(toUnits(min), locale);
    const hi = compactParts(toUnits(max), locale);
    if (lo.unit === hi.unit) return `${sym}${lo.num}–${hi.num}${hi.unit}`;
    return `${sym}${lo.num}${lo.unit}–${sym}${hi.num}${hi.unit}`;
  }
  return labels.any;
}

function compactSuffix(cents: Cents, locale: string): string {
  const { num, unit } = compactParts(toUnits(cents), locale);
  return `${num}${unit}`;
}

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Localized medium date, e.g. `19 Aug 2026`. */
export function formatDate(value: Date | string | number, locale = "en"): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(toDate(value));
}

/** Month + year, e.g. `Aug 2026` — the listing "Date:" line in the reference. */
export function formatMonthYear(value: Date | string | number, locale = "en"): string {
  return new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" }).format(toDate(value));
}

/** Human asset identifier, e.g. `#113`. */
export function formatAssetRef(publicRef: number): string {
  return `#${publicRef}`;
}
