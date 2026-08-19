import type { Enums, Tables, TablesInsert } from "@/lib/types/database";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/db/session";
import { toPricePoints } from "@/lib/db/asset-filters";
import type {
  AssetCategory,
  AssetListItem,
  DealType,
  PricePoint,
} from "@/lib/db/assets";

// Seller-owned asset access (F2). Reads return the seller's own rows in ANY status — RLS
// assets_write_own / seller_id = auth.uid() grants that, whereas the public catalogue in
// lib/db/assets.ts is scoped to PUBLISHED. Writes are gated by RLS + is_active(); the DB CHECK
// constraints (year_founded_sane, non-negative money) are the backstop.

export type AssetStatus = Enums<"asset_status">;

export type MyAsset = AssetListItem & { status: AssetStatus };
export type MyAssetDetail = MyAsset & { description: string };

// The editable field set (DATA-MODEL §3.6). Money is `number` cents (ADR-4); the Server Action
// converts euros → cents before calling here.
export type AssetWriteInput = {
  title: string;
  description: string;
  category: AssetCategory;
  jurisdiction: string;
  dealType: DealType;
  revenueCents: number | null;
  ebitdaCents: number | null;
  askingPriceCents: number | null;
  employees: number | null;
  yearFounded: number | null;
  highlights: string[];
  priceHistory: PricePoint[];
};

export type AssetWriteResult =
  | { ok: true; id: string; publicRef: number }
  | { ok: false; error: "CHECK_FAILED" | "NOT_ALLOWED" | "UNKNOWN" };

function toMyAsset(row: Tables<"assets">): MyAsset {
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
    status: row.status,
  };
}

// price_history is stored as [{ year, value_cents }] JSONB (DATA-MODEL §3.6).
function toPriceHistoryJson(points: PricePoint[]): TablesInsert<"assets">["price_history"] {
  return points.map((p) => ({ year: p.year, value_cents: p.valueCents }));
}

function mapWriteError(code: string | undefined): AssetWriteResult {
  if (code === "23514") return { ok: false, error: "CHECK_FAILED" }; // a CHECK constraint failed
  if (code === "42501") return { ok: false, error: "NOT_ALLOWED" }; // RLS / is_active
  return { ok: false, error: "UNKNOWN" };
}

export async function listMyAssets(): Promise<MyAsset[]> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toMyAsset);
}

export async function getMyAssetByRef(ref: number): Promise<MyAssetDetail | null> {
  if (!Number.isInteger(ref)) return null;
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("public_ref", ref)
    .eq("seller_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ...toMyAsset(data), description: data.description };
}

// Create as DRAFT. Publishing is a separate transition (setAssetStatus) so the set_published_at
// UPDATE trigger stays the single authority on published_at.
export async function createAsset(input: AssetWriteInput): Promise<AssetWriteResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assets")
    .insert({
      seller_id: user.id,
      status: "DRAFT",
      title: input.title,
      description: input.description,
      category: input.category,
      jurisdiction: input.jurisdiction,
      deal_type: input.dealType,
      revenue_cents: input.revenueCents,
      ebitda_cents: input.ebitdaCents,
      asking_price_cents: input.askingPriceCents,
      employees: input.employees,
      year_founded: input.yearFounded,
      highlights: input.highlights,
      price_history: toPriceHistoryJson(input.priceHistory),
    })
    .select("id, public_ref")
    .single();
  if (error) return mapWriteError(error.code);
  return { ok: true, id: data.id, publicRef: data.public_ref };
}

export async function updateAsset(
  id: string,
  input: AssetWriteInput,
): Promise<AssetWriteResult> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assets")
    .update({
      title: input.title,
      description: input.description,
      category: input.category,
      jurisdiction: input.jurisdiction,
      deal_type: input.dealType,
      revenue_cents: input.revenueCents,
      ebitda_cents: input.ebitdaCents,
      asking_price_cents: input.askingPriceCents,
      employees: input.employees,
      year_founded: input.yearFounded,
      highlights: input.highlights,
      price_history: toPriceHistoryJson(input.priceHistory),
    })
    .eq("id", id)
    .select("id, public_ref")
    .single();
  if (error) return mapWriteError(error.code);
  return { ok: true, id: data.id, publicRef: data.public_ref };
}

// Status transitions the seller controls: DRAFT ↔ PUBLISHED and → SOLD. SUSPENDED is deliberately
// excluded — that is a moderation action through the service role (ADR-2), not a seller action.
// DRAFT → PUBLISHED fires the set_published_at trigger, which stamps published_at once.
export async function setAssetStatus(
  id: string,
  status: "DRAFT" | "PUBLISHED" | "SOLD",
): Promise<AssetWriteResult> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assets")
    .update({ status })
    .eq("id", id)
    .select("id, public_ref")
    .single();
  if (error) return mapWriteError(error.code);
  return { ok: true, id: data.id, publicRef: data.public_ref };
}
