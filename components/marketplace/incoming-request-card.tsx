import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { ConversationSummary } from "@/lib/db/conversations";
import { formatDate } from "@/lib/format";
import { buttonClasses } from "@/components/ui/button";
import { RequestActions } from "@/components/marketplace/request-actions";
import { ReadOnlyNotice } from "@/components/marketplace/read-only-notice";

// An incoming PENDING request on the seller dashboard (F2/F3). The counterparty stays anonymous
// until acceptance (company is null by RLS). Accept/decline is available inline; "Open" links to the
// full thread. Symmetric — the same shape serves a buyer who received a seller-initiated request.
export function IncomingRequestCard({
  request,
  suspended = false,
}: {
  request: ConversationSummary;
  suspended?: boolean;
}) {
  const t = useTranslations("seller");
  const tmsg = useTranslations("messages");
  const locale = useLocale();

  const subject =
    request.assetRef !== null
      ? tmsg("list.aboutAsset", { ref: `#${request.assetRef}` })
      : tmsg("list.generalEnquiry");

  return (
    <article className="space-y-3 rounded-card border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-semibold text-foreground">{t("dashboard.anonymousCounterparty")}</p>
          <p className="text-xs text-muted">
            {subject} · {formatDate(request.createdAt, locale)}
          </p>
        </div>
        <Link
          href={`/messages/${request.id}`}
          className={buttonClasses({ variant: "ghost", size: "sm" })}
        >
          {t("dashboard.openThread")}
        </Link>
      </div>

      {request.lastMessagePreview ? (
        <p className="line-clamp-2 rounded-thumb bg-background px-3 py-2 text-sm text-muted">
          {request.lastMessagePreview}
        </p>
      ) : null}

      {suspended ? <ReadOnlyNotice /> : <RequestActions conversationId={request.id} />}
    </article>
  );
}
