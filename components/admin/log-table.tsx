import { useLocale, useTranslations } from "next-intl";
import { formatAssetRef, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import type { ModLogEntry, ModerationActionType } from "@/lib/db/admin";

// The moderation audit trail as stacked cards: actor · action · target on one line, reason
// below, timestamp on the right. Used both on /admin/log (global) and on a detail page scoped
// to one target (per-target history).
const ACTION_TONE: Record<ModerationActionType, "danger" | "success"> = {
  SUSPEND: "danger",
  SUSPEND_ASSET: "danger",
  REACTIVATE: "success",
  REPUBLISH_ASSET: "success",
};

export function LogTable({ entries }: { entries: ModLogEntry[] }) {
  const t = useTranslations("admin");
  const tm = useTranslations("marketplace");
  const locale = useLocale();
  return (
    <div className="space-y-2">
      {entries.map((e) => (
        <div key={e.id} className="space-y-1.5 rounded-card border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-foreground">
                {e.actorName ?? t("log.unknownTarget")}
              </span>
              <Badge tone={ACTION_TONE[e.action]}>{t(`actions.${e.action}`)}</Badge>
              <span className="text-muted">
                {e.targetRef !== null
                  ? tm("listing.ref", { ref: formatAssetRef(e.targetRef) })
                  : e.targetLabel ?? t("log.unknownTarget")}
              </span>
            </div>
            <span className="text-xs text-muted">{formatDate(e.createdAt, locale)}</span>
          </div>
          <p className="text-sm text-muted">{e.reason}</p>
        </div>
      ))}
    </div>
  );
}
