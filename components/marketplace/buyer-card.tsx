import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { BuyerCard as BuyerCardData } from "@/lib/db/buyer-directory";
import { formatTicketRange } from "@/lib/format";
import { jurisdictionName } from "@/lib/jurisdictions";
import { Badge } from "@/components/ui/badge";
import { ChevronRightIcon } from "@/components/ui/icons";

// Anonymous buyer card (D1). Renders the mandate only — investor type, ticket range, categories,
// jurisdictions — never a company name (buyer_profiles holds none). Links to the detail route,
// keyed on the non-enumerable profile uuid.
export function BuyerCard({ buyer }: { buyer: BuyerCardData }) {
  const t = useTranslations("seller");
  const tm = useTranslations("marketplace");
  const locale = useLocale();

  return (
    <Link
      href={`/seller/buyers/${buyer.userId}`}
      className="flex items-start gap-4 rounded-card border border-border bg-surface p-5 transition hover:border-accent"
    >
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">{tm(`enums.investorType.${buyer.investorType}`)}</Badge>
          <span className="text-sm font-semibold text-accent">
            {formatTicketRange(buyer.ticketMinCents, buyer.ticketMaxCents, "EUR", locale)}
          </span>
        </div>

        <p className="font-semibold text-foreground">{buyer.headline}</p>

        <div className="flex flex-wrap gap-4 text-xs text-muted">
          <div className="space-y-1">
            <span className="uppercase tracking-wide">{t("buyers.card.categories")}</span>
            <div className="flex flex-wrap gap-1.5">
              {buyer.categories.length > 0 ? (
                buyer.categories.map((c) => (
                  <span
                    key={c}
                    className="rounded-pill bg-background px-2 py-0.5 text-xs font-medium text-foreground"
                  >
                    {tm(`enums.category.${c}`)}
                  </span>
                ))
              ) : (
                <span className="text-muted">{t("buyers.card.any")}</span>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <span className="uppercase tracking-wide">
              {t("buyers.card.jurisdictions")}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {buyer.jurisdictions.length > 0 ? (
                buyer.jurisdictions.map((j) => (
                  <span
                    key={j}
                    className="rounded-pill bg-background px-2 py-0.5 text-xs font-medium text-foreground"
                  >
                    {jurisdictionName(j)}
                  </span>
                ))
              ) : (
                <span className="text-muted">{t("buyers.card.any")}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted" />
    </Link>
  );
}
