/**
 * Reset the demo to its exact seeded state. Two responsibilities:
 *   1. Delete conversations and messages a user created while clicking around (anything whose id
 *      is not a deterministic seed fixture).
 *   2. FORCE every seeded row's mutable status back to its fixture value — conversation status +
 *      responded_at, asset status, and profile status. Deleting strays alone is not enough: an
 *      accepted thread, a suspended asset or a suspended participant keeps its changed status
 *      because the seed's inserts are existence-guarded (it never updates a row that already
 *      exists). A demo recording has to start from a known state, so the reset makes that state
 *      exact. `npm run seed:reset` then re-runs the seed to recreate anything missing.
 *
 * Run:  npm run seed:reset   (loads .env.local; needs SUPABASE_SERVICE_ROLE_KEY)
 */
import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SEEDED_ACCOUNTS } from "../../lib/demo-accounts";
import {
  ASSET_COUNT,
  assetId,
  CONV_DEFS,
  convId,
  respondedAtFor,
  seededAssetStatus,
  SEEDED_CONVERSATION_IDS,
  SEEDED_MESSAGE_IDS,
} from "./fixtures";

config({ path: ".env.local" });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SECRET) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
}

const db: SupabaseClient = createClient(URL, SECRET, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const inList = (ids: string[]): string => `(${ids.join(",")})`;

function fail(label: string, error: { message: string } | null): void {
  if (error) throw new Error(`${label}: ${error.message}`);
}

async function loadUserIds(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let page = 1;
  for (;;) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    fail("listUsers", error);
    for (const u of data.users) if (u.email) map.set(u.email.toLowerCase(), u.id);
    if (data.users.length < 200) break;
    page += 1;
  }
  return map;
}

async function main(): Promise<void> {
  // --- 1. Remove user-created rows ------------------------------------------------------------
  // Messages a user added to a seeded thread (not part of the scripted set).
  const msg = await db
    .from("messages")
    .delete({ count: "exact" })
    .not("id", "in", inList(SEEDED_MESSAGE_IDS));
  fail("delete messages", msg.error);

  // Conversations a user created (ON DELETE CASCADE clears any remaining messages).
  const conv = await db
    .from("conversations")
    .delete({ count: "exact" })
    .not("id", "in", inList(SEEDED_CONVERSATION_IDS));
  fail("delete conversations", conv.error);

  // --- 2. Force seeded rows back to their fixture status --------------------------------------
  // Conversations: status + responded_at, grouped by fixture status (one update per status).
  for (const status of ["ACCEPTED", "DECLINED", "PENDING"] as const) {
    const ids = CONV_DEFS.filter((c) => c.status === status).map((c) => convId(c.key));
    if (!ids.length) continue;
    fail(
      `restore conversations ${status}`,
      (
        await db
          .from("conversations")
          .update({ status, responded_at: respondedAtFor(status) })
          .in("id", ids)
      ).error,
    );
  }

  // Assets: status, grouped (undoes a manager suspend/republish that moved a listing off fixture).
  const assetIdsByStatus = new Map<string, string[]>();
  for (let i = 0; i < ASSET_COUNT; i += 1) {
    const status = seededAssetStatus(i);
    assetIdsByStatus.set(status, [...(assetIdsByStatus.get(status) ?? []), assetId(i)]);
  }
  for (const [status, ids] of assetIdsByStatus) {
    fail(
      `restore assets ${status}`,
      (await db.from("assets").update({ status }).in("id", ids)).error,
    );
  }

  // Profiles: status (undoes a suspend/reactivate). Ids come from the auth user list keyed by the
  // canonical demo emails.
  const emailToId = await loadUserIds();
  for (const status of ["ACTIVE", "SUSPENDED"] as const) {
    const ids = SEEDED_ACCOUNTS.filter((a) => a.status === status)
      .map((a) => emailToId.get(a.email.toLowerCase()))
      .filter((id): id is string => Boolean(id));
    if (!ids.length) continue;
    fail(
      `restore profiles ${status}`,
      (await db.from("profiles").update({ status }).in("id", ids)).error,
    );
  }

  console.log(
    `Reset: removed ${conv.count ?? 0} user conversation(s) and ${msg.count ?? 0} stray message(s); ` +
      `forced seeded conversation/asset/profile status back to fixture. Restoring seed…`,
  );
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
