/**
 * Deterministic fixture identity shared by the seed and the reset script. Every seeded asset,
 * conversation and message has a stable UUIDv5, so `reset.ts` can tell seeded rows from ones a
 * user created while clicking around and restore the demo to an exact state.
 */
import { createHash } from "node:crypto";

const UUID_NS = "1b671a64-40d5-491e-99b0-da01ff1f3341";

export function uuid5(name: string): string {
  const ns = Buffer.from(UUID_NS.replace(/-/g, ""), "hex");
  const hash = createHash("sha1").update(ns).update(name).digest();
  const b = Buffer.from(hash.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x50; // version 5
  b[8] = (b[8] & 0x3f) | 0x80; // variant
  const h = b.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

export const assetId = (idx: number): string => uuid5(`asset:${idx}`);
export const convId = (key: string): string => uuid5(`conv:${key}`);

export interface ConvDef {
  key: string;
  buyer: string;
  seller: string;
  assetIdx: number | null;
  initiator: string;
  status: "ACCEPTED" | "DECLINED" | "PENDING";
}

export const ACCEPTED_CONVS: ConvDef[] = [
  { key: "c1", buyer: "buyer01", seller: "seller01", assetIdx: 0, initiator: "buyer01", status: "ACCEPTED" },
  { key: "c2", buyer: "buyer02", seller: "seller02", assetIdx: 1, initiator: "buyer02", status: "ACCEPTED" },
  { key: "c3", buyer: "buyer03", seller: "seller03", assetIdx: null, initiator: "seller03", status: "ACCEPTED" },
  { key: "c4", buyer: "buyer04", seller: "seller04", assetIdx: 3, initiator: "buyer04", status: "ACCEPTED" },
];

export const DECLINED_CONVS: ConvDef[] = [
  { key: "c5", buyer: "buyer06", seller: "seller05", assetIdx: 4, initiator: "buyer06", status: "DECLINED" },
];

// buyer05 sits at exactly 5 pending outbound (D5 demo). Distinct sellers => unique pairs.
export const PENDING_CONVS: ConvDef[] = [
  { key: "p1", buyer: "buyer05", seller: "seller06", assetIdx: 5, initiator: "buyer05", status: "PENDING" },
  { key: "p2", buyer: "buyer05", seller: "seller07", assetIdx: 6, initiator: "buyer05", status: "PENDING" },
  { key: "p3", buyer: "buyer05", seller: "seller08", assetIdx: 7, initiator: "buyer05", status: "PENDING" },
  { key: "p4", buyer: "buyer05", seller: "seller09", assetIdx: 8, initiator: "buyer05", status: "PENDING" },
  { key: "p5", buyer: "buyer05", seller: "seller10", assetIdx: 9, initiator: "buyer05", status: "PENDING" },
  { key: "p6", buyer: "buyer07", seller: "seller02", assetIdx: null, initiator: "seller02", status: "PENDING" },
];

export const CONV_DEFS: ConvDef[] = [...ACCEPTED_CONVS, ...DECLINED_CONVS, ...PENDING_CONVS];

export const THREAD_SCRIPT: Record<string, [string, string][]> = {
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

export const SEEDED_CONVERSATION_IDS: string[] = CONV_DEFS.map((c) => convId(c.key));

export const SEEDED_MESSAGE_IDS: string[] = Object.entries(THREAD_SCRIPT).flatMap(
  ([convKey, lines]) => lines.map((_, idx) => uuid5(`msg:${convKey}:${idx}`)),
);
