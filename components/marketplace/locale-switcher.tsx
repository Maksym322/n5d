"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { setLocale } from "@/actions/locale";

const LOCALES = ["en", "uk"] as const;

export function LocaleSwitcher() {
  const active = useLocale();
  const t = useTranslations("common");
  const [pending, startTransition] = useTransition();

  function choose(next: (typeof LOCALES)[number]) {
    const data = new FormData();
    data.set("locale", next);
    startTransition(() => {
      void setLocale(data);
    });
  }

  return (
    <div className="flex items-center gap-1" aria-label={t("header.language")}>
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => choose(locale)}
          disabled={pending || locale === active}
          aria-pressed={locale === active}
          className={`rounded-pill px-2.5 py-1 text-xs font-semibold uppercase transition ${
            locale === active
              ? "bg-foreground text-white"
              : "text-muted hover:bg-background disabled:opacity-50"
          }`}
        >
          {locale}
        </button>
      ))}
    </div>
  );
}
