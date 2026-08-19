/**
 * Reset the demo to its exact seeded state. Removes conversations and messages that a user
 * created while clicking around (anything whose id is not a deterministic seed fixture), then
 * `npm run seed:reset` re-runs the seed to restore the canonical rows and mandates.
 *
 * Run:  npm run seed:reset   (loads .env.local; needs SUPABASE_SERVICE_ROLE_KEY)
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { SEEDED_CONVERSATION_IDS, SEEDED_MESSAGE_IDS } from "./fixtures";

config({ path: ".env.local" });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SECRET) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
}

const db = createClient(URL, SECRET, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const inList = (ids: string[]): string => `(${ids.join(",")})`;

async function main(): Promise<void> {
  // 1. Messages a user added to a seeded thread (not part of the scripted set).
  const msg = await db
    .from("messages")
    .delete({ count: "exact" })
    .not("id", "in", inList(SEEDED_MESSAGE_IDS));
  if (msg.error) throw new Error(`delete messages: ${msg.error.message}`);

  // 2. Conversations a user created (ON DELETE CASCADE clears any remaining messages).
  const conv = await db
    .from("conversations")
    .delete({ count: "exact" })
    .not("id", "in", inList(SEEDED_CONVERSATION_IDS));
  if (conv.error) throw new Error(`delete conversations: ${conv.error.message}`);

  console.log(
    `Reset: removed ${conv.count ?? 0} user conversation(s) and ${msg.count ?? 0} stray message(s). Restoring seed…`,
  );
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
