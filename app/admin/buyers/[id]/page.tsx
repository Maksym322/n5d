import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { formatTicketRange } from "@/lib/format";
import { getAdminBuyer, listModerationLog } from "@/lib/db/admin";
import { AccountStatusBadge } from "@/components/admin/status-badge";
import { BuyerConsequence } from "@/components/admin/consequence-panel";
import { ModerationForm } from "@/components/admin/moderation-form";
import { LogTable } from "@/components/admin/log-table";
import { InfoCard } from "@/components/admin/info-card";

export default async function AdminBuyerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const buyer = await getAdminBuyer(id);
  if (!buyer) notFound();

  const history = await listModerationLog({
    action: null,
    targetType: null,
    page: 1,
    targetId: id,
  });
  const t = await getTranslations("admin");
  const tm = await getTranslations("marketplace");
  const locale = await getLocale();
  const action = buyer.status === "ACTIVE" ? "SUSPEND" : "REACTIVATE";

  const list = (items: string[]) => (items.length ? items.join(", ") : t("detail.none"));

  return (
    <>
      <Link href="/admin/buyers" className="text-sm text-muted transition hover:text-foreground">
        ← {t("detail.backBuyers")}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">
            {buyer.companyName ?? buyer.displayName}
          </h1>
          <p className="text-sm text-muted">
            {buyer.displayName}
            {buyer.headline ? ` · ${buyer.headline}` : ""}
          </p>
        </div>
        <AccountStatusBadge status={buyer.status} />
      </header>

      <section className="space-y-3">
        <BuyerConsequence status={buyer.status} />
        <ModerationForm kind="participant" targetId={buyer.userId} action={action} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <InfoCard
          title={t("detail.identity")}
          rows={[
            [t("detail.company"), buyer.companyName],
            [t("detail.contact"), buyer.contactName],
            [t("detail.website"), buyer.website],
            [t("detail.directory"), buyer.isListed ? t("detail.listed") : t("detail.optedOut")],
          ]}
        />
        <InfoCard
          title={t("detail.mandate")}
          rows={[
            [
              t("detail.investorType"),
              buyer.investorType ? tm(`enums.investorType.${buyer.investorType}`) : null,
            ],
            [t("detail.ticket"), formatTicketRange(
              buyer.ticketMinCents,
              buyer.ticketMaxCents,
              { upTo: (value) => tm("ticket.upTo", { value }), any: tm("ticket.any") },
              "EUR",
              locale,
            )],
            [t("detail.categories"), list(buyer.categories.map((c) => tm(`enums.category.${c}`)))],
            [t("detail.jurisdictions"), list(buyer.jurisdictions)],
            [t("detail.dealTypes"), list(buyer.dealTypes.map((d) => tm(`enums.dealType.${d}`)))],
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">{t("detail.history")}</h2>
        {history.items.length ? (
          <LogTable entries={history.items} />
        ) : (
          <p className="text-sm text-muted">{t("empty.history")}</p>
        )}
      </section>
    </>
  );
}
