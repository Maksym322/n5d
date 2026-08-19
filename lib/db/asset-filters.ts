import type { Enums, Json } from "@/lib/types/database";
import { Constants } from "@/lib/types/database";

// Pure catalogue helpers — no database/server imports, so they are safe to unit-test in a
// node environment (ADR-14) and cheap to reuse. lib/db/assets.ts re-exports these.

export type AssetCategory = Enums<"asset_category">;
export type DealType = Enums<"deal_type">;
export type AssetSort = "newest" | "price_asc" | "price_desc";

export type PricePoint = { year: number; valueCents: number };

export type AssetFilters = {
  category: AssetCategory | null;
  jurisdiction: string | null;
  dealType: DealType | null;
  priceMinCents: number | null;
  priceMaxCents: number | null;
  q: string | null;
  refQuery: number | null; // public_ref parsed out of q, e.g. "Asset #113" -> 113
  sort: AssetSort;
  page: number; // 1-based
};

export type CategoryFacets = Record<AssetCategory, number>;

export const ASSET_PAGE_SIZE = 10;

// The URL search-param keys that make up the filter slice of catalogue state — the write-side
// counterpart to `parseAssetFilters`. Every key is always present so a patch can clear a stale
// value rather than inheriting it (`useCatalogueParams.setParams` deletes null keys).
export type CatalogueFilterParams = {
  category: string | null;
  jurisdiction: string | null;
  deal_type: string | null;
  price_min: string | null;
  price_max: string | null;
  q: string | null;
};

const SORTS: readonly AssetSort[] = ["newest", "price_asc", "price_desc"];

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

// The asset reference (`public_ref`) is the only identifier a user ever sees — in every
// listing title, URL and thread — so search must find it. If the query, once a leading
// "asset", "#" and whitespace are stripped, is a positive integer, treat it as a ref match
// (OR'd into the text search by applyAssetFilters). Non-numeric queries are unaffected.
export function parseRefQuery(raw: string): number | null {
  const stripped = raw
    .trim()
    .replace(/^asset\b/i, "")
    .replace(/^[\s#]+/, "")
    .trim();
  if (!/^\d+$/.test(stripped)) return null;
  const n = Number(stripped);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Catalogue state lives entirely in the URL search params (ADR-3); this is the single place
// they are validated.
export function parseAssetFilters(sp: RawParams): AssetFilters {
  const juris = first(sp, "jurisdiction");
  const rawSort = first(sp, "sort");
  const rawPage = Number(first(sp, "page"));
  const q = first(sp, "q")?.trim() || null;

  return {
    category: inEnum(first(sp, "category"), Constants.public.Enums.asset_category),
    jurisdiction:
      juris && /^[A-Za-z]{2}$/.test(juris) ? juris.toUpperCase() : null,
    dealType: inEnum(first(sp, "deal_type"), Constants.public.Enums.deal_type),
    priceMinCents: toCents(first(sp, "price_min")),
    priceMaxCents: toCents(first(sp, "price_max")),
    q,
    refQuery: q ? parseRefQuery(q) : null,
    sort: (SORTS as readonly string[]).includes(rawSort ?? "")
      ? (rawSort as AssetSort)
      : "newest",
    page: Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1,
  };
}

// A patch that resets the whole filter slice, keeping only a free-text query. This is the
// deterministic search path: exactly what the catalogue did before natural-language search, and
// what it still does whenever interpretation is unavailable (ADR-6).
export function clearedFilterParams(q: string | null): CatalogueFilterParams {
  const trimmed = q?.trim();
  return {
    category: null,
    jurisdiction: null,
    deal_type: null,
    price_min: null,
    price_max: null,
    q: trimmed ? trimmed : null,
  };
}

export function hasActiveFilters(f: AssetFilters): boolean {
  return (
    f.category !== null ||
    f.jurisdiction !== null ||
    f.dealType !== null ||
    f.priceMinCents !== null ||
    f.priceMaxCents !== null ||
    f.q !== null
  );
}

// Which facet to suggest widening when a filter set returns nothing. Returns the i18n key
// (under the marketplace `empty` namespace) for the most-specific narrowing filter.
export function widenSuggestionKey(
  f: AssetFilters,
): "widenPrice" | "widenJurisdiction" | "widenCategory" | "widenSearch" | "generic" {
  if (f.priceMinCents !== null || f.priceMaxCents !== null) return "widenPrice";
  if (f.jurisdiction !== null) return "widenJurisdiction";
  if (f.category !== null) return "widenCategory";
  if (f.q !== null) return "widenSearch";
  return "generic";
}

// Facet bucketing over the enum (ADR-16), separated so it is unit-testable.
export function bucketByCategory(categories: AssetCategory[]): CategoryFacets {
  const counts = Object.fromEntries(
    Constants.public.Enums.asset_category.map((c) => [c, 0]),
  ) as CategoryFacets;
  for (const c of categories) counts[c] += 1;
  return counts;
}

export function toPricePoints(json: Json): PricePoint[] {
  if (!Array.isArray(json)) return [];
  return json.flatMap((p) => {
    if (p && typeof p === "object" && !Array.isArray(p)) {
      const rec = p as Record<string, Json | undefined>;
      const year = Number(rec.year);
      const value = Number(rec.value_cents);
      if (Number.isFinite(year) && Number.isFinite(value)) {
        return [{ year, valueCents: value }];
      }
    }
    return [];
  });
}
