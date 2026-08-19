import type { Enums, Tables } from "@/lib/types/database";
import { createClient } from "@/lib/supabase/server";
import {
  ADMIN_PAGE_SIZE,
  type AccountStatus,
  type AdminAssetFilters,
  type AdminBuyerFilters,
  type AdminSellerFilters,
  type AssetCategory,
  type AssetStatus,
  type ModerationActionType,
  type ModerationTargetType,
  type ModLogFilters,
} from "@/lib/db/admin-filters";

// Platform Manager registry reads (ADR-5: all DB access lives here). A manager sees every
// row — suspended participants, drafts and identities included — through the is_manager()
// clause already present in every RLS policy, so these run on the ordinary RLS-bound client
// with no service role. The service role is only for the moderation *writes* (actions/
// moderation.ts, ADR-2). Money stays as cents; formatting happens at the presentation
// boundary (ADR-4).

// Re-export the pure helpers so callers import from "@/lib/db/admin".
export {
  ADMIN_PAGE_SIZE,
  parseAdminBuyerFilters,
  parseAdminSellerFilters,
  parseAdminAssetFilters,
  parseModLogFilters,
  hasActiveBuyerFilters,
  hasActiveSellerFilters,
  hasActiveAssetFilters,
  hasActiveModLogFilters,
} from "@/lib/db/admin-filters";
export type {
  AccountStatus,
  AssetStatus,
  AssetCategory,
  AdminBuyerFilters,
  AdminSellerFilters,
  AdminAssetFilters,
  ModLogFilters,
  ModerationActionType,
  ModerationTargetType,
} from "@/lib/db/admin-filters";

type InvestorType = Enums<"investor_type">;
type DealType = Enums<"deal_type">;

export type AdminBuyerRow = {
  userId: string;
  displayName: string;
  status: AccountStatus;
  companyName: string | null;
  headline: string | null;
  investorType: InvestorType | null;
  isListed: boolean;
  ticketMinCents: number | null;
  ticketMaxCents: number | null;
};

export type AdminBuyerDetail = AdminBuyerRow & {
  categories: AssetCategory[];
  jurisdictions: string[];
  dealTypes: DealType[];
  website: string | null;
  contactName: string | null;
};

export type AdminSellerRow = {
  userId: string;
  displayName: string;
  status: AccountStatus;
  companyName: string | null;
  headline: string | null;
  jurisdiction: string | null;
  verified: boolean;
  publishedAssetCount: number;
};

export type AdminSellerDetail = AdminSellerRow & {
  description: string | null;
  registrationNumber: string | null;
  website: string | null;
  contactName: string | null;
};

export type AdminAssetRow = {
  id: string;
  publicRef: number;
  title: string;
  category: AssetCategory;
  status: AssetStatus;
  askingPriceCents: number | null;
  sellerId: string;
  sellerDisplayName: string | null;
  sellerStatus: AccountStatus | null;
  sellerCompanyName: string | null;
};

export type AdminAssetDetail = AdminAssetRow & {
  description: string;
  jurisdiction: string;
  dealType: DealType;
  revenueCents: number | null;
  ebitdaCents: number | null;
  employees: number | null;
  yearFounded: number | null;
  validated: boolean;
  publishedAt: string | null;
};

export type ModLogEntry = {
  id: string;
  actorId: string;
  actorName: string | null;
  targetType: ModerationTargetType;
  targetId: string;
  targetLabel: string | null; // display_name for USER, "Asset #<ref>" for ASSET
  action: ModerationActionType;
  reason: string;
  createdAt: string;
};

type Paged<T> = { items: T[]; total: number };

