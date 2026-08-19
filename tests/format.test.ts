import { describe, it, expect } from "vitest";
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
});

describe("formatTicketRange", () => {
  it("collapses a shared magnitude unit", () => {
    expect(formatTicketRange(2_000_000_00, 5_000_000_00)).toBe("€2–5M");
  });

  it("handles open-ended bounds", () => {
    expect(formatTicketRange(2_000_000_00, null)).toBe("€2M+");
    expect(formatTicketRange(null, 5_000_000_00)).toBe("Up to €5M");
    expect(formatTicketRange(null, null)).toBe("Any");
  });
});

describe("formatAssetRef", () => {
  it("prefixes the public ref with a hash", () => {
    expect(formatAssetRef(793)).toBe("#793");
  });
});
