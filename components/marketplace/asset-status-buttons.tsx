"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { changeAssetStatus } from "@/actions/seller-assets";
import type { AssetStatus } from "@/lib/db/seller-assets";
import { Button } from "@/components/ui/button";

// Status transitions the seller drives from the dashboard (F2). DRAFT → PUBLISHED, and for a live
// listing: mark SOLD or withdraw to DRAFT. SUSPENDED is never offered — that is moderation (ADR-2).
export function AssetStatusButtons({
  assetId,
  status,
  suspended = false,
}: {
  assetId: string;
  status: AssetStatus;
  suspended?: boolean;
}) {
  const t = useTranslations("seller");
  const router = useRouter();
  const [error, setError] = useState(false);
  const [isPending, startTransition] = useTransition();

  // F5: a suspended seller can't change status (is_active() blocks the update), so offer nothing.
  if (suspended) return null;

  function change(next: "DRAFT" | "PUBLISHED" | "SOLD") {
    setError(false);
    startTransition(async () => {
      const res = await changeAssetStatus({ id: assetId, status: next });
      if (res.ok) router.refresh();
      else setError(true);
    });
  }

  if (status === "SUSPENDED" || status === "SOLD") {
    return error ? <span className="text-xs text-danger">{t("dashboard.statusError")}</span> : null;
  }

  return (
    <div className="flex items-center gap-2">
      {status === "DRAFT" ? (
        <Button type="button" size="sm" onClick={() => change("PUBLISHED")} disabled={isPending}>
          {t("dashboard.publish")}
        </Button>
      ) : (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => change("SOLD")}
            disabled={isPending}
          >
            {t("dashboard.markSold")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => change("DRAFT")}
            disabled={isPending}
          >
            {t("dashboard.unpublish")}
          </Button>
        </>
      )}
      {error ? <span className="text-xs text-danger">{t("dashboard.statusError")}</span> : null}
    </div>
  );
}
