"use server";

import { z } from "zod";

import { isNlSearchEnabled } from "@/lib/ai/gemini";
import { interpretQuery } from "@/lib/ai/nl-search";
import { searchIntentToParams } from "@/lib/ai/search-intent";
import type { CatalogueFilterParams } from "@/lib/db/asset-filters";
import { getSessionUser } from "@/lib/db/session";

// ---------------------------------------------------------------------------
// Natural-language search (ADR-6) — free text in, a catalogue URL patch out.
//
// A Server Action rather than a route handler: this codebase has no route.ts anywhere, and
// ADR-12 already makes actions/ the client-to-server seam. It reads nothing and writes nothing,
// so there is no revalidatePath here.
//
// It returns the URL patch rather than the SearchIntent on purpose. That keeps zod, the Gemini
// SDK and everything under lib/ai/ on the server: the client imports this module's type and
// nothing else, and the resulting params go straight into setParams (ADR-3).
// ---------------------------------------------------------------------------

// The cap is a cost guard as much as a validation rule — nobody types a 200-character filter.
const querySchema = z.string().trim().min(1).max(200);

export type SearchInterpretation =
  | { ok: true; params: CatalogueFilterParams }
  | { ok: false; error: "DISABLED" | "INVALID" | "UNAVAILABLE" };

export async function interpretSearchQuery(input: unknown): Promise<SearchInterpretation> {
  const parsed = querySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID" };

  if (!isNlSearchEnabled()) return { ok: false, error: "DISABLED" };

  // /assets is behind requireUser(), so this should never fire — but an exported action is a
  // public endpoint, and without this it would be an unauthenticated proxy to a paid model.
  // getSessionUser rather than requireUser: a search box must never trigger a redirect.
  if ((await getSessionUser()) === null) return { ok: false, error: "UNAVAILABLE" };

  const intent = await interpretQuery(parsed.data); // never throws
  if (intent === null) return { ok: false, error: "UNAVAILABLE" };

  return { ok: true, params: searchIntentToParams(intent, parsed.data) };
}
