import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

// Cookie-based locale, no [locale] URL segment (ADR-8). Locale is a user preference,
// mirrored into profiles.locale when signed in. Messages are namespaced per feature;
// only the `common` shell namespace exists in the foundation phase.
export const locales = ["en", "uk"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get("locale")?.value;
  const locale: Locale = cookieLocale === "uk" ? "uk" : "en";

  const [common, marketplace, messages, profile, seller] = await Promise.all([
    import(`../messages/${locale}/common.json`),
    import(`../messages/${locale}/marketplace.json`),
    import(`../messages/${locale}/messages.json`),
    import(`../messages/${locale}/profile.json`),
    import(`../messages/${locale}/seller.json`),
  ]);

  return {
    locale,
    messages: {
      common: common.default,
      marketplace: marketplace.default,
      messages: messages.default,
      profile: profile.default,
      seller: seller.default,
    },
  };
});