// Escape ilike wildcards so a manager's `%`/`_` are treated literally (ADR-13).
function ilikePattern(raw: string): string {
  return `%${raw.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
}

function paginate<T>(rows: T[], page: number): Paged<T> {
  const from = (page - 1) * ADMIN_PAGE_SIZE;
  return { items: rows.slice(from, from + ADMIN_PAGE_SIZE), total: rows.length };
}

// ---------------------------------------------------------------------------
// Buyers — profiles (role BUYER) stitched with mandate + identity. At 20 rows the full
// fetch + JS filter/paginate is trivial and keeps the cross-table search simple (the same
// judgement ADR-16 makes for facet bucketing).
// ---------------------------------------------------------------------------

export async function listAdminBuyers(f: AdminBuyerFilters): Promise<Paged<AdminBuyerRow>> {
  const rows = await loadBuyerRows();
  const q = f.q?.toLowerCase() ?? null;
  const filtered = rows.filter(
    (r) =>
      (f.status === null || r.status === f.status) &&
      (f.listed === null || r.isListed === f.listed) &&
      (q === null ||
        r.displayName.toLowerCase().includes(q) ||
        (r.companyName?.toLowerCase().includes(q) ?? false) ||
        (r.headline?.toLowerCase().includes(q) ?? false)),
  );
  return paginate(filtered, f.page);
}

export async function getAdminBuyer(userId: string): Promise<AdminBuyerDetail | null> {
  const supabase = await createClient();
  const [{ data: profile }, { data: mandate }, { data: identity }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).eq("role", "BUYER").maybeSingle(),
    supabase.from("buyer_profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("buyer_identities").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  if (!profile) return null;
  return {
    userId: profile.id,
    displayName: profile.display_name,
    status: profile.status,
    companyName: identity?.company_name ?? null,
    headline: mandate?.headline ?? null,
    investorType: mandate?.investor_type ?? null,
    isListed: mandate?.is_listed ?? true,
    ticketMinCents: mandate?.ticket_min_cents ?? null,
    ticketMaxCents: mandate?.ticket_max_cents ?? null,
    categories: mandate?.categories ?? [],
    jurisdictions: mandate?.jurisdictions ?? [],
    dealTypes: mandate?.deal_types ?? [],
    website: identity?.website ?? null,
    contactName: identity?.contact_name ?? null,
  };
}

async function loadBuyerRows(): Promise<AdminBuyerRow[]> {
  const supabase = await createClient();
  const [{ data: profiles, error: pErr }, { data: mandates }, { data: identities }] =
    await Promise.all([
      supabase.from("profiles").select("id, display_name, status").eq("role", "BUYER").order("display_name"),
      supabase.from("buyer_profiles").select("user_id, headline, investor_type, is_listed, ticket_min_cents, ticket_max_cents"),
      supabase.from("buyer_identities").select("user_id, company_name"),
    ]);
  if (pErr) throw pErr;
  const mandateById = new Map((mandates ?? []).map((m) => [m.user_id, m]));
  const identityById = new Map((identities ?? []).map((i) => [i.user_id, i]));
  return (profiles ?? []).map((p) => {
    const m = mandateById.get(p.id);
    const i = identityById.get(p.id);
    return {
      userId: p.id,
      displayName: p.display_name,
      status: p.status,
      companyName: i?.company_name ?? null,
      headline: m?.headline ?? null,
      investorType: m?.investor_type ?? null,
      isListed: m?.is_listed ?? true,
      ticketMinCents: m?.ticket_min_cents ?? null,
      ticketMaxCents: m?.ticket_max_cents ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// Sellers — profiles (role SELLER) stitched with trading profile, identity, and a count of
// PUBLISHED assets (the F4 propagation number surfaced in the registry and the consequence
// panel).
// ---------------------------------------------------------------------------

export async function listAdminSellers(f: AdminSellerFilters): Promise<Paged<AdminSellerRow>> {
  const rows = await loadSellerRows();
  const q = f.q?.toLowerCase() ?? null;
  const filtered = rows.filter(
    (r) =>
      (f.status === null || r.status === f.status) &&
      (f.verified === null || r.verified === f.verified) &&
      (q === null ||
        r.displayName.toLowerCase().includes(q) ||
        (r.companyName?.toLowerCase().includes(q) ?? false) ||
        (r.headline?.toLowerCase().includes(q) ?? false)),
  );
  return paginate(filtered, f.page);
}

export async function getAdminSeller(userId: string): Promise<AdminSellerDetail | null> {
  const supabase = await createClient();
  const [{ data: profile }, { data: trading }, { data: identity }, publishedAssetCount] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).eq("role", "SELLER").maybeSingle(),
      supabase.from("seller_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("seller_identities").select("*").eq("user_id", userId).maybeSingle(),
      countSellerPublishedAssets(userId),
    ]);
  if (!profile) return null;
  return {
    userId: profile.id,
    displayName: profile.display_name,
    status: profile.status,
    companyName: identity?.company_name ?? null,
    headline: trading?.headline ?? null,
    jurisdiction: trading?.jurisdiction ?? null,
    verified: trading?.verified ?? false,
    publishedAssetCount,
    description: trading?.description ?? null,
    registrationNumber: identity?.registration_number ?? null,
    website: identity?.website ?? null,
    contactName: identity?.contact_name ?? null,
  };
}

async function loadSellerRows(): Promise<AdminSellerRow[]> {
  const supabase = await createClient();
  const [
    { data: profiles, error: pErr },
    { data: trading },
    { data: identities },
    { data: publishedAssets },
  ] = await Promise.all([
    supabase.from("profiles").select("id, display_name, status").eq("role", "SELLER").order("display_name"),
    supabase.from("seller_profiles").select("user_id, headline, jurisdiction, verified"),
    supabase.from("seller_identities").select("user_id, company_name"),
    supabase.from("assets").select("seller_id").eq("status", "PUBLISHED"),
  ]);
  if (pErr) throw pErr;
  const tradingById = new Map((trading ?? []).map((t) => [t.user_id, t]));
  const identityById = new Map((identities ?? []).map((i) => [i.user_id, i]));
  const publishedCount = new Map<string, number>();
  for (const a of publishedAssets ?? [])
    publishedCount.set(a.seller_id, (publishedCount.get(a.seller_id) ?? 0) + 1);
  return (profiles ?? []).map((p) => {
    const t = tradingById.get(p.id);
    const i = identityById.get(p.id);
    return {
      userId: p.id,
      displayName: p.display_name,
      status: p.status,
      companyName: i?.company_name ?? null,
      headline: t?.headline ?? null,
      jurisdiction: t?.jurisdiction ?? null,
      verified: t?.verified ?? false,
      publishedAssetCount: publishedCount.get(p.id) ?? 0,
    };
  });
}

// The F4 consequence number: how many PUBLISHED listings a seller has (and therefore how
// many leave the public catalogue the moment the seller is suspended — no cascading writes).
export async function countSellerPublishedAssets(sellerId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("assets")
    .select("*", { count: "exact", head: true })
    .eq("seller_id", sellerId)
    .eq("status", "PUBLISHED");
  if (error) throw error;
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Assets — every status (a manager sees DRAFT/SUSPENDED/SOLD, unlike the public catalogue).
// Base-table filtering + range paging mirrors listAssets; seller labels are stitched for the
// page.
// ---------------------------------------------------------------------------

export async function listAdminAssets(f: AdminAssetFilters): Promise<Paged<AdminAssetRow>> {
  const supabase = await createClient();
  const from = (f.page - 1) * ADMIN_PAGE_SIZE;
  const to = from + ADMIN_PAGE_SIZE - 1;

  let query = supabase.from("assets").select("*", { count: "exact" });
  if (f.status) query = query.eq("status", f.status);
  if (f.category) query = query.eq("category", f.category);
  if (f.q) {
    const pattern = ilikePattern(f.q);
    const ors = [`title.ilike."${pattern}"`, `description.ilike."${pattern}"`];
    const ref = Number(f.q.replace(/^[\s#]*asset\b/i, "").replace(/^[\s#]+/, "").trim());
    if (Number.isInteger(ref) && ref > 0) ors.push(`public_ref.eq.${ref}`);
    query = query.or(ors.join(","));
  }
  query = query.order("public_ref", { ascending: false });

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;
  const assets = data ?? [];
  const labels = await sellerLabels(assets.map((a) => a.seller_id));
  return {
    items: assets.map((a) => toAdminAssetRow(a, labels)),
    total: count ?? 0,
  };
}

export async function getAdminAssetByRef(ref: number): Promise<AdminAssetDetail | null> {
  if (!Number.isInteger(ref)) return null;
  const supabase = await createClient();
  const { data: asset, error } = await supabase
    .from("assets")
    .select("*")
    .eq("public_ref", ref)
    .maybeSingle();
  if (error) throw error;
  if (!asset) return null;
  const labels = await sellerLabels([asset.seller_id]);
  return {
    ...toAdminAssetRow(asset, labels),
    description: asset.description,
    jurisdiction: asset.jurisdiction,
    dealType: asset.deal_type,
    revenueCents: asset.revenue_cents,
    ebitdaCents: asset.ebitda_cents,
    employees: asset.employees,
    yearFounded: asset.year_founded,
    validated: asset.validated,
    publishedAt: asset.published_at,
  };
}

// A seller's own listings, any status — shown on the seller detail page so a manager sees
// exactly what a suspension takes out of (or a reactivation restores to) the catalogue.
export async function listSellerAssets(sellerId: string): Promise<AdminAssetRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("seller_id", sellerId)
    .order("public_ref", { ascending: false });
  if (error) throw error;
  const labels = await sellerLabels([sellerId]);
  return (data ?? []).map((a) => toAdminAssetRow(a, labels));
}

type SellerLabel = { displayName: string | null; status: AccountStatus | null; companyName: string | null };

async function sellerLabels(sellerIds: string[]): Promise<Map<string, SellerLabel>> {
  const unique = [...new Set(sellerIds)];
  const map = new Map<string, SellerLabel>();
  if (unique.length === 0) return map;
  const supabase = await createClient();
  const [{ data: profiles }, { data: identities }] = await Promise.all([
    supabase.from("profiles").select("id, display_name, status").in("id", unique),
    supabase.from("seller_identities").select("user_id, company_name").in("user_id", unique),
  ]);
  const companyById = new Map((identities ?? []).map((i) => [i.user_id, i.company_name]));
  for (const p of profiles ?? [])
    map.set(p.id, {
      displayName: p.display_name,
      status: p.status,
      companyName: companyById.get(p.id) ?? null,
    });
  return map;
}

function toAdminAssetRow(a: Tables<"assets">, labels: Map<string, SellerLabel>): AdminAssetRow {
  const label = labels.get(a.seller_id);
  return {
    id: a.id,
    publicRef: a.public_ref,
    title: a.title,
    category: a.category,
    status: a.status,
    askingPriceCents: a.asking_price_cents,
    sellerId: a.seller_id,
    sellerDisplayName: label?.displayName ?? null,
    sellerStatus: label?.status ?? null,
    sellerCompanyName: label?.companyName ?? null,
  };
}

// ---------------------------------------------------------------------------
// Moderation log — the audit trail (modlog_read_manager). Actor and the polymorphic target
// (target_id has no FK) are resolved to labels in keyed follow-up queries. Passing targetId
// scopes it to one participant/asset for the per-target history on a detail page.
// ---------------------------------------------------------------------------

export async function listModerationLog(
  f: ModLogFilters & { targetId?: string },
): Promise<Paged<ModLogEntry>> {
  const supabase = await createClient();
  const from = (f.page - 1) * ADMIN_PAGE_SIZE;
  const to = from + ADMIN_PAGE_SIZE - 1;

  let query = supabase.from("moderation_log").select("*", { count: "exact" });
  if (f.action) query = query.eq("action", f.action);
  if (f.targetType) query = query.eq("target_type", f.targetType);
  if (f.targetId) query = query.eq("target_id", f.targetId);
  query = query.order("created_at", { ascending: false });

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;
  const rows = data ?? [];

  const actorIds = rows.map((r) => r.actor_id);
  const userTargetIds = rows.filter((r) => r.target_type === "USER").map((r) => r.target_id);
  const assetTargetIds = rows.filter((r) => r.target_type === "ASSET").map((r) => r.target_id);

  const [{ data: actors }, { data: userTargets }, { data: assetTargets }] = await Promise.all([
    supabase.from("profiles").select("id, display_name").in("id", [...new Set(actorIds)]),
    userTargetIds.length
      ? supabase.from("profiles").select("id, display_name").in("id", [...new Set(userTargetIds)])
      : Promise.resolve({ data: [] as { id: string; display_name: string }[] }),
    assetTargetIds.length
      ? supabase.from("assets").select("id, public_ref").in("id", [...new Set(assetTargetIds)])
      : Promise.resolve({ data: [] as { id: string; public_ref: number }[] }),
  ]);

  const actorName = new Map((actors ?? []).map((a) => [a.id, a.display_name]));
  const userName = new Map((userTargets ?? []).map((u) => [u.id, u.display_name]));
  const assetRef = new Map((assetTargets ?? []).map((a) => [a.id, a.public_ref]));

  const items: ModLogEntry[] = rows.map((r) => ({
    id: r.id,
    actorId: r.actor_id,
    actorName: actorName.get(r.actor_id) ?? null,
    targetType: r.target_type as ModerationTargetType,
    targetId: r.target_id,
    targetLabel:
      r.target_type === "ASSET"
        ? assetRef.has(r.target_id)
          ? `Asset #${assetRef.get(r.target_id)}`
          : null
        : userName.get(r.target_id) ?? null,
    action: r.action,
    reason: r.reason,
    createdAt: r.created_at,
  }));
  return { items, total: count ?? 0 };
}
