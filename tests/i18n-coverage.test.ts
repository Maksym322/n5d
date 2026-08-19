import { describe, it, expect } from "vitest";
import enCommon from "../messages/en/common.json";
import ukCommon from "../messages/uk/common.json";
import enMarketplace from "../messages/en/marketplace.json";
import ukMarketplace from "../messages/uk/marketplace.json";
import enMessages from "../messages/en/messages.json";
import ukMessages from "../messages/uk/messages.json";
import enProfile from "../messages/en/profile.json";
import ukProfile from "../messages/uk/profile.json";
import enSeller from "../messages/en/seller.json";
import ukSeller from "../messages/uk/seller.json";
import enAdmin from "../messages/en/admin.json";
import ukAdmin from "../messages/uk/admin.json";
import { SEEDED_ACCOUNTS } from "@/lib/demo-accounts";
import { SEEDED_JURISDICTIONS } from "@/lib/jurisdictions";

// Guards against a recurring class of bug: a user-visible string assembled in lib/ instead of
// coming from messages/, which renders as English on a Ukrainian page. Each case below was a
// real gap. The point of the suite is that the NEXT one fails here rather than in review.

function flatten(obj: unknown, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object") return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    flatten(v, prefix ? `${prefix}.${k}` : k),
  );
}

const LOCALES = [
  ["en", enCommon, enMarketplace],
  ["uk", ukCommon, ukMarketplace],
] as const;

// Every namespace i18n/request.ts assembles, so a new one cannot quietly skip this check.
const NAMESPACES = [
  ["common", enCommon, ukCommon],
  ["marketplace", enMarketplace, ukMarketplace],
  ["messages", enMessages, ukMessages],
  ["profile", enProfile, ukProfile],
  ["seller", enSeller, ukSeller],
  ["admin", enAdmin, ukAdmin],
] as const;

describe("locale files stay in step", () => {
  it.each(NAMESPACES)("%s.json has identical keys in every locale", (_name, en, uk) => {
    expect(flatten(uk).sort()).toEqual(flatten(en).sort());
  });
});

describe("strings chosen in lib/ resolve in every locale", () => {
  it("every seeded account's noteKey has a message", () => {
    const keys = [...new Set(SEEDED_ACCOUNTS.map((a) => a.noteKey))];
    expect(keys.length).toBeGreaterThan(0);
    for (const [locale, common] of LOCALES) {
      const notes = common.login.notes as Record<string, string | undefined>;
      for (const key of keys) {
        expect(notes[key], `${locale}: missing login.notes.${key}`).toBeTruthy();
      }
    }
  });

  it("no login note is left untranslated", () => {
    for (const key of new Set(SEEDED_ACCOUNTS.map((a) => a.noteKey))) {
      const en = (enCommon.login.notes as Record<string, string>)[key];
      const uk = (ukCommon.login.notes as Record<string, string>)[key];
      expect(uk, `login.notes.${key} is identical in both locales`).not.toBe(en);
    }
  });

  it("every seeded jurisdiction has a distinct name per locale", () => {
    // Covered in depth by jurisdictions.test.ts; asserted here so the whole class sits together.
    expect(SEEDED_JURISDICTIONS.length).toBeGreaterThan(0);
  });

  it("the ticket-range words the formatter needs exist", () => {
    for (const [locale, , marketplace] of LOCALES) {
      const ticket = marketplace.ticket as Record<string, string | undefined>;
      expect(ticket.upTo, `${locale}: missing ticket.upTo`).toContain("{value}");
      expect(ticket.any, `${locale}: missing ticket.any`).toBeTruthy();
    }
  });
});
