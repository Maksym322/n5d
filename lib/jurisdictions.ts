// ISO-3166 alpha-2 lookup in application code, not a table (DATA-MODEL §2). Covers the
// seeded set plus a few neighbours; unknown codes fall back to the raw code.
//
// Names are per locale rather than English-only, because this is a presentation string and
// every surface that renders it is locale-switched (ADR-8). Intl.DisplayNames would produce
// these without a table, but its output varies with the ICU data a runtime happens to ship;
// a literal table renders the same names on every machine, which is the same reasoning that
// keeps the enum labels in messages/ rather than deriving them.
const JURISDICTION_NAMES_EN: Record<string, string> = {
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

const JURISDICTION_NAMES_UK: Record<string, string> = {
  DE: "Німеччина",
  PL: "Польща",
  NL: "Нідерланди",
  ES: "Іспанія",
  UA: "Україна",
  CZ: "Чехія",
  SE: "Швеція",
  MT: "Мальта",
  IE: "Ірландія",
  FR: "Франція",
  IT: "Італія",
  PT: "Португалія",
  AT: "Австрія",
  BE: "Бельгія",
  DK: "Данія",
  FI: "Фінляндія",
  LT: "Литва",
  LV: "Латвія",
  EE: "Естонія",
  LU: "Люксембург",
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

// `locale` defaults to English so a caller with no locale in scope still compiles, but every
// locale-switched surface should pass one. Falls back through English to the bare code, so an
// unseeded country is never rendered as a blank.
export function jurisdictionName(code: string, locale = "en"): string {
  const upper = code.toUpperCase();
  const names = locale === "uk" ? JURISDICTION_NAMES_UK : JURISDICTION_NAMES_EN;
  return names[upper] ?? JURISDICTION_NAMES_EN[upper] ?? upper;
}
