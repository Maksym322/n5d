import "server-only";

import { Type, type Schema } from "@google/genai";

import {
  getGenAiClient,
  NL_SEARCH_MODEL,
  NL_SEARCH_TIMEOUT_MS,
} from "@/lib/ai/gemini";
import { narrowSearchIntent, UNSPECIFIED, type SearchIntent } from "@/lib/ai/search-intent";
import { SEEDED_JURISDICTIONS } from "@/lib/jurisdictions";
import { Constants } from "@/lib/types/database";

// The generative half of natural-language search (ADR-6). Everything that can fail lives behind
// this module's single contract: interpretQuery never throws and never returns a partial promise.
// A null return means "use the deterministic path", and the caller has exactly one branch to write.

const CATEGORIES = Constants.public.Enums.asset_category;
const DEAL_TYPES = Constants.public.Enums.deal_type;

// Every field is `required` with an UNSPECIFIED member rather than being optional. Gemini fills
// required properties reliably but is inconsistent about omitting optional ones, so the sentinel
// turns "the sentence did not say" into a deterministic answer. The number fields have no sentinel
// member, so 0 carries that meaning for them (see the prompt, and euroSchema in search-intent.ts).
//
// The enum members come from the generated Constants and from SEEDED_JURISDICTIONS, so the model
// is constrained at the API level to values this database actually has — it cannot invent a
// category or a jurisdiction, and the lists cannot drift from the schema.
const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    category: { type: Type.STRING, enum: [...CATEGORIES, UNSPECIFIED] },
    jurisdiction: { type: Type.STRING, enum: [...SEEDED_JURISDICTIONS, UNSPECIFIED] },
    dealType: { type: Type.STRING, enum: [...DEAL_TYPES, UNSPECIFIED] },
    priceMinEur: { type: Type.NUMBER },
    priceMaxEur: { type: Type.NUMBER },
    query: { type: Type.STRING },
  },
  required: ["category", "jurisdiction", "dealType", "priceMinEur", "priceMaxEur", "query"],
};

const SYSTEM_INSTRUCTION = `You convert a marketplace search sentence into structured filters for an M&A catalogue of financial-services assets. The user may write in English or Ukrainian.

Allowed categories: ${CATEGORIES.join(", ")}
Allowed jurisdictions (ISO 3166-1 alpha-2): ${SEEDED_JURISDICTIONS.join(", ")}
Allowed deal types: ${DEAL_TYPES.join(", ")}

Rules:
- Return ${UNSPECIFIED} for any field the sentence does not clearly determine. Never guess.
- Never return a value outside the allowed lists. If the user names a country that is not listed,
  return ${UNSPECIFIED} for jurisdiction and keep the country name in "query".
- Prices are plain EUR amounts in euros, not cents. "5M" and "5 million" both mean 5000000.
  Return 0 for a bound the sentence does not state.
- "under X" and "up to X" set priceMaxEur only. "over X" and "from X" set priceMinEur only.
  "between X and Y" sets both, with priceMinEur less than or equal to priceMaxEur.
- "query" holds ONLY the words that none of the fields above could express. It is matched
  literally against asset titles and descriptions, so keep it short and keep the user's own
  words — do not translate it. Drop filler ("companies", "looking for", "show me"). If every
  meaningful word was mapped to a field, return an empty string.
- Do not sort, rank, or add words the user did not write.

Examples:
"german fintech under 5m"
{"category":"FINTECH","jurisdiction":"DE","dealType":"${UNSPECIFIED}","priceMinEur":0,"priceMaxEur":5000000,"query":""}

"majority stake in a payments company with a lithuanian licence"
{"category":"PAYMENT","jurisdiction":"${UNSPECIFIED}","dealType":"MAJORITY_STAKE","priceMinEur":0,"priceMaxEur":0,"query":"lithuanian licence"}

"profitable crypto exchange between 2 and 5 million"
{"category":"CRYPTO","jurisdiction":"${UNSPECIFIED}","dealType":"${UNSPECIFIED}","priceMinEur":2000000,"priceMaxEur":5000000,"query":"profitable exchange"}`;

export async function interpretQuery(rawQuery: string): Promise<SearchIntent | null> {
  const client = getGenAiClient();
  if (client === null) return null; // no key configured — the feature is simply off (ADR-6)

  try {
    const response = await client.models.generateContent({
      model: NL_SEARCH_MODEL,
      contents: rawQuery,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0,
        maxOutputTokens: 256,
        abortSignal: AbortSignal.timeout(NL_SEARCH_TIMEOUT_MS),
      },
    });

    const text = response.text;
    if (!text) return null;

    // A truncated or non-JSON body throws here and lands in the same fallback as everything else.
    return narrowSearchIntent(JSON.parse(text));
  } catch (error) {
    // Deliberately swallowed: a failed interpretation is not an error the user should see, it is
    // a search that behaves the way it did before this feature existed. Logged in development
    // only, so a missing quota or a bad key is diagnosable without noise in production.
    if (process.env.NODE_ENV !== "production") {
      console.warn("[nl-search] falling back to text search:", error);
    }
    return null;
  }
}
