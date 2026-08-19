import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type {
  ConversationStatus,
  ConversationSummary,
} from "@/lib/db/conversations";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { ChevronRightIcon } from "@/components/ui/icons";

function statusTone(status: ConversationStatus): "success" | "accent" | "danger" {
  if (status === "ACCEPTED") return "success";
  if (status === "DECLINED") return "danger";
  return "accent";
}

export function ConversationList({ items }: { items: ConversationSummary[] }) {
  const t = useTranslations("messages");
  const locale = useLocale();

  return (
    <ul className="space-y-3">
      {items.map((c) => (
        <li key={c.id}>
          <Link
            href={`/messages/${c.id}`}
            className="flex items-center gap-4 rounded-card border border-border bg-surface p-4 transition hover:border-accent"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold text-foreground">
                  {/* Company appears only when RLS returned it (ACCEPTED); otherwise anonymous. */}
                  {c.counterpartyCompany ?? t("list.anonymous")}
                </span>
                <Badge tone={statusTone(c.status)}>{t(`status.${c.status}`)}</Badge>
              </div>
              <p className="truncate text-sm text-muted">
                {c.lastMessagePreview ?? t("list.noMessages")}
              </p>
              <p className="text-xs text-muted">
                {c.assetRef !== null
                  ? t("list.aboutAsset", { ref: `#${c.assetRef}` })
                  : t("list.generalEnquiry")}
                {c.lastMessageAt
                  ? ` · ${formatDate(c.lastMessageAt, locale)}`
                  : ""}
              </p>
            </div>
            <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
