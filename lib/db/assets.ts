import type { Tables } from "@/lib/types/database";
import { createClient } from "@/lib/supabase/server";
import {
  ASSET_PAGE_SIZE,
  bucketByCategory,
  toPricePoints,
  type AssetCategory,
  type AssetFilters,
  type CategoryFacets,
  type DealType,
  type PricePoint,
} from "@/lib/db/asset-filters";

// Re-export the pure catalogue helpers so callers keep importing from "@/lib/db/assets".
export {
  ASSET_PAGE_SIZE,
  parseAssetFilters,
  hasActiveFilters,
  widenSuggestionKey,
  bucketByCategory,
} from "@/lib/db/asset-filters";
export type {
  AssetCategory,
  DealType,
  AssetSort,
  AssetFilters,
  CategoryFacets,
  PricePoint,
} from "@/lib/db/asset-filters";

// Domain projections the components consume. Money stays as `number` cents; formatting
// happens only at the presentation boundary (ADR-4).
export type AssetListItem = {
  id: string;
  publicRef: number;
  title: string;
  category: AssetCategory;
  jurisdiction: string; // ISO alpha-2
  dealType: DealType;
  revenueCents: number | null;
  ebitdaCents: number | null;
  askingPriceCents: number | null;
  employees: number | null;
  yearFounded: number | null;
  highlights: string[];
  priceHistory: PricePoint[];
  validated: boolean;
  viewCount: number;
  publishedAt: string | null;
};

export type AssetDetail = AssetListItem & {
  description: string;
  sellerId: string; // profiles.id — non-identifying; needed to open a conversation
  seller: {
    headline: string;
    jurisdiction: string;
    description: string | null;
    verified: boolean; // drives the seller-level "Validated" badge
  } | null;
};

function toAssetListItem(row: Tables<"assets">): AssetListItem {
  return {
    id: row.id,
    publicRef: row.public_ref,
    title: row.title,
    category: row.category,
    jurisdiction: row.jurisdiction,
    dealType: row.deal_type,
    revenueCents: row.revenue_cents,
    ebitdaCents: row.ebitda_cents,
    askingPriceCents: row.asking_price_cents,
    employees: row.employees,
    yearFounded: row.year_founded,
    highlights: row.highlights,
    priceHistory: toPricePoints(row.price_history),
    validated: row.validated,
    viewCount: row.view_count,
    publishedAt: row.published_at,
  };
}

// Escape ilike wildcards so a user's `%`/`_` are treated literally (ADR-13).
function ilikePattern(raw: string): string {
  return `%${raw.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
}

// The free-text search also spans seller_profiles.headline, a column on another table.
// PostgREST cannot .or() across the base table and an embed, so we resolve matching seller
// ids first, then OR them into the base query.
async function searchOrClause(
  supabase: Awaited<ReturnType<typeof createClient>>,
  pattern: string,
  refQuery: number | null,
): Promise<string> {
  const ors = [`title.ilike."${pattern}"`, `description.ilike."${pattern}"`];
  // The ref is an integer, invisible to ilike — match it exactly when the query is a ref.
  if (refQuery !== null) ors.push(`public_ref.eq.${refQuery}`);
  const { data } = await supabase
    .from("seller_profiles")
    .select("user_id")
    .ilike("headline", pattern);
  const ids = (data ?? []).map((r) => r.user_id);
  if (ids.length > 0) ors.push(`seller_id.in.(${ids.join(",")})`);
  return ors.join(",");
}

export async function listAssets(
  f: AssetFilters,
): Promise<{ items: AssetListItem[]; total: number }> {
  const supabase = await createClient();
  const from = (f.page - 1) * ASSET_PAGE_SIZE;
  const to = from + ASSET_PAGE_SIZE - 1;

  // RLS assets_read_published already scopes to PUBLISHED + active seller; the explicit
  // status filter keeps the (status, category, jurisdiction) index in play.
  let query = supabase
    .from("assets")
    .select("*", { count: "exact" })
    .eq("status", "PUBLISHED");

  if (f.category) query = query.eq("category", f.category);
  if (f.jurisdiction) query = query.eq("jurisdiction", f.jurisdiction);
  if (f.dealType) query = query.eq("deal_type", f.dealType);
  if (f.priceMinCents !== null)
    query = query.gte("asking_price_cents", f.priceMinCents);
  if (f.priceMaxCents !== null)
    query = query.lte("asking_price_cents", f.priceMaxCents);
  if (f.q)
    query = query.or(await searchOrClause(supabase, ilikePattern(f.q), f.refQuery));

  if (f.sort === "price_asc")
    query = query.order("asking_price_cents", { ascending: true, nullsFirst: false });
  else if (f.sort === "price_desc")
    query = query.order("asking_price_cents", { ascending: false, nullsFirst: false });
  else query = query.order("published_at", { ascending: false, nullsFirst: false });

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;
  return { items: (data ?? []).map(toAssetListItem), total: count ?? 0 };
}

// Facet counts recomputed against every active filter EXCEPT category itself, so each pill
// shows what selecting it would yield (ADR-16). One small query, bucketed in JS.
export async function getCategoryFacets(f: AssetFilters): Promise<CategoryFacets> {
  const supabase = await createClient();

  let query = supabase.from("assets").select("category").eq("status", "PUBLISHED");
  if (f.jurisdiction) query = query.eq("jurisdiction", f.jurisdiction);
  if (f.dealType) query = query.eq("deal_type", f.dealType);
  if (f.priceMinCents !== null)
    query = query.gte("asking_price_cents", f.priceMinCents);
  if (f.priceMaxCents !== null)
    query = query.lte("asking_price_cents", f.priceMaxCents);
  if (f.q)
    query = query.or(await searchOrClause(supabase, ilikePattern(f.q), f.refQuery));

  const { data, error } = await query;
  if (error) throw error;
  return bucketByCategory((data ?? []).map((r) => r.category));
}

export async function getAssetByRef(ref: number): Promise<AssetDetail | null> {
  if (!Number.isInteger(ref)) return null;
  const supabase = await createClient();

  const { data: asset, error } = await supabase
    .from("assets")
    .select("*")
    .eq("public_ref", ref)
    .eq("status", "PUBLISHED")
    .maybeSingle();
  if (error) throw error;
  if (!asset) return null;

  const { data: seller } = await supabase
    .from("seller_profiles")
    .select("headline, jurisdiction, description, verified")
    .eq("user_id", asset.seller_id)
    .maybeSingle();

  return {
    ...toAssetListItem(asset),
    description: asset.description,
    sellerId: asset.seller_id,
    seller: seller ?? null,
  };
}
