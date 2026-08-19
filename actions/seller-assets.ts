"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Constants } from "@/lib/types/database";
import {
  createAsset,
  updateAsset,
  setAssetStatus,
  type AssetWriteInput,
} from "@/lib/db/seller-assets";

// Asset publishing (F2): create/edit through a DRAFT → PUBLISHED flow. zod parses at the boundary
// (ADR-12). Money arrives already in cents — the form converts euros → cents client-side, matching
// the mandate-form pattern (ADR-4). The DB CHECK constraints are the backstop.

const nullableCents = z.number().int().nonnegative().nullable();

const priceHistoryPoint = z.object({
  year: z.number().int().min(1800).max(2100),
  valueCents: z.number().int().nonnegative(),
});

const assetSchema = z.object({
  id: z.string().uuid().nullable().optional(), // present → update; absent → create
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(4000),
  category: z.enum(Constants.public.Enums.asset_category),
  jurisdiction: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/)
    .transform((s) => s.toUpperCase()),
  dealType: z.enum(Constants.public.Enums.deal_type),
  revenueCents: nullableCents,
  ebitdaCents: nullableCents,
  askingPriceCents: nullableCents,
  employees: z.number().int().nonnegative().nullable(),
  yearFounded: z.number().int().min(1800).max(2100).nullable(),
  highlights: z.array(z.string().trim().min(1).max(120)).max(12),
  priceHistory: z.array(priceHistoryPoint).length(6),
});

export type SaveAssetResult =
  | { ok: true; id: string; publicRef: number }
  | { ok: false; error: "CHECK_FAILED" | "NOT_ALLOWED" | "INVALID" | "UNKNOWN" };

function revalidateAsset(publicRef: number) {
  revalidatePath("/seller");
  revalidatePath("/assets");
  revalidatePath(`/assets/${publicRef}`);
  revalidatePath(`/seller/assets/${publicRef}/edit`);
}

export async function saveAsset(input: unknown): Promise<SaveAssetResult> {
  const parsed = assetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID" };
  const { id, ...fields } = parsed.data;

  const write: AssetWriteInput = {
    title: fields.title,
    description: fields.description,
    category: fields.category,
    jurisdiction: fields.jurisdiction,
    dealType: fields.dealType,
    revenueCents: fields.revenueCents,
    ebitdaCents: fields.ebitdaCents,
    askingPriceCents: fields.askingPriceCents,
    employees: fields.employees,
    yearFounded: fields.yearFounded,
    highlights: fields.highlights,
    priceHistory: fields.priceHistory.map((p) => ({
      year: p.year,
      valueCents: p.valueCents,
    })),
  };

  const res = id ? await updateAsset(id, write) : await createAsset(write);
  if (res.ok) revalidateAsset(res.publicRef);
  return res;
}

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["DRAFT", "PUBLISHED", "SOLD"]),
});

// Status transition from the dashboard / edit page (publish a draft, withdraw to draft, mark sold).
export async function changeAssetStatus(input: unknown): Promise<SaveAssetResult> {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID" };
  const res = await setAssetStatus(parsed.data.id, parsed.data.status);
  if (res.ok) revalidateAsset(res.publicRef);
  return res;
}
