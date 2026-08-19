import { z } from "zod";

import {
  clearedFilterParams,
  type AssetCategory,
  type CatalogueFilterParams,
  type DealType,
} from "@/lib/db/asset-filters";
import { SEEDED_JURISDICTIONS } from "@/lib/jurisdictions";
import { Constants } from "@/lib/types/database";

// Narrowing layer for the natural-language search response (ADR-6). Pure — no network and no
// server-only imports — so it unit-tests in the node environment (ADR-14), exactly as
// lib/db/asset-filters.ts does for URL params. lib/ai/nl-search.ts owns the model call.
//
// The model's `responseSchema` already constrains the SHAPE at the API level. This is the second
// line: shape is not the same as "this value exists in this database". A schema cannot know that
// INSURANCE is not one of our categories, or that a price of 1e15 is a hallucination.
//
// The rule throughout: a wrong TYPE rejects the whole response, a wrong VALUE drops that field.
// Rejecting wholesale on a single bad value would fall back to an ilike over the raw sentence,
// which returns nothing — a partial interpretation is strictly better, and the chips make what
// was applied visible and correctable.

export type SearchIntent = {
  category: AssetCategory | null;
  jurisdiction: string | null;
  dealType: DealType | null;
  priceMinCents: number | null;
  priceMaxCents: number | null;
  query: string | null; // residual keywords the filters could not express — becomes `q`
};

// Every field in the response schema is `required` with this sentinel rather than optional:
// Gemini reliably fills required properties but is inconsistent about omitting optional ones,
// so a sentinel makes "the sentence did not say" a deterministic answer instead of an absence.
export const UNSPECIFIED = "UNSPECIFIED";

// Above any plausible asset price, and low enough that the cents conversion stays inside
// Number.MAX_SAFE_INTEGER. A bound beyond this is a hallucination, not a filter.
export const MAX_PRICE_EUR = 1e11;

// A residual longer than this means the model echoed the sentence back instead of extracting
// keywords from it; truncating bounds the ilike pattern that gets built from it.
export const MAX_RESIDUAL_QUERY_LEN = 120;

// Shape gate. Missing keys are tolerated (`.nullish()`); a field of the wrong type fails the
// parse and rejects the whole response, because a type violation is a different answer rather
// than a partially correct one.
// A JS number by `typeof`, which z.number() is not: zod 4 rejects NaN and Infinity outright, and
// that would classify them as type errors and reject the whole response. They are numbers, so the
// rule above puts them on the value side — euroSchema drops the bound and the rest survives.
// (JSON.parse throws on bare NaN/Infinity literals, so this only ever fires on a hand-built object.)
const jsNumber = z.custom<number>((value) => typeof value === "number");

const rawIntentSchema = z.object({
  category: z.string().nullish(),
  jurisdiction: z.string().nullish(),
  dealType: z.string().nullish(),
  priceMinEur: jsNumber.nullish(),
  priceMaxEur: jsNumber.nullish(),
  query: z.string().nullish(),
});

// Value gates, built from the generated enums so they cannot drift from the database.
const categorySchema = z.enum(Constants.public.Enums.asset_category);
const dealTypeSchema = z.enum(Constants.public.Enums.deal_type);

// Deliberately the nine SEEDED_JURISDICTIONS rather than the twenty-entry name map: those nine
// are what the filters panel offers and what has published rows behind it. Accepting FR or IT
// here would buy a jurisdiction filter guaranteed to return zero results.
const jurisdictionSchema = z.enum(SEEDED_JURISDICTIONS);

// Zero is the documented "no bound" answer (numbers have no sentinel member), so it is rejected
// here along with negatives and anything above MAX_PRICE_EUR. z.number() also excludes NaN and
// Infinity, which is why the shape gate above lets them through to here.
const euroSchema = z.number().positive().max(MAX_PRICE_EUR);

function pickEnum<T extends string>(
  value: string | null | undefined,
  schema: z.ZodType<T>,
): T | null {
  const normalised = value?.trim().toUpperCase();
  if (!normalised || normalised === UNSPECIFIED) return null;
  const parsed = schema.safeParse(normalised);
  return parsed.success ? parsed.data : null;
}

// Euros in, integer cents out. The model states an amount; the arithmetic is ours, because money
// is bigint cents everywhere and a model must never be trusted with a rounding decision (ADR-4).
function toCents(euros: unknown): number | null {
  const parsed = euroSchema.safeParse(euros);
  return parsed.success ? Math.round(parsed.data * 100) : null;
}

function normaliseQuery(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const collapsed = raw.trim().replace(/\s+/g, " ");
  if (!collapsed) return null;
  return collapsed.slice(0, MAX_RESIDUAL_QUERY_LEN).trim() || null;
}

export function narrowSearchIntent(raw: unknown): SearchIntent | null {
  const shape = rawIntentSchema.safeParse(raw);
  if (!shape.success) return null;
  const data = shape.data;

  let priceMinCents = toCents(data.priceMinEur);
  let priceMaxCents = toCents(data.priceMaxEur);

  // An inverted range is the one filter combination guaranteed to return zero rows. Drop both
  // bounds rather than swapping them: swapping invents an intent the sentence never expressed,
  // and a model that inverted the bounds most likely misread the sentence to begin with. The
  // same posture as updateMyBuyerProfile, which rejects an inverted ticket range (TICKET_RANGE_INVALID)
  // instead of repairing it.
  if (priceMinCents !== null && priceMaxCents !== null && priceMinCents > priceMaxCents) {
    priceMinCents = null;
    priceMaxCents = null;
  }

  const intent: SearchIntent = {
    category: pickEnum(data.category, categorySchema),
    jurisdiction: pickEnum(data.jurisdiction, jurisdictionSchema),
    dealType: pickEnum(data.dealType, dealTypeSchema),
    priceMinCents,
    priceMaxCents,
    query: normaliseQuery(data.query),
  };

  // Nothing survived narrowing. Collapsing this into the same null as a malformed response gives
  // the caller exactly one fallback branch; for a non-empty query there is no legitimate reading
  // in which the model correctly found nothing at all.
  const isEmpty = Object.values(intent).every((value) => value === null);
  return isEmpty ? null : intent;
}

// Always writes all six filter keys so a previous interpretation cannot survive the next submit:
// setParams merges, and a second sentence must not inherit the first sentence's jurisdiction.
// `sort` and `page` are deliberately absent — merge preserves the user's sort, and the missing
// `page` key makes useCatalogueParams reset to page 1.
export function searchIntentToParams(
  intent: SearchIntent | null,
  rawQuery: string,
): CatalogueFilterParams {
  if (intent === null) return clearedFilterParams(rawQuery);

  return {
    category: intent.category,
    jurisdiction: intent.jurisdiction,
    deal_type: intent.dealType,
    price_min: intent.priceMinCents === null ? null : String(intent.priceMinCents),
    price_max: intent.priceMaxCents === null ? null : String(intent.priceMaxCents),
    q: intent.query,
  };
}
