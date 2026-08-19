import type { Enums } from "@/lib/types/database";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/db/session";

export type ConversationStatus = Enums<"conversation_status">;

export type ConversationSummary = {
  id: string;
  status: ConversationStatus;
  assetRef: number | null;
  counterpartyHandle: string; // the OTHER party's profiles.display_name — anonymous handle
  counterpartyCompany: string | null; // the other party's *_identities.company_name — null unless ACCEPTED (RLS)
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  createdAt: string;
};

export type MessageItem = {
  id: string;
  body: string;
  senderId: string;
  mine: boolean;
  createdAt: string;
  readAt: string | null;
};

export type ConversationThread = {
  id: string;
  status: ConversationStatus;
  assetRef: number | null;
  counterpartyHandle: string;
  counterpartyCompany: string | null;
  initiatedByMe: boolean;
  messages: MessageItem[];
};

// A one-to-one PostgREST embed can surface as an object or a single-element array
// depending on how the relationship is inferred; normalise both to the first value.
function one<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

type EmbeddedAsset = { public_ref: number } | { public_ref: number }[] | null;
type EmbeddedIdentity =
  | { company_name: string }
  | { company_name: string }[]
  | null;
type EmbeddedParty =
  | { display_name: string; ident: EmbeddedIdentity }
  | { display_name: string; ident: EmbeddedIdentity }[]
  | null;

// The thread is two-sided; the counterparty is whichever party is not me. I read their
// handle from profiles and their company from the matching *_identities table, which RLS
// reveals only on ACCEPTED — symmetric for buyer and seller (ADR-10), no if(accepted).
function pickCounterparty(
  myId: string,
  buyerId: string,
  buyer: EmbeddedParty,
  seller: EmbeddedParty,
): { handle: string; company: string | null } {
  const cp = buyerId === myId ? seller : buyer;
  const party = one(cp);
  return {
    handle: party?.display_name ?? "—",
    company: one(party?.ident)?.company_name ?? null,
  };
}

// Both embed shapes selected once and reused by list + thread.
const PARTY_EMBED = `
  asset:assets!conversations_asset_id_fkey ( public_ref ),
  buyer:profiles!conversations_buyer_id_fkey (
    display_name, ident:buyer_identities ( company_name )
  ),
  seller:profiles!conversations_seller_id_fkey (
    display_name, ident:seller_identities ( company_name )
  )
`;

type PartyRow = {
  buyer_id: string;
  asset: EmbeddedAsset;
  buyer: EmbeddedParty;
  seller: EmbeddedParty;
};

// Every thread the signed-in user is a party to, newest first. Works for buyer and seller.
export async function listMyConversations(): Promise<ConversationSummary[]> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("conversations")
    .select(
      `id, status, created_at, buyer_id, ${PARTY_EMBED},
        messages ( body, created_at )`,
    )
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .order("created_at", { referencedTable: "messages", ascending: false })
    .limit(1, { referencedTable: "messages" });
  if (error) throw error;

  type Row = PartyRow & {
    id: string;
    status: ConversationStatus;
    created_at: string;
    messages: { body: string; created_at: string }[] | null;
  };
  const rows = (data ?? []) as unknown as Row[];

  return rows.map((c) => {
    const last = c.messages?.[0] ?? null;
    const cp = pickCounterparty(user.id, c.buyer_id, c.buyer, c.seller);
    return {
      id: c.id,
      status: c.status,
      assetRef: one(c.asset)?.public_ref ?? null,
      counterpartyHandle: cp.handle,
      counterpartyCompany: cp.company,
      lastMessagePreview: last?.body ?? null,
      lastMessageAt: last?.created_at ?? null,
      createdAt: c.created_at,
    };
  });
}

export async function getConversation(
  id: string,
): Promise<ConversationThread | null> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("conversations")
    .select(
      `id, status, created_at, initiated_by, buyer_id, ${PARTY_EMBED},
        messages ( id, body, sender_id, created_at, read_at )`,
    )
    .eq("id", id)
    .order("created_at", { referencedTable: "messages", ascending: true })
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  type Row = PartyRow & {
    id: string;
    status: ConversationStatus;
    initiated_by: string;
    messages: {
      id: string;
      body: string;
      sender_id: string;
      created_at: string;
      read_at: string | null;
    }[] | null;
  };
  const row = data as unknown as Row;
  const cp = pickCounterparty(user.id, row.buyer_id, row.buyer, row.seller);

  return {
    id: row.id,
    status: row.status,
    assetRef: one(row.asset)?.public_ref ?? null,
    counterpartyHandle: cp.handle,
    counterpartyCompany: cp.company,
    initiatedByMe: row.initiated_by === user.id,
    messages: (row.messages ?? []).map((m) => ({
      id: m.id,
      body: m.body,
      senderId: m.sender_id,
      mine: m.sender_id === user.id,
      createdAt: m.created_at,
      readAt: m.read_at,
    })),
  };
}

// Incoming requests awaiting my response (F2/F3 dashboard): PENDING threads I am a party to but did
// NOT initiate. The counterparty is anonymous until I accept — company falls out as null from RLS,
// exactly like listMyConversations. Newest first.
export async function listIncomingPendingRequests(): Promise<ConversationSummary[]> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("conversations")
    .select(
      `id, status, created_at, buyer_id, ${PARTY_EMBED},
        messages ( body, created_at )`,
    )
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .eq("status", "PENDING")
    .neq("initiated_by", user.id)
    .order("created_at", { ascending: false })
    .order("created_at", { referencedTable: "messages", ascending: false })
    .limit(1, { referencedTable: "messages" });
  if (error) throw error;

  type Row = PartyRow & {
    id: string;
    status: ConversationStatus;
    created_at: string;
    messages: { body: string; created_at: string }[] | null;
  };
  const rows = (data ?? []) as unknown as Row[];

  return rows.map((c) => {
    const last = c.messages?.[0] ?? null;
    const cp = pickCounterparty(user.id, c.buyer_id, c.buyer, c.seller);
    return {
      id: c.id,
      status: c.status,
      assetRef: one(c.asset)?.public_ref ?? null,
      counterpartyHandle: cp.handle,
      counterpartyCompany: cp.company,
      lastMessagePreview: last?.body ?? null,
      lastMessageAt: last?.created_at ?? null,
      createdAt: c.created_at,
    };
  });
}

// Count of my PENDING outbound requests — drives the "N of 5 requests active" counter
// shown before a contact action (D5). The quota trigger keys on initiated_by.
export async function getMyPendingContactCount(): Promise<number> {
  const user = await requireUser();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("initiated_by", user.id)
    .eq("status", "PENDING");
  if (error) throw error;
  return count ?? 0;
}

export const CONTACT_QUOTA = 5;
