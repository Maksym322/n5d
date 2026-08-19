"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/db/session";
import { createAdminClient } from "@/lib/supabase/admin";

// Platform Manager mutations (F4). These are the ONE sanctioned second home for the service-
// role key (ADR-2): the client bypasses RLS, so the manager check cannot live in a policy —
// the explicit role assertion below IS the gate. Every action writes a moderation_log row
// with a reason of at least 10 characters (D3). The log write happens FIRST, so nothing is
// mutated without an attributable, logged reason.

const reasonSchema = z.string().trim().min(10).max(500);

const participantSchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(["SUSPEND", "REACTIVATE"]),
  reason: reasonSchema,
});

const assetSchema = z.object({
  assetId: z.string().uuid(),
  action: z.enum(["SUSPEND_ASSET", "REPUBLISH_ASSET"]),
  reason: reasonSchema,
});

export type ModerationResult =
  | { ok: true }
  | {
      ok: false;
      error: "NOT_MANAGER" | "NOT_ALLOWED" | "REASON_TOO_SHORT" | "INVALID" | "UNKNOWN";
    };

// A zod failure whose only problem is the reason maps to the same form error as the DB
// CHECK backstop, so the 10-char rule reads identically whether it trips client-side, in
// the action, or at the database.
function zodError(err: z.ZodError): "REASON_TOO_SHORT" | "INVALID" {
  return err.issues.every((i) => i.path[0] === "reason") ? "REASON_TOO_SHORT" : "INVALID";
}

async function assertManager(): Promise<{ id: string } | null> {
  const user = await requireUser();
  if (user.app_metadata?.role !== "MANAGER") return null;
  return { id: user.id };
}

// Suspend / reactivate a participant. Suspending a seller removes their PUBLISHED assets from
// the public catalogue with no cascading writes — assets_read_published checks the seller's
// status at read time (F4). is_active() then blocks all of that user's writes (F5).
export async function moderateParticipant(input: unknown): Promise<ModerationResult> {
  const parsed = participantSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodError(parsed.error) };
  const { userId, action, reason } = parsed.data;

  const manager = await assertManager();
  if (!manager) return { ok: false, error: "NOT_MANAGER" };

  // Self-moderation guard: a manager must not suspend their own account or another manager's,
  // which could lock every manager out with no non-SQL way back.
  if (userId === manager.id) return { ok: false, error: "NOT_ALLOWED" };

  const db = createAdminClient();
  const { data: target } = await db
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (!target || target.role === "MANAGER") return { ok: false, error: "NOT_ALLOWED" };

  const logged = await db.from("moderation_log").insert({
    actor_id: manager.id,
    target_type: "USER",
    target_id: userId,
    action,
    reason,
  });
  if (logged.error) {
    if (logged.error.code === "23514") return { ok: false, error: "REASON_TOO_SHORT" };
    return { ok: false, error: "UNKNOWN" };
  }

  const status = action === "SUSPEND" ? "SUSPENDED" : "ACTIVE";
  const { error } = await db.from("profiles").update({ status }).eq("id", userId);
  if (error) return { ok: false, error: "UNKNOWN" };

  revalidatePath("/admin", "layout");
  revalidatePath("/assets");
  return { ok: true };
}

// Suspend / republish a single asset. SUSPEND_ASSET applies only to a PUBLISHED listing and
// REPUBLISH_ASSET only to a SUSPENDED one, so this path never turns a DRAFT/SOLD asset public
// behind the seller's back.
export async function moderateAsset(input: unknown): Promise<ModerationResult> {
  const parsed = assetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodError(parsed.error) };
  const { assetId, action, reason } = parsed.data;

  const manager = await assertManager();
  if (!manager) return { ok: false, error: "NOT_MANAGER" };

  const db = createAdminClient();
  const { data: asset } = await db
    .from("assets")
    .select("status")
    .eq("id", assetId)
    .maybeSingle();
  if (!asset) return { ok: false, error: "NOT_ALLOWED" };
  const expected = action === "SUSPEND_ASSET" ? "PUBLISHED" : "SUSPENDED";
  if (asset.status !== expected) return { ok: false, error: "NOT_ALLOWED" };

  const logged = await db.from("moderation_log").insert({
    actor_id: manager.id,
    target_type: "ASSET",
    target_id: assetId,
    action,
    reason,
  });
  if (logged.error) {
    if (logged.error.code === "23514") return { ok: false, error: "REASON_TOO_SHORT" };
    return { ok: false, error: "UNKNOWN" };
  }

  const status = action === "SUSPEND_ASSET" ? "SUSPENDED" : "PUBLISHED";
  const { error } = await db.from("assets").update({ status }).eq("id", assetId);
  if (error) return { ok: false, error: "UNKNOWN" };

  revalidatePath("/admin", "layout");
  revalidatePath("/assets");
  return { ok: true };
}
