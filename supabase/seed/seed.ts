/**
 * Idempotent demo seed (DATA-MODEL.md §8). Runs through the secret key, which bypasses RLS
 * but NOT triggers — so conversation inserts are ordered and existence-guarded so the §6
 * quota trigger never fires spuriously, and PUBLISHED assets carry an explicit published_at
 * because the §7 trigger only runs on UPDATE.
 *
 * Run:  npm run seed   (loads .env.local; needs DEMO_ACCOUNT_PASSWORD + SUPABASE_SERVICE_ROLE_KEY)
 * Safe to run twice: users are matched by email, rows upserted on their keys, and
 * conversations inserted only when absent.
 */
import { config } from "dotenv";
import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEMO_ACCOUNTS } from "../../lib/demo-accounts";

config({ path: ".env.local" });

// ---------------------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------------------

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = process.env.DEMO_ACCOUNT_PASSWORD;

if (!URL || !SECRET) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
if (!PASSWORD) throw new Error("Missing DEMO_ACCOUNT_PASSWORD (set it in .env.local)");

const db: SupabaseClient = createClient(URL, SECRET, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Deterministic UUIDv5 so re-runs address the same rows (assets, conversations, messages).
const UUID_NS = "1b671a64-40d5-491e-99b0-da01ff1f3341";
function uuid5(name: string): string {
  const ns = Buffer.from(UUID_NS.replace(/-/g, ""), "hex");
  const hash = createHash("sha1").update(ns).update(name).digest();
  const b = Buffer.from(hash.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x50; // version 5
  b[8] = (b[8] & 0x3f) | 0x80; // variant
  const h = b.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

const pad = (n: number): string => String(n).padStart(2, "0");

// Deterministic PRNG so seeded charts differ but are reproducible run to run.
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function fail(label: string, error: { message: string } | null): void {
  if (error) throw new Error(`${label}: ${error.message}`);
}

// ---------------------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------------------

const JURIS = ["DE", "PL", "NL", "ES", "UA", "CZ", "SE", "MT", "IE"] as const;
const CATEGORIES = ["BANK", "FINTECH", "PAYMENT", "EMI", "CRYPTO", "OTHER"] as const;
const DEAL_TYPES = ["FULL_ACQUISITION", "MAJORITY_STAKE", "MINORITY_STAKE", "ASSET_DEAL"] as const;
const INVESTOR_TYPES = ["PE_FUND", "STRATEGIC", "FAMILY_OFFICE", "SEARCH_FUND", "ANGEL"] as const;

const SELLER_HEADLINES = [
  "Owner-operator, licensed EMI in the Baltics",
  "Profitable payments processor, recurring revenue",
  "Regional challenger bank seeking exit",
  "Crypto custody platform, transferable licence",
  "Cross-border remittance business",
  "SME lending fintech with proprietary scoring",
  "Card issuing programme manager",
  "Open-banking aggregator, live integrations",
  "Merchant acquiring portfolio",
  "Digital wallet with e-money authorisation",
  "Legacy processor, wind-down opportunity",
  "Niche FX brokerage, established book",
];

const SELLER_COMPANIES = [
  "Baltic Pay Holdings OÜ", "Meridian Processing GmbH", "Nordkredit Bank AB",
  "Vault Custody s.r.o.", "TransSend Sp. z o.o.", "ScoreLend B.V.",
  "IssuerWorks Ltd", "OpenLink Fintech Oy", "AcquireCo Iberia S.L.",
  "WalletOne Malta Ltd", "Legacy Rails GmbH", "Kyiv FX Trading LLC",
];

const CONTACTS = [
  "A. Kask", "M. Weber", "E. Lindqvist", "P. Novak", "K. Zielinski", "S. de Vries",
  "R. O'Brien", "L. Korhonen", "C. Ferrer", "D. Borg", "T. Fischer", "O. Shevchenko",
];

const BUYER_HEADLINES = [
  "PE fund focused on payment infrastructure in DACH",
  "Strategic acquirer building a pan-EU EMI",
  "Family office, long-hold fintech positions",
  "Search fund targeting a single control deal",
  "Angel syndicate, early profitable fintechs",
];

const BUYER_COMPANIES = [
  "Northgate Capital Partners", "Palatine Strategic", "Hoffmann Family Office",
  "Beacon Search Partners", "Delta Angels", "Riverstone Growth", "Auric Ventures",
  "Kestrel Equity", "Lumen Holdings", "Stratos Partners", "Voss Capital",
  "Ember Investments", "Highfield Group", "Cobalt Partners", "Meridian Family Office",
  "Talis Capital EU", "Orbit Search", "Vantage Angels", "Pergamon Equity", "Silvermark Capital",
];

const HIGHLIGHT_POOL = [
  "Recurring revenue", "Transferable contracts", "Regulated licence", "Profitable",
  "Blue-chip clients", "Proprietary tech", "Live integrations", "Experienced team",
  "Clean cap table", "Cross-border reach",
];

const ASSET_TITLES = [
  "Licensed EMI with active wallet base", "Payments processor, recurring SaaS revenue",
  "Challenger bank core with deposit book", "Crypto custody and staking platform",
  "Remittance corridor operator", "SME lending platform with scoring engine",
  "BIN-sponsored card issuing programme", "Open-banking data aggregator",
  "Merchant acquiring portfolio", "E-money wallet with KYC stack",
];

// ---------------------------------------------------------------------------------------
// Account definitions
// ---------------------------------------------------------------------------------------

type Role = "BUYER" | "SELLER" | "MANAGER";
type Status = "ACTIVE" | "SUSPENDED";

interface Account {
  key: string; // stable local key, e.g. "seller01"
  email: string;
  role: Role;
  status: Status;
  displayName: string;
}

const sellers: Account[] = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1;
  return {
    key: `seller${pad(n)}`,
    email: `seller${pad(n)}@example.com`,
    role: "SELLER",
    status: n >= 11 ? "SUSPENDED" : "ACTIVE", // 2 suspended (F4)
    displayName: `Seller #${pad(n)}`,
  };
});

const buyers: Account[] = Array.from({ length: 20 }, (_, i) => {
  const n = i + 1;
  return {
    key: `buyer${pad(n)}`,
    email: `buyer${pad(n)}@example.com`,
    role: "BUYER",
    status: n === 20 ? "SUSPENDED" : "ACTIVE", // 1 suspended
    displayName: `Buyer #${pad(n)}`,
  };
});

const manager: Account = {
  key: "manager01",
  email: DEMO_ACCOUNTS.MANAGER,
  role: "MANAGER",
  status: "ACTIVE",
  displayName: "Manager #01",
};

const allAccounts: Account[] = [...sellers, ...buyers, manager];

// Canonical demo accounts must line up with lib/demo-accounts.ts.
if (sellers[0].email !== DEMO_ACCOUNTS.SELLER || buyers[0].email !== DEMO_ACCOUNTS.BUYER) {
  throw new Error("Canonical demo emails drifted from lib/demo-accounts.ts");
}

// ---------------------------------------------------------------------------------------
// Users (idempotent via email lookup)
// ---------------------------------------------------------------------------------------

async function loadExistingUsers(): Promise<Map<string, string>> {
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

async function ensureUsers(): Promise<Map<string, string>> {
  const existing = await loadExistingUsers();
  const ids = new Map<string, string>(); // key -> user id
  for (const acc of allAccounts) {
    const found = existing.get(acc.email.toLowerCase());
    if (found) {
      const { error } = await db.auth.admin.updateUserById(found, {
        password: PASSWORD,
        app_metadata: { role: acc.role }, // role in JWT app_metadata (ADR-9)
      });
      fail(`updateUser ${acc.email}`, error);
      ids.set(acc.key, found);
    } else {
      const { data, error } = await db.auth.admin.createUser({
        email: acc.email,
        password: PASSWORD,
        email_confirm: true,
        app_metadata: { role: acc.role },
      });
      fail(`createUser ${acc.email}`, error);
      if (!data.user) throw new Error(`createUser ${acc.email}: no user returned`);
      ids.set(acc.key, data.user.id);
    }
  }
  return ids;
}

// ---------------------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------------------

const PUBLISHED_AT = "2026-05-01T09:00:00Z";
const RESPONDED_AT = "2026-06-10T12:00:00Z";

const assetId = (idx: number): string => uuid5(`asset:${idx}`);
const convId = (key: string): string => uuid5(`conv:${key}`);

async function main(): Promise<void> {
  const id = await ensureUsers();
  const uid = (key: string): string => {
    const v = id.get(key);
    if (!v) throw new Error(`Unknown account key: ${key}`);
    return v;
  };

  // profiles (mirror role + status)
  fail(
    "profiles",
    (
      await db.from("profiles").upsert(
        allAccounts.map((a) => ({
          id: uid(a.key),
          role: a.role,
          status: a.status,
          display_name: a.displayName,
          locale: "en",
        })),
        { onConflict: "id" },
      )
    ).error,
  );

  // seller_profiles + seller_identities
  fail(
    "seller_profiles",
    (
      await db.from("seller_profiles").upsert(
        sellers.map((s, i) => ({
          user_id: uid(s.key),
          headline: SELLER_HEADLINES[i],
          jurisdiction: JURIS[i % JURIS.length],
          description: `${SELLER_HEADLINES[i]}. Established operation with clean records and a warm handover.`,
          verified: i % 3 !== 0, // ~two thirds validated
        })),
        { onConflict: "user_id" },
      )
    ).error,
  );
  fail(
    "seller_identities",
    (
      await db.from("seller_identities").upsert(
        sellers.map((s, i) => ({
          user_id: uid(s.key),
          company_name: SELLER_COMPANIES[i],
          registration_number: `REG-${1000 + i}`,
          website: `https://seller${pad(i + 1)}.example.com`,
          contact_name: CONTACTS[i],
        })),
        { onConflict: "user_id" },
      )
    ).error,
  );

  // buyer_profiles + buyer_identities
  fail(
    "buyer_profiles",
    (
      await db.from("buyer_profiles").upsert(
        buyers.map((b, i) => {
          const n = i + 1;
          const min = (2 + (i % 6)) * 250_000_00; // €500k .. (cents)
          const max = min + (3 + (i % 5)) * 1_000_000_00;
          return {
            user_id: uid(b.key),
            headline: BUYER_HEADLINES[i % BUYER_HEADLINES.length],
            investor_type: INVESTOR_TYPES[i % INVESTOR_TYPES.length],
            categories: [CATEGORIES[i % CATEGORIES.length], CATEGORIES[(i + 2) % CATEGORIES.length]],
            jurisdictions: [JURIS[i % JURIS.length], JURIS[(i + 3) % JURIS.length]],
            deal_types: [DEAL_TYPES[i % DEAL_TYPES.length]],
            ticket_min_cents: min,
            ticket_max_cents: max,
            is_listed: !(n >= 17 && n <= 19), // buyers 17,18,19 opt out of the directory
          };
        }),
        { onConflict: "user_id" },
      )
    ).error,
  );
  fail(
    "buyer_identities",
    (
      await db.from("buyer_identities").upsert(
        buyers.map((b, i) => ({
          user_id: uid(b.key),
          company_name: BUYER_COMPANIES[i],
          website: `https://buyer${pad(i + 1)}.example.com`,
          contact_name: CONTACTS[i % CONTACTS.length],
        })),
        { onConflict: "user_id" },
      )
    ).error,
  );

  // assets: 28 PUBLISHED, 4 DRAFT, 2 SUSPENDED, 1 SOLD; 20 validated. public_ref is assigned
  // by the sequence default; the stable id is uuid5("asset:<index>"). published_at is set for
  // every non-DRAFT asset (the §7 trigger is UPDATE-only, so a direct insert won't stamp it).
  const assetStatus = (i: number): "PUBLISHED" | "DRAFT" | "SUSPENDED" | "SOLD" =>
    i < 28 ? "PUBLISHED" : i < 32 ? "DRAFT" : i < 34 ? "SUSPENDED" : "SOLD";

  // Seller owning each asset: spread across active sellers, with two PUBLISHED assets on the
  // suspended sellers (11,12) so F4 is demonstrable.
  const assetSellerKey = (i: number): string => {
    if (i === 26) return "seller11";
    if (i === 27) return "seller12";
    if (i < 26) return `seller${pad((i % 10) + 1)}`;
    return `seller${pad((i % 4) + 1)}`; // 28..34 on active sellers
  };

  const assetRows = Array.from({ length: 35 }, (_, i) => {
    const status = assetStatus(i);
    const rand = rng(1000 + i);
    const askingBase = (2 + (i % 30)) * 500_000_00; // cents, €1M .. ~€15.5M
    const priceHistory = Array.from({ length: 6 }, (_, y) => ({
      year: 2020 + y,
      value_cents: Math.round(askingBase * (0.55 + 0.09 * y + (rand() - 0.5) * 0.12)),
    }));
    return {
      id: assetId(i),
      seller_id: uid(assetSellerKey(i)),
      title: `${ASSET_TITLES[i % ASSET_TITLES.length]} (${JURIS[i % JURIS.length]})`,
      description:
        "Confidential M&A opportunity. Financials and full data pack shared on accepted contact. Clean structure, transferable relationships, warm handover available.",
      category: CATEGORIES[i % CATEGORIES.length],
      jurisdiction: JURIS[i % JURIS.length],
      deal_type: DEAL_TYPES[i % DEAL_TYPES.length],
      revenue_cents: Math.round(askingBase * 0.4),
      ebitda_cents: Math.round(askingBase * 0.15),
      asking_price_cents: askingBase,
      employees: 5 + ((i * 7) % 120),
      year_founded: 2005 + (i % 18),
      highlights: [HIGHLIGHT_POOL[i % HIGHLIGHT_POOL.length], HIGHLIGHT_POOL[(i + 4) % HIGHLIGHT_POOL.length]],
      price_history: priceHistory,
      validated: i < 20, // exactly 20 validated
      status,
      published_at: status === "DRAFT" ? null : PUBLISHED_AT,
    };
  });
  fail("assets", (await db.from("assets").upsert(assetRows, { onConflict: "id" })).error);

  // conversations — existence-guarded so the quota trigger never fires on re-run.
  interface ConvDef {
    key: string;
    buyer: string;
    seller: string;
    assetIdx: number | null;
    initiator: string;
    status: "ACCEPTED" | "DECLINED" | "PENDING";
  }
  const accepted: ConvDef[] = [
    { key: "c1", buyer: "buyer01", seller: "seller01", assetIdx: 0, initiator: "buyer01", status: "ACCEPTED" },
    { key: "c2", buyer: "buyer02", seller: "seller02", assetIdx: 1, initiator: "buyer02", status: "ACCEPTED" },
    { key: "c3", buyer: "buyer03", seller: "seller03", assetIdx: null, initiator: "seller03", status: "ACCEPTED" },
    { key: "c4", buyer: "buyer04", seller: "seller04", assetIdx: 3, initiator: "buyer04", status: "ACCEPTED" },
  ];
  const declined: ConvDef[] = [
    { key: "c5", buyer: "buyer06", seller: "seller05", assetIdx: 4, initiator: "buyer06", status: "DECLINED" },
  ];
  // buyer05 sits at exactly 5 pending outbound (D5 demo). Distinct sellers => unique pairs.
  const pending: ConvDef[] = [
    { key: "p1", buyer: "buyer05", seller: "seller06", assetIdx: 5, initiator: "buyer05", status: "PENDING" },
    { key: "p2", buyer: "buyer05", seller: "seller07", assetIdx: 6, initiator: "buyer05", status: "PENDING" },
    { key: "p3", buyer: "buyer05", seller: "seller08", assetIdx: 7, initiator: "buyer05", status: "PENDING" },
    { key: "p4", buyer: "buyer05", seller: "seller09", assetIdx: 8, initiator: "buyer05", status: "PENDING" },
    { key: "p5", buyer: "buyer05", seller: "seller10", assetIdx: 9, initiator: "buyer05", status: "PENDING" },
    { key: "p6", buyer: "buyer07", seller: "seller02", assetIdx: null, initiator: "seller02", status: "PENDING" },
  ];

  const convDefs = [...accepted, ...declined, ...pending];
  const { data: presentConv, error: convReadErr } = await db
    .from("conversations")
    .select("id")
    .in("id", convDefs.map((c) => convId(c.key)));
  fail("conversations read", convReadErr);
  const present = new Set((presentConv ?? []).map((r: { id: string }) => r.id));

  const convRow = (c: ConvDef) => ({
    id: convId(c.key),
    buyer_id: uid(c.buyer),
    seller_id: uid(c.seller),
    asset_id: c.assetIdx === null ? null : assetId(c.assetIdx),
    initiated_by: uid(c.initiator),
    status: c.status,
    responded_at: c.status === "PENDING" ? null : RESPONDED_AT,
  });

  // Non-pending first, then pending in order: keeps every initiator's running PENDING count
  // below 5 at insert time (buyer05's fifth insert sees 4).
  const missingNonPending = [...accepted, ...declined].filter((c) => !present.has(convId(c.key)));
  const missingPending = pending.filter((c) => !present.has(convId(c.key)));
  if (missingNonPending.length) {
    fail(
      "conversations insert (non-pending)",
      (await db.from("conversations").insert(missingNonPending.map(convRow))).error,
    );
  }
  if (missingPending.length) {
    fail("conversations insert (pending)", (await db.from("conversations").insert(missingPending.map(convRow))).error);
  }

  // messages across 5 threads (~24). Deterministic ids => upsert is safe.
  const threadScript: Record<string, [string, string][]> = {
    c1: [
      ["buyer01", "Hello — interested in your EMI. Could we discuss the wallet base?"],
      ["seller01", "Happy to. Active wallets are growing ~4% monthly."],
      ["buyer01", "Great. What is the current licence scope?"],
      ["seller01", "Full e-money authorisation, passported across the EEA."],
      ["buyer01", "Understood. Can you share the last two years of EBITDA?"],
      ["seller01", "Yes, sending the data pack now that we're connected."],
    ],
    c2: [
      ["buyer02", "Your processor looks like a strong fit for our roll-up."],
      ["seller02", "Thanks — recurring revenue is ~80% of the top line."],
      ["buyer02", "Churn?"],
      ["seller02", "Under 5% annually on the merchant base."],
      ["buyer02", "Let's set up a management call."],
      ["seller02", "Works for me. I'll propose a few slots."],
    ],
    c3: [
      ["seller03", "We reached out as your mandate matches our deposit book."],
      ["buyer03", "It does. What's the funding mix?"],
      ["seller03", "Mostly retail term deposits, laddered maturities."],
      ["buyer03", "Capital position?"],
      ["seller03", "Comfortably above minimum; details in the pack."],
    ],
    c4: [
      ["buyer04", "Interested in the acquiring portfolio — volumes?"],
      ["seller04", "~€1.2bn processed last year across 3,000 merchants."],
      ["buyer04", "Take rate?"],
      ["seller04", "Blended ~45bps."],
      ["buyer04", "Compelling. Sending a teaser back."],
      ["seller04", "Appreciated — glad we're connected now."],
    ],
    // opening message on a still-pending request (allowed for the initiator before acceptance)
    p1: [["buyer05", "Hi — we'd like to open a conversation about your wallet business."]],
  };

  const msgRows = Object.entries(threadScript).flatMap(([convKey, lines]) =>
    lines.map(([senderKey, body], idx) => ({
      id: uuid5(`msg:${convKey}:${idx}`),
      conversation_id: convId(convKey),
      sender_id: uid(senderKey),
      body,
      created_at: new Date(Date.parse(RESPONDED_AT) + idx * 60_000).toISOString(),
    })),
  );
  fail("messages", (await db.from("messages").upsert(msgRows, { onConflict: "id" })).error);

  // moderation_log — one of each action.
  const modRows = [
    {
      id: uuid5("modlog:SUSPEND"),
      actor_id: uid("manager01"),
      target_type: "USER",
      target_id: uid("seller11"),
      action: "SUSPEND",
      reason: "Repeated policy violations flagged by compliance review.",
    },
    {
      id: uuid5("modlog:REACTIVATE"),
      actor_id: uid("manager01"),
      target_type: "USER",
      target_id: uid("buyer10"),
      action: "REACTIVATE",
      reason: "Verification completed; account restored to active status.",
    },
    {
      id: uuid5("modlog:SUSPEND_ASSET"),
      actor_id: uid("manager01"),
      target_type: "ASSET",
      target_id: assetId(32), // a SUSPENDED asset
      action: "SUSPEND_ASSET",
      reason: "Listing details require substantiation before republication.",
    },
    {
      id: uuid5("modlog:REPUBLISH_ASSET"),
      actor_id: uid("manager01"),
      target_type: "ASSET",
      target_id: assetId(0),
      action: "REPUBLISH_ASSET",
      reason: "Documentation supplied; listing cleared to publish again.",
    },
  ];
  fail("moderation_log", (await db.from("moderation_log").upsert(modRows, { onConflict: "id" })).error);

  console.log("Seed complete:", JSON.stringify(await summarize(), null, 2));
}

async function countRows(table: string, column?: string, value?: string): Promise<number> {
  let query = db.from(table).select("*", { count: "exact", head: true });
  if (column && value) query = query.eq(column, value);
  const { count, error } = await query;
  fail(`count ${table}`, error);
  return count ?? 0;
}

async function summarize(): Promise<Record<string, number>> {
  return {
    profiles: await countRows("profiles"),
    seller_profiles: await countRows("seller_profiles"),
    buyer_profiles: await countRows("buyer_profiles"),
    assets: await countRows("assets"),
    assets_published: await countRows("assets", "status", "PUBLISHED"),
    conversations: await countRows("conversations"),
    conversations_accepted: await countRows("conversations", "status", "ACCEPTED"),
    conversations_pending: await countRows("conversations", "status", "PENDING"),
    messages: await countRows("messages"),
    moderation_log: await countRows("moderation_log"),
  };
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
