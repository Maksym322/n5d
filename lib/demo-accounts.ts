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
  note: string; // one-line hint of what this account demonstrates, for the /login picker
}

const pad = (n: number): string => String(n).padStart(2, "0");

// Notes describe the demo scenario each account exercises. They mirror the conversation and
// moderation fixtures defined in the seed (accepted c1–c4, declined c5, pending p1–p6, etc.).
function sellerNote(n: number, suspended: boolean): string {
  if (suspended) return "Suspended — listings hidden from the catalogue (F4)";
  if (n <= 4) return "Has an accepted thread — counterparty identity revealed";
  if (n === 5) return "Declined an incoming request";
  if (n >= 6 && n <= 10) return "Has a pending request from buyer05";
  return "Active seller";
}

function buyerNote(n: number, suspended: boolean, optOut: boolean): string {
  if (suspended) return "Suspended — read-only access (F5)";
  if (optOut) return "Directory opt-out (is_listed = false)";
  if (n === 5) return "At the 5-request quota limit (D5)";
  if (n <= 4) return "Has an accepted thread — counterparty identity revealed";
  if (n === 6) return "Has a declined request";
  if (n === 7) return "Has a pending request from a seller";
  if (n === 10) return "Reactivated in the moderation log";
  return "Active buyer";
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
    note: sellerNote(n, suspended),
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
    note: buyerNote(n, suspended, optOut),
  };
});

const manager: SeededAccount = {
  key: "manager01",
  email: DEMO_ACCOUNTS.MANAGER,
  role: "MANAGER",
  status: "ACTIVE",
  displayName: "Manager #01",
  note: "Platform manager — moderation and registry",
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
