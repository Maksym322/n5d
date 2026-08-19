import { describe, it, expect } from "vitest";
import type { TicketRangeLabels } from "../lib/format";
import {
  formatMoney,
  formatMoneyCompact,
  formatTicketRange,
  formatAssetRef,
} from "../lib/format";

describe("formatMoney", () => {
  it("formats whole amounts without decimals", () => {
    expect(formatMoney(130_000_00)).toBe("€130,000");
  });

  it("keeps decimals when there is a fractional part", () => {
    expect(formatMoney(1_300_50)).toBe("€1,300.50");
  });

  it("accepts bigint cents", () => {
    expect(formatMoney(BigInt(2_500_000_00))).toBe("€2,500,000");
  });
});

describe("formatMoneyCompact", () => {
  it("abbreviates thousands and millions", () => {
    expect(formatMoneyCompact(130_000_00)).toBe("€130K");
    expect(formatMoneyCompact(2_500_000_00)).toBe("€2.5M");
  });

  it("does not group the scaled value", () => {
    // 999,999 scales to 1000K — grouping here would read as a formatting bug ("€1,000K").
    expect(formatMoneyCompact(999_999_00)).toBe("€1000K");
  });
});

// The currency mark is a symbol, not a translated word. Left to the viewer's locale, Intl
// renders EUR as the literal "EUR" in uk, which produced "EUR5M" in the filter chips.
describe("currency symbol is locale-independent", () => {
  it("uses € in uk as well as en", () => {
    expect(formatMoneyCompact(5_000_000_00, "EUR", "uk")).toBe("€5M");
    expect(formatMoney(130_000_00, "EUR", "uk")).toContain("€");
    expect(formatMoney(130_000_00, "EUR", "uk")).not.toContain("EUR");
    expect(formatTicketRange(2_000_000_00, 5_000_000_00, uk, "EUR", "uk")).toBe("€2–5M");
  });

  it("still applies locale-correct grouping and decimals to the number", () => {
    // uk groups with a non-breaking space and puts the symbol last; en groups with commas.
    expect(formatMoney(1_300_000_00, "EUR", "uk")).not.toBe(formatMoney(1_300_000_00, "EUR", "en"));
    expect(formatMoney(1_300_000_00, "EUR", "en")).toBe("€1,300,000");
    // The compact decimal separator follows the locale: 2.5M in en, 2,5M in uk.
    expect(formatMoneyCompact(2_500_000_00, "EUR", "uk")).toBe("€2,5M");
  });
});

// The two words come from the caller, so the formatter itself is language-agnostic. These
// stand in for what next-intl hands it at the call sites.
const en: TicketRangeLabels = { upTo: (value) => `Up to ${value}`, any: "Any" };
const uk: TicketRangeLabels = { upTo: (value) => `До ${value}`, any: "Будь-який" };

describe("formatTicketRange", () => {
  it("collapses a shared magnitude unit", () => {
    expect(formatTicketRange(2_000_000_00, 5_000_000_00, en)).toBe("€2–5M");
  });

  it("handles open-ended bounds", () => {
    expect(formatTicketRange(2_000_000_00, null, en)).toBe("€2M+");
    expect(formatTicketRange(null, 5_000_000_00, en)).toBe("Up to €5M");
    expect(formatTicketRange(null, null, en)).toBe("Any");
  });

  it("takes its words from the caller, so nothing English is baked in", () => {
    expect(formatTicketRange(null, 5_000_000_00, uk, "EUR", "uk")).toBe("До €5M");
    expect(formatTicketRange(null, null, uk, "EUR", "uk")).toBe("Будь-який");
    // The numeric part still formats for the locale; only the words are injected.
    expect(formatTicketRange(2_500_000_00, null, uk, "EUR", "uk")).toBe("€2,5M+");
  });
});

describe("formatAssetRef", () => {
  it("prefixes the public ref with a hash", () => {
    expect(formatAssetRef(793)).toBe("#793");
  });
});
