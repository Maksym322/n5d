import type { Enums } from "@/lib/types/database";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/db/session";
import type { AssetCategory, DealType } from "@/lib/db/assets";

export type InvestorType = Enums<"investor_type">;

export type BuyerMandate = {
  userId: string;
  headline: string;
  investorType: InvestorType;
  categories: AssetCategory[];
  jurisdictions: string[];
  dealTypes: DealType[];
  ticketMinCents: number | null;
  ticketMaxCents: number | null;
  isListed: boolean;
};

export type BuyerMandateInput = Omit<BuyerMandate, "userId">;

export async function getMyBuyerProfile(): Promise<BuyerMandate | null> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("buyer_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    userId: data.user_id,
    headline: data.headline,
    investorType: data.investor_type,
    categories: data.categories,
    jurisdictions: data.jurisdictions,
    dealTypes: data.deal_types,
    ticketMinCents: data.ticket_min_cents,
    ticketMaxCents: data.ticket_max_cents,
    isListed: data.is_listed,
  };
}

// Write helper called by the Server Action. RLS buyer_profile_write_own + is_active()
// gate the write; the ticket_range_valid CHECK (23514) is the DB backstop for min<=max.
export async function upsertMyBuyerProfile(
  input: BuyerMandateInput,
): Promise<{ ok: true } | { ok: false; error: "TICKET_RANGE_INVALID" | "UNKNOWN" }> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("buyer_profiles").upsert({
    user_id: user.id,
    headline: input.headline,
    investor_type: input.investorType,
    categories: input.categories,
    jurisdictions: input.jurisdictions,
    deal_types: input.dealTypes,
    ticket_min_cents: input.ticketMinCents,
    ticket_max_cents: input.ticketMaxCents,
    is_listed: input.isListed,
  });
  if (error) {
    if (error.code === "23514") return { ok: false, error: "TICKET_RANGE_INVALID" };
    return { ok: false, error: "UNKNOWN" };
  }
  return { ok: true };
}
