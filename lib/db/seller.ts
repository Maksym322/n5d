import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/db/session";

// The seller's own profile, split across two tables (ADR-10, DATA-MODEL §1): the public trading
// profile (anonymous, always readable) and the private identity (revealed to a counterparty only on
// an ACCEPTED conversation, by RLS). This is the seller mirror of lib/db/buyer.ts.

export type SellerProfile = {
  headline: string;
  jurisdiction: string; // ISO alpha-2
  description: string | null;
};

export type SellerIdentity = {
  companyName: string;
  registrationNumber: string | null;
  website: string | null;
  contactName: string | null;
};

export type SellerProfileFull = {
  profile: SellerProfile | null;
  identity: SellerIdentity | null;
};

export async function getMySellerProfile(): Promise<SellerProfileFull> {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: profile, error: pErr }, { data: identity, error: iErr }] =
    await Promise.all([
      supabase
        .from("seller_profiles")
        .select("headline, jurisdiction, description")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("seller_identities")
        .select("company_name, registration_number, website, contact_name")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
  if (pErr) throw pErr;
  if (iErr) throw iErr;

  return {
    profile: profile
      ? {
          headline: profile.headline,
          jurisdiction: profile.jurisdiction,
          description: profile.description,
        }
      : null,
    identity: identity
      ? {
          companyName: identity.company_name,
          registrationNumber: identity.registration_number,
          website: identity.website,
          contactName: identity.contact_name,
        }
      : null,
  };
}

type WriteResult = { ok: true } | { ok: false; error: "UNKNOWN" };

// RLS seller_profile_write_own + is_active() gate the write. `verified` is never written here — it
// is a KYC stub set by seeding/moderation (DATA-MODEL §3.2), not self-editable.
export async function upsertMySellerProfile(
  input: SellerProfile,
): Promise<WriteResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("seller_profiles").upsert({
    user_id: user.id,
    headline: input.headline,
    jurisdiction: input.jurisdiction,
    description: input.description,
  });
  if (error) return { ok: false, error: "UNKNOWN" };
  return { ok: true };
}

// RLS seller_identity_write_own + is_active() gate the write.
export async function upsertMySellerIdentity(
  input: SellerIdentity,
): Promise<WriteResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("seller_identities").upsert({
    user_id: user.id,
    company_name: input.companyName,
    registration_number: input.registrationNumber,
    website: input.website,
    contact_name: input.contactName,
  });
  if (error) return { ok: false, error: "UNKNOWN" };
  return { ok: true };
}
