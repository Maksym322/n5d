import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import type { AccountStatus, AssetStatus } from "@/lib/db/admin-filters";

// Makes F4's propagation legible on the detail page: it states what is public *now*, framed by
// the current status. Because it is server-rendered and the moderation form refreshes the page
// on success, the same panel shows the "before" and then the "after" — the count that will
// change, then the count that did — so the propagation is observed, not asserted.

function Panel({ tone, children }: { tone: "neutral" | "danger"; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-card border-l-4 px-4 py-3 text-sm",
        tone === "danger"
          ? "border-danger bg-danger/5 text-danger"
          : "border-accent bg-accent/5 text-foreground",
      )}
    >
      {children}
    </div>
  );
}

export function SellerConsequence({
  status,
  publishedCount,
}: {
  status: AccountStatus;
  publishedCount: number;
}) {
  const t = useTranslations("admin.consequence");
  const suspended = status === "SUSPENDED";
  return (
    <Panel tone={suspended ? "danger" : "neutral"}>
      {suspended
        ? t("sellerSuspended", { count: publishedCount })
        : t("sellerActive", { count: publishedCount })}
    </Panel>
  );
}

export function BuyerConsequence({ status }: { status: AccountStatus }) {
  const t = useTranslations("admin.consequence");
  const suspended = status === "SUSPENDED";
  return (
    <Panel tone={suspended ? "danger" : "neutral"}>
      {suspended ? t("buyerSuspended") : t("buyerActive")}
    </Panel>
  );
}

export function AssetConsequence({ status }: { status: AssetStatus }) {
  const t = useTranslations("admin.consequence");
  const key =
    status === "PUBLISHED"
      ? "assetPublished"
      : status === "SUSPENDED"
        ? "assetSuspended"
        : status === "DRAFT"
          ? "assetDraft"
          : "assetSold";
  return <Panel tone={status === "SUSPENDED" ? "danger" : "neutral"}>{t(key)}</Panel>;
}
