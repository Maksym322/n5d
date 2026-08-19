// Presentation-boundary formatting (ADR-4). Money is bigint cents everywhere in the
// domain; it is turned into a human string only here. Never format money by hand elsewhere.

type Cents = bigint | number;

function toUnits(cents: Cents): number {
  // Cents are integers below 2^53, so Number() is exact; dividing yields the major unit.
  return Number(cents) / 100;
}

function currencySymbol(currency: string, locale: string): string {
  const parts = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
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
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(units);
}

/** One decimal, magnitude-suffixed value, e.g. `2`, `M` for 2,000,000. */
function compactParts(units: number): { num: string; unit: "" | "K" | "M" | "B" } {
  const tiers: ReadonlyArray<readonly [number, "B" | "M" | "K"]> = [
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  for (const [factor, unit] of tiers) {
    if (Math.abs(units) >= factor) {
      const scaled = Math.round((units / factor) * 10) / 10;
      return { num: String(scaled), unit };
    }
  }
  return { num: String(Math.round(units)), unit: "" };
}

/** Compact amount, e.g. `€130K`, `€2.5M`. */
export function formatMoneyCompact(cents: Cents, currency = "EUR", locale = "en"): string {
  const { num, unit } = compactParts(toUnits(cents));
  return `${currencySymbol(currency, locale)}${num}${unit}`;
}

/**
 * Ticket range as shown in the buyer directory, e.g. `€2–5M`, `€200K+`, `Up to €5M`, `Any`.
 * Handles open-ended and unset bounds. When both bounds share a magnitude unit, the symbol
 * and unit are printed once (`€2–5M`) rather than twice (`€2M–€5M`).
 */
export function formatTicketRange(
  minCents: Cents | null | undefined,
  maxCents: Cents | null | undefined,
  currency = "EUR",
  locale = "en",
): string {
  const sym = currencySymbol(currency, locale);
  const min = minCents ?? null;
  const max = maxCents ?? null;

  if (min === null && max === null) return "Any";
  if (min !== null && max === null) return `${sym}${compactSuffix(min)}+`;
  if (min === null && max !== null) return `Up to ${sym}${compactSuffix(max)}`;
  if (min !== null && max !== null) {
    const lo = compactParts(toUnits(min));
    const hi = compactParts(toUnits(max));
    if (lo.unit === hi.unit) return `${sym}${lo.num}–${hi.num}${hi.unit}`;
    return `${sym}${lo.num}${lo.unit}–${sym}${hi.num}${hi.unit}`;
  }
  return "Any";
}

function compactSuffix(cents: Cents): string {
  const { num, unit } = compactParts(toUnits(cents));
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

/** Human asset identifier, e.g. `#793`. */
export function formatAssetRef(publicRef: number): string {
  return `#${publicRef}`;
}
