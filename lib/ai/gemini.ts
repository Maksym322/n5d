import "server-only";

import { GoogleGenAI } from "@google/genai";

// The one place the natural-language search feature decides whether it exists (ADR-6).
//
// Unlike lib/supabase/admin.ts, a missing key does not throw here. Supabase is load-bearing and a
// misconfigured deploy should fail loudly; this feature is optional by design, and its whole point
// is that a reviewer without credentials gets the ordinary faceted catalogue instead of an error.

// Structured extraction, not reasoning — the model's job is to map a sentence onto an enum, and a
// fast model is the right tool for it. The cost of being wrong is bounded by validation and made
// visible by the chips, so paying for a slower model would buy latency, not accuracy.
export const NL_SEARCH_MODEL = "gemini-2.5-flash";

// A search box that hangs is worse than one that falls back. Past this, drop to ilike.
export const NL_SEARCH_TIMEOUT_MS = 6_000;

export function isNlSearchEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function getGenAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}
