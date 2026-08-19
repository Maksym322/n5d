import type { Tables } from "@/lib/types/database";
import { createClient } from "@/lib/supabase/server";
import {
  BUYER_PAGE_SIZE,
  bucketBuyerCategories,
  type BuyerFilters,
} from "@/lib/db/buyer-directory-filters";
import type { AssetCategory, CategoryFacets } from "@/lib/db/asset-filters";
import type { InvestorType } from "@/lib/db/buyer";

// The anonymous buyer directory a seller browses (F3). Reads buyer_profiles only — never
// buyer_identities — so a card can never carry a company name (D1). RLS buyer_profile_read (post
// migration 20260819140000) already scopes rows to is_listed = true AND active buyers, so there is
// no status juggling here. This is the F3 mirror of lib/db/assets.ts.

// Re-export the pure helpers so callers keep importing from "@/lib/db/buyer-directory".
export {
  BUYER_PAGE_SIZE,
  parseBuyerFilters,
  hasActiveBuyerFilters,
  widenBuyerSuggestionKey,
  bucketBuyerCategories,
} from "@/lib/db/buyer-directory-filters";
export type { BuyerFilters } from "@/lib/db/buyer-directory-filters";

export type BuyerCard = {
  userId: string; // profiles.id — non-identifying; keys the detail route and opens a conversation
  headline: string;
  investorType: InvestorType;
  categories: AssetCategory[];
  jurisdictions: string[];
  ticketMinCents: number | null;
  ticketMaxCents: number | null;
};

function toBuyerCard(row: Tables<"buyer_profiles">): BuyerCard {
  return {
    userId: row.user_id,
    headline: row.headline,
    investorType: row.investor_type,
    categories: row.categories,
    jurisdictions: row.jurisdictions,
    ticketMinCents: row.ticket_min_cents,
    ticketMaxCents: row.ticket_max_cents,
  };
}

// A buyer's ticket band [min, max] (either end open when null) overlaps the filter band when the
// buyer's max is not below the filter min AND the buyer's min is not above the filter max. Each
// side is expressed as an OR that also admits the open (null) end. Separate .or() calls AND
// together, giving (maxOK) AND (minOK).
function applyTicketOverlap<Q extends { or: (f: string) => Q }>(
  query: Q,
  f: BuyerFilters,
): Q {
  let q = query;
  if (f.ticketMinCents !== null)
    q = q.or(`ticket_max_cents.gte.${f.ticketMinCents},ticket_max_cents.is.null`);
  if (f.ticketMaxCents !== null)
    q = q.or(`ticket_min_cents.lte.${f.ticketMaxCents},ticket_min_cents.is.null`);
  return q;
}

export async function listBuyers(
  f: BuyerFilters,
): Promise<{ items: BuyerCard[]; total: number }> {
  const supabase = await createClient();
  const from = (f.page - 1) * BUYER_PAGE_SIZE;
  const to = from + BUYER_PAGE_SIZE - 1;

  let query = supabase
    .from("buyer_profiles")
    .select("*", { count: "exact" })
    .eq("is_listed", true); // RLS also enforces this + active; explicit keeps intent legible

  if (f.category) query = query.contains("categories", [f.category]);
  if (f.jurisdiction) query = query.contains("jurisdictions", [f.jurisdiction]);
  query = applyTicketOverlap(query, f);

  const { data, error, count } = await query
    .order("updated_at", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return { items: (data ?? []).map(toBuyerCard), total: count ?? 0 };
}

// Category facet counts recomputed against every active filter EXCEPT category itself (ADR-16), so
// each pill shows what selecting it would yield. Suspended/opted-out buyers are already excluded by
// RLS, so the counts are honest.
export async function getBuyerFacets(f: BuyerFilters): Promise<CategoryFacets> {
  const supabase = await createClient();

  let query = supabase
    .from("buyer_profiles")
    .select("categories")
    .eq("is_listed", true);
  if (f.jurisdiction) query = query.contains("jurisdictions", [f.jurisdiction]);
  query = applyTicketOverlap(query, f);

  const { data, error } = await query;
  if (error) throw error;
  return bucketBuyerCategories((data ?? []).map((r) => r.categories));
}

// Single anonymous mandate for the detail page. RLS returns null for an opted-out (is_listed=false)
// or suspended buyer, so the page calls notFound() rather than rendering a shell.
export async function getBuyerById(id: string): Promise<BuyerCard | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("buyer_profiles")
    .select("*")
    .eq("user_id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toBuyerCard(data) : null;
}
