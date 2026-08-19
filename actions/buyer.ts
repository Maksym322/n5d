"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Constants } from "@/lib/types/database";
import { upsertMyBuyerProfile } from "@/lib/db/buyer";

// Every mutation is a Server Action with zod parsed at the boundary (ADR-12).
const mandateSchema = z
  .object({
    headline: z.string().trim().min(1).max(200),
    investorType: z.enum(Constants.public.Enums.investor_type),
    categories: z.array(z.enum(Constants.public.Enums.asset_category)),
    jurisdictions: z.array(
      z
        .string()
        .trim()
        .regex(/^[A-Za-z]{2}$/)
        .transform((s) => s.toUpperCase()),
    ),
    dealTypes: z.array(z.enum(Constants.public.Enums.deal_type)),
    ticketMinCents: z.number().int().nonnegative().nullable(),
    ticketMaxCents: z.number().int().nonnegative().nullable(),
    isListed: z.boolean(),
  })
  .refine(
    (v) =>
      v.ticketMinCents === null ||
      v.ticketMaxCents === null ||
      v.ticketMinCents <= v.ticketMaxCents,
    { path: ["ticketMaxCents"], message: "TICKET_RANGE_INVALID" },
  );

export type MandateResult =
  | { ok: true }
  | { ok: false; error: "TICKET_RANGE_INVALID" | "INVALID" | "UNKNOWN" };

export async function updateMyBuyerProfile(input: unknown): Promise<MandateResult> {
  const parsed = mandateSchema.safeParse(input);
  if (!parsed.success) {
    const isRange = parsed.error.issues.some(
      (i) => i.message === "TICKET_RANGE_INVALID",
    );
    return { ok: false, error: isRange ? "TICKET_RANGE_INVALID" : "INVALID" };
  }

  // The DB CHECK constraint is the backstop (defence in depth).
  const res = await upsertMyBuyerProfile(parsed.data);
  if (res.ok) {
    revalidatePath("/profile");
    revalidatePath("/assets");
  }
  return res;
}
