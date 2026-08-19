"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  upsertMySellerProfile,
  upsertMySellerIdentity,
} from "@/lib/db/seller";

// Seller profile editing (brief §6): the public trading profile and the private legal identity are
// edited together but stored in two tables (ADR-10). zod parses at the boundary (ADR-12).

const sellerProfileSchema = z.object({
  // Public — seller_profiles (anonymous, always readable)
  headline: z.string().trim().min(1).max(200),
  jurisdiction: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/)
    .transform((s) => s.toUpperCase()),
  description: z.string().trim().max(4000),
  // Private — seller_identities (revealed to a counterparty only on ACCEPTED, by RLS)
  companyName: z.string().trim().min(1).max(200),
  registrationNumber: z.string().trim().max(100),
  website: z.string().trim().max(200),
  contactName: z.string().trim().max(200),
});

export type SellerProfileResult =
  | { ok: true }
  | { ok: false; error: "INVALID" | "UNKNOWN" };

const nz = (s: string): string | null => (s.length ? s : null);

export async function updateMySellerProfile(
  input: unknown,
): Promise<SellerProfileResult> {
  const parsed = sellerProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID" };
  const d = parsed.data;

  const profileRes = await upsertMySellerProfile({
    headline: d.headline,
    jurisdiction: d.jurisdiction,
    description: nz(d.description),
  });
  if (!profileRes.ok) return { ok: false, error: "UNKNOWN" };

  const identityRes = await upsertMySellerIdentity({
    companyName: d.companyName,
    registrationNumber: nz(d.registrationNumber),
    website: nz(d.website),
    contactName: nz(d.contactName),
  });
  if (!identityRes.ok) return { ok: false, error: "UNKNOWN" };

  revalidatePath("/profile");
  revalidatePath("/seller");
  revalidatePath("/assets"); // headline shows in the public listing's seller section
  return { ok: true };
}
