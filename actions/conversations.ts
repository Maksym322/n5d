"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/db/session";

// ---------------------------------------------------------------------------
// Contact request (F1) — buyer opens a PENDING conversation with one opening message.
// ---------------------------------------------------------------------------

const contactSchema = z.object({
  sellerId: z.string().uuid(),
  assetId: z.string().uuid().nullable(),
  openingMessage: z.string().trim().min(1).max(4000),
});

export type ContactResult =
  | { ok: true; conversationId: string }
  | {
      ok: false;
      error: "QUOTA_EXCEEDED" | "ALREADY_EXISTS" | "NOT_ALLOWED" | "INVALID" | "UNKNOWN";
    };

export async function createContactRequest(input: unknown): Promise<ContactResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID" };
  const { sellerId, assetId, openingMessage } = parsed.data;

  const user = await requireUser();
  const supabase = await createClient();

  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .insert({
      buyer_id: user.id,
      seller_id: sellerId,
      asset_id: assetId,
      initiated_by: user.id,
      status: "PENDING",
    })
    .select("id")
    .single();

  if (convErr) {
    // Quota trigger raises P0001 with CONTACT_QUOTA_EXCEEDED (DATA-MODEL §6).
    if (convErr.code === "P0001" && convErr.message.includes("CONTACT_QUOTA_EXCEEDED"))
      return { ok: false, error: "QUOTA_EXCEEDED" };
    if (convErr.code === "23505") return { ok: false, error: "ALREADY_EXISTS" }; // unique pair
    if (convErr.code === "42501") return { ok: false, error: "NOT_ALLOWED" }; // RLS / is_active
    return { ok: false, error: "UNKNOWN" };
  }

  // The initiator may post one opening message before acceptance (RLS msg_insert_accepted).
  const { error: msgErr } = await supabase
    .from("messages")
    .insert({ conversation_id: conv.id, sender_id: user.id, body: openingMessage });
  if (msgErr) return { ok: false, error: "UNKNOWN" };

  revalidatePath("/messages");
  return { ok: true, conversationId: conv.id };
}

// ---------------------------------------------------------------------------
// Send message — RLS gates ACCEPTED-or-initiator + is_active (F1/F2).
// ---------------------------------------------------------------------------

const sendSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
});

export type SendResult =
  | { ok: true }
  | { ok: false; error: "NOT_ALLOWED" | "INVALID" | "UNKNOWN" };

export async function sendMessage(input: unknown): Promise<SendResult> {
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID" };

  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from("messages").insert({
    conversation_id: parsed.data.conversationId,
    sender_id: user.id,
    body: parsed.data.body,
  });
  if (error) {
    if (error.code === "42501") return { ok: false, error: "NOT_ALLOWED" };
    return { ok: false, error: "UNKNOWN" };
  }

  revalidatePath(`/messages/${parsed.data.conversationId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Respond to an incoming request (F2/F3) — the recipient accepts or declines. On ACCEPTED both
// identities reveal simultaneously (ADR-11) with no extra writes: RLS on the *_identities tables
// opens the moment status flips. DECLINE frees the initiator's quota (status leaves PENDING).
// RLS conv_respond enforces party-but-not-initiator + is_active.
// ---------------------------------------------------------------------------

const respondSchema = z.object({
  conversationId: z.string().uuid(),
  decision: z.enum(["ACCEPT", "DECLINE"]),
});

export type RespondResult =
  | { ok: true }
  | { ok: false; error: "NOT_ALLOWED" | "INVALID" | "UNKNOWN" };

export async function respondToRequest(input: unknown): Promise<RespondResult> {
  const parsed = respondSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID" };

  await requireUser();
  const supabase = await createClient();

  const status = parsed.data.decision === "ACCEPT" ? "ACCEPTED" : "DECLINED";
  const { error } = await supabase
    .from("conversations")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("id", parsed.data.conversationId);
  if (error) {
    if (error.code === "42501") return { ok: false, error: "NOT_ALLOWED" };
    return { ok: false, error: "UNKNOWN" };
  }

  revalidatePath("/messages");
  revalidatePath(`/messages/${parsed.data.conversationId}`);
  revalidatePath("/seller");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Seller-initiated contact (F3) — the mirror of createContactRequest with the roles swapped: the
// seller opens a PENDING thread with a buyer (no asset) plus one opening message. Symmetric quota
// (D5) via the same trigger on initiated_by.
// ---------------------------------------------------------------------------

const sellerContactSchema = z.object({
  buyerId: z.string().uuid(),
  openingMessage: z.string().trim().min(1).max(4000),
});

export async function createSellerContactRequest(
  input: unknown,
): Promise<ContactResult> {
  const parsed = sellerContactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID" };
  const { buyerId, openingMessage } = parsed.data;

  const user = await requireUser();
  const supabase = await createClient();

  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .insert({
      buyer_id: buyerId,
      seller_id: user.id,
      asset_id: null,
      initiated_by: user.id,
      status: "PENDING",
    })
    .select("id")
    .single();

  if (convErr) {
    if (convErr.code === "P0001" && convErr.message.includes("CONTACT_QUOTA_EXCEEDED"))
      return { ok: false, error: "QUOTA_EXCEEDED" };
    if (convErr.code === "23505") return { ok: false, error: "ALREADY_EXISTS" };
    if (convErr.code === "42501") return { ok: false, error: "NOT_ALLOWED" };
    return { ok: false, error: "UNKNOWN" };
  }

  const { error: msgErr } = await supabase
    .from("messages")
    .insert({ conversation_id: conv.id, sender_id: user.id, body: openingMessage });
  if (msgErr) return { ok: false, error: "UNKNOWN" };

  revalidatePath("/messages");
  return { ok: true, conversationId: conv.id };
}
