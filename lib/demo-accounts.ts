// Single source of truth for the seeded demo accounts. The seed (supabase/seed/seed.ts)
// creates them from this list; actions/auth.ts signs into them; /login lists them. Keeping the
// generation here means the account roster can never drift between the seed and the UI.
// All demo accounts share process.env.DEMO_ACCOUNT_PASSWORD.

export const DEMO_ACCOUNTS = {
  BUYER: "buyer01@example.com",
  SELLER: "seller01@example.com",
  MANAGER: "manager01@example.com",
} as const;

export type DemoRole = keyof typeof DEMO_ACCOUNTS;

export type SeededRole = "BUYER" | "SELLER" | "MANAGER";
export type SeededStatus = "ACTIVE" | "SUSPENDED";

export interface SeededAccount {
  key: string; // stable local key, e.g. "seller01"
  email: string;
  role: SeededRole;
  status: SeededStatus;
  displayName: string;
  isListed?: boolean; // buyers only — directory opt-out (D1)
  // Which hint the /login picker shows for this account. A key, not a sentence: the wording is
  // a user-visible string and belongs in messages/ (common.login.notes.*), while the choice of
  // which hint applies is seed logic and belongs here.
  noteKey: string;
}

const pad = (n: number): string => String(n).padStart(2, "0");

// Notes describe the demo scenario each account exercises. They mirror the conversation and
// moderation fixtures defined in the seed (accepted c1–c4, declined c5, pending p1–p9, etc.).
function sellerNoteKey(n: number, suspended: boolean): string {
  if (suspended) return "sellerSuspended";
  if (n === 1) return "sellerAcceptedPlusIncoming";
  if (n === 4) return "sellerAcceptedPlusIncomingBuyer01";
  if (n <= 4) return "acceptedRevealed";
  if (n === 5) return "sellerDeclined";
  if (n === 7) return "sellerIncomingTwo";
  if (n >= 6 && n <= 10) return "sellerPendingFromBuyer05";
  return "sellerActive";
}

function buyerNoteKey(n: number, suspended: boolean, optOut: boolean): string {
  if (suspended) return "buyerSuspended";
  if (optOut) return "buyerOptOut";
  if (n === 5) return "buyerAtQuota";
  if (n === 1) return "buyerAcceptedPlusPending";
  if (n <= 4) return "acceptedRevealed";
  if (n === 6) return "buyerDeclined";
  if (n === 7) return "buyerPendingFromSeller";
  if (n === 8) return "buyerSentPending";
  if (n === 10) return "buyerReactivated";
  return "buyerActive";
}

const sellers: SeededAccount[] = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1;
  const suspended = n >= 11; // sellers 11, 12 suspended (F4)
  return {
    key: `seller${pad(n)}`,
    email: `seller${pad(n)}@example.com`,
    role: "SELLER",
    status: suspended ? "SUSPENDED" : "ACTIVE",
    displayName: `Seller #${pad(n)}`,
    noteKey: sellerNoteKey(n, suspended),
  };
});

const buyers: SeededAccount[] = Array.from({ length: 20 }, (_, i) => {
  const n = i + 1;
  const suspended = n === 20; // 1 suspended
  const optOut = n >= 17 && n <= 19; // buyers 17–19 opt out of the directory
  return {
    key: `buyer${pad(n)}`,
    email: `buyer${pad(n)}@example.com`,
    role: "BUYER",
    status: suspended ? "SUSPENDED" : "ACTIVE",
    displayName: `Buyer #${pad(n)}`,
    isListed: !optOut,
    noteKey: buyerNoteKey(n, suspended, optOut),
  };
});

const manager: SeededAccount = {
  key: "manager01",
  email: DEMO_ACCOUNTS.MANAGER,
  role: "MANAGER",
  status: "ACTIVE",
  displayName: "Manager #01",
  noteKey: "managerDefault",
};

// Ordered sellers → buyers → manager. The seed indexes its domain arrays (headlines,
// companies) by position within each role slice, so this order is load-bearing.
export const SEEDED_ACCOUNTS: readonly SeededAccount[] = [...sellers, ...buyers, manager];

export function seededAccountsByRole(role: SeededRole): SeededAccount[] {
  return SEEDED_ACCOUNTS.filter((a) => a.role === role);
}

// Guard: the canonical role-button emails must be the first account of each role.
if (
  sellers[0].email !== DEMO_ACCOUNTS.SELLER ||
  buyers[0].email !== DEMO_ACCOUNTS.BUYER ||
  manager.email !== DEMO_ACCOUNTS.MANAGER
) {
  throw new Error("Canonical DEMO_ACCOUNTS drifted from SEEDED_ACCOUNTS");
}
