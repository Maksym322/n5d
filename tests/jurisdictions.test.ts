import { describe, it, expect } from "vitest";
import { jurisdictionName, SEEDED_JURISDICTIONS } from "@/lib/jurisdictions";

describe("jurisdictionName", () => {
  it("returns English names by default", () => {
    expect(jurisdictionName("DE")).toBe("Germany");
    expect(jurisdictionName("de")).toBe("Germany");
  });

  it("returns Ukrainian names for the uk locale", () => {
    expect(jurisdictionName("DE", "uk")).toBe("Німеччина");
    expect(jurisdictionName("UA", "uk")).toBe("Україна");
    expect(jurisdictionName("MT", "uk")).toBe("Мальта");
  });

  it("covers every seeded jurisdiction in both locales", () => {
    for (const code of SEEDED_JURISDICTIONS) {
      expect(jurisdictionName(code, "en")).not.toBe(code);
      expect(jurisdictionName(code, "uk")).not.toBe(code);
      // A missing uk entry would silently fall back to the English name.
      expect(jurisdictionName(code, "uk")).not.toBe(jurisdictionName(code, "en"));
    }
  });

  it("falls back to the bare code for an unknown country", () => {
    expect(jurisdictionName("zz", "uk")).toBe("ZZ");
    expect(jurisdictionName("zz")).toBe("ZZ");
  });

  it("falls back to English for an unsupported locale", () => {
    expect(jurisdictionName("DE", "fr")).toBe("Germany");
  });
});
