// ISO-3166 alpha-2 lookup in application code, not a table (DATA-MODEL §2). Covers the
// seeded set plus a few neighbours; unknown codes fall back to the raw code.
const JURISDICTION_NAMES: Record<string, string> = {
  DE: "Germany",
  PL: "Poland",
  NL: "Netherlands",
  ES: "Spain",
  UA: "Ukraine",
  CZ: "Czechia",
  SE: "Sweden",
  MT: "Malta",
  IE: "Ireland",
  FR: "France",
  IT: "Italy",
  PT: "Portugal",
  AT: "Austria",
  BE: "Belgium",
  DK: "Denmark",
  FI: "Finland",
  LT: "Lithuania",
  LV: "Latvia",
  EE: "Estonia",
  LU: "Luxembourg",
};

// The seeded jurisdictions, in a stable order for filter dropdowns.
export const SEEDED_JURISDICTIONS = [
  "DE",
  "PL",
  "NL",
  "ES",
  "UA",
  "CZ",
  "SE",
  "MT",
  "IE",
] as const;

export function jurisdictionName(code: string): string {
  return JURISDICTION_NAMES[code.toUpperCase()] ?? code.toUpperCase();
}
