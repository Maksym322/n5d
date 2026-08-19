import { Constants } from "@/lib/types/database";
import type { AssetCategory, CategoryFacets } from "@/lib/db/asset-filters";

// Pure buyer-directory helpers — no database/server imports, so they are safe to unit-test in a
// node environment (ADR-14). lib/db/buyer-directory.ts re-exports these. This is the F3 mirror of
// lib/db/asset-filters.ts; the directory has no free-text search (a mandate is faceted, not named).

export type BuyerFilters = {
  category: AssetCategory | null;
  jurisdiction: string | null; // ISO alpha-2
  ticketMinCents: number | null;
  ticketMaxCents: number | null;
  page: number; // 1-based
};

export const BUYER_PAGE_SIZE = 10;

type RawParams = Record<string, string | string[] | undefined>;

function first(sp: RawParams, key: string): string | undefined {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

function inEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T | null {
  return value && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

function toCents(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

// Directory state lives entirely in the URL search params (ADR-3); this is the single place they
// are validated. Same param names as the asset catalogue (category / jurisdiction / price_min /
// price_max / page) so the shared filter controls need no per-surface config.
export function parseBuyerFilters(sp: RawParams): BuyerFilters {
  const juris = first(sp, "jurisdiction");
  const rawPage = Number(first(sp, "page"));

  return {
    category: inEnum(first(sp, "category"), Constants.public.Enums.asset_category),
    jurisdiction:
      juris && /^[A-Za-z]{2}$/.test(juris) ? juris.toUpperCase() : null,
    ticketMinCents: toCents(first(sp, "price_min")),
    ticketMaxCents: toCents(first(sp, "price_max")),
    page: Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1,
  };
}

export function hasActiveBuyerFilters(f: BuyerFilters): boolean {
  return (
    f.category !== null ||
    f.jurisdiction !== null ||
    f.ticketMinCents !== null ||
    f.ticketMaxCents !== null
  );
}

// Which facet to suggest widening when a filter set returns no buyers. Returns the i18n key (under
// the seller `buyers.empty` namespace) for the most-specific narrowing filter.
export function widenBuyerSuggestionKey(
  f: BuyerFilters,
): "widenTicket" | "widenJurisdiction" | "widenCategory" | "generic" {
  if (f.ticketMinCents !== null || f.ticketMaxCents !== null) return "widenTicket";
  if (f.jurisdiction !== null) return "widenJurisdiction";
  if (f.category !== null) return "widenCategory";
  return "generic";
}

// Facet bucketing over the enum (ADR-16), separated so it is unit-testable. A buyer's `categories`
// is an array, so a single buyer counts toward every category it holds — the correct "what would
// selecting this pill yield" semantics for a `.contains` filter.
export function bucketBuyerCategories(
  categoryArrays: AssetCategory[][],
): CategoryFacets {
  const counts = Object.fromEntries(
    Constants.public.Enums.asset_category.map((c) => [c, 0]),
  ) as CategoryFacets;
  for (const categories of categoryArrays) {
    for (const c of categories) counts[c] += 1;
  }
  return counts;
}
