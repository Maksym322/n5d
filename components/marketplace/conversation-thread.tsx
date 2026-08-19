import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { ConversationThread } from "@/lib/db/conversations";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { ChevronRightIcon } from "@/components/ui/icons";
import { MessageComposer } from "@/components/marketplace/message-composer";
import { RequestActions } from "@/components/marketplace/request-actions";
import { ReadOnlyNotice } from "@/components/marketplace/read-only-notice";

export function ConversationThreadView({
  thread,
  suspended = false,
}: {
  thread: ConversationThread;
  suspended?: boolean;
}) {
  const t = useTranslations("messages");
  const locale = useLocale();

  const tone =
    thread.status === "ACCEPTED"
      ? "success"
      : thread.status === "DECLINED"
        ? "danger"
        : "accent";

  const subject =
    thread.assetRef !== null
      ? t("thread.aboutAsset", { ref: `#${thread.assetRef}` })
      : t("thread.generalEnquiry");

  return (
    <div className="space-y-5">
      <Link
        href="/messages"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-accent"
      >
        <ChevronRightIcon className="h-4 w-4 rotate-180" />
        {t("thread.back")}
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface p-4">
        <div className="space-y-1">
          <h1 className="text-lg font-bold text-foreground">
            {/* Anonymous until ACCEPTED — the value simply falls out of what lib/db returns. */}
            {thread.counterpartyCompany ?? t("thread.anonymous")}
          </h1>
          <p className="text-sm text-muted">{subject}</p>
        </div>
        <Badge tone={tone}>{t(`status.${thread.status}`)}</Badge>
      </header>

      <ol className="space-y-3">
        {thread.messages.map((m) => (
          <li
            key={m.id}
            className={cn("flex", m.mine ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-card px-4 py-2 text-sm",
                m.mine
                  ? "bg-accent text-accent-foreground"
                  : "border border-border bg-surface text-foreground",
              )}
            >
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <time
                className={cn(
                  "mt-1 block text-[11px]",
                  m.mine ? "text-accent-foreground/70" : "text-muted",
                )}
              >
                {formatDate(m.createdAt, locale)}
              </time>
            </div>
          </li>
        ))}
      </ol>

      {thread.status === "ACCEPTED" ? (
        // F5: a suspended user keeps read access to the thread but cannot post (is_active() blocks
        // the insert), so the composer is replaced with a read-only note rather than left to fail.
        suspended ? (
          <ReadOnlyNotice />
        ) : (
          <MessageComposer conversationId={thread.id} />
        )
      ) : thread.status === "PENDING" && !thread.initiatedByMe ? (
        // I received this request — accept reveals both identities and unlocks the thread; decline
        // frees the sender's quota (ADR-11, F2/F3).
        <div className="space-y-3 rounded-card border border-dashed border-border bg-surface p-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              {t("thread.incomingTitle")}
            </p>
            <p className="mt-1 text-sm text-muted">{t("thread.incomingBody")}</p>
          </div>
          {suspended ? <ReadOnlyNotice /> : <RequestActions conversationId={thread.id} />}
        </div>
      ) : (
        <div className="rounded-card border border-dashed border-border bg-surface p-4">
          <p className="text-sm font-medium text-foreground">
            {thread.status === "DECLINED"
              ? t("thread.declinedTitle")
              : t("thread.lockedPendingTitle")}
          </p>
          <p className="mt-1 text-sm text-muted">
            {thread.status === "DECLINED"
              ? t("thread.declined")
              : t("thread.lockedPending")}
          </p>
        </div>
      )}
    </div>
  );
}
