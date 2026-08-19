"use client";

import { useTranslations } from "next-intl";
import { Select } from "@/components/ui/select";
import { useCatalogueParams } from "@/components/marketplace/use-catalogue-params";

const OPTIONS = ["newest", "price_asc", "price_desc"] as const;

export function SortSelect() {
  const t = useTranslations("marketplace");
  const { searchParams, setParams } = useCatalogueParams();
  const current = searchParams.get("sort") ?? "newest";

  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      <span className="whitespace-nowrap">{t("sort.label")}</span>
      <Select
        value={current}
        onChange={(e) => setParams({ sort: e.target.value })}
        className="w-auto"
      >
        {OPTIONS.map((o) => (
          <option key={o} value={o}>
            {t(`sort.${o}`)}
          </option>
        ))}
      </Select>
    </label>
  );
}
