// Canonical demo accounts for the passwordless role switcher on /login.
// Shared by the seed (which creates them) and actions/auth.ts (which signs into them),
// so the two can never drift. All demo accounts share process.env.DEMO_ACCOUNT_PASSWORD.

export const DEMO_ACCOUNTS = {
  BUYER: "buyer01@example.com",
  SELLER: "seller01@example.com",
  MANAGER: "manager01@example.com",
} as const;

export type DemoRole = keyof typeof DEMO_ACCOUNTS;
