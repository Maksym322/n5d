import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { isSuspended, requireUser } from "@/lib/db/session";
import { getBuyerById } from "@/lib/db/buyer-directory";
import { CONTACT_QUOTA, getMyPendingContactCount } from "@/lib/db/conversations";
import { formatTicketRange } from "@/lib/format";
import { jurisdictionName } from "@/lib/jurisdictions";
import { Badge } from "@/components/ui/badge";
import { ChevronRightIcon } from "@/components/ui/icons";
import { AttributeGrid, type Attribute } from "@/components/marketplace/attribute-grid";
import { ContactBuyerPanel } from "@/components/marketplace/contact-buyer-panel";
import { ReadOnlyNotice } from "@/components/marketplace/read-only-notice";

// Anonymous buyer detail + seller-initiated contact (F3). Keyed on the profile uuid (not
// enumerable). getBuyerById returns null for an opted-out (is_listed=false) or suspended buyer — RLS
// (migration 20260819140000) is authoritative — so the page 404s rather than rendering a shell.
export default async function BuyerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const buyer = await getBuyerById(id);
  if (!buyer) notFound();

  const suspended = await isSuspended();
  const pendingCount = suspended ? 0 : await getMyPendingContactCount();
  const t = await getTranslations("seller");
  const tm = await getTranslations("marketplace");
  const locale = await getLocale();

  const categoriesText =
    buyer.categories.length > 0
      ? buyer.categories.map((c) => tm(`enums.category.${c}`)).join(", ")
      : t("buyers.card.any");
  const jurisdictionsText =
    buyer.jurisdictions.length > 0
      ? buyer.jurisdictions.map((j) => jurisdictionName(j, locale)).join(", ")
      : t("buyers.card.any");

  const attributes: Attribute[] = [
    {
      label: t("buyers.card.investorType"),
      value: tm(`enums.investorType.${buyer.investorType}`),
    },
    {
      label: t("buyers.card.ticket"),
      value: formatTicketRange(
        buyer.ticketMinCents,
        buyer.ticketMaxCents,
        { upTo: (value) => tm("ticket.upTo", { value }), any: tm("ticket.any") },
        "EUR",
        locale,
      ),
    },
    { label: t("buyers.card.categories"), value: categoriesText },
    { label: t("buyers.card.jurisdictions"), value: jurisdictionsText },
  ];

  return (
    <main className="mx-auto max-w-[1240px] px-6 py-8">
      <Link
        href="/seller/buyers"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-accent"
      >
        <ChevronRightIcon className="h-4 w-4 rotate-180" />
        {t("buyers.detail.back")}
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <header className="space-y-3 rounded-card border border-border bg-surface p-5">
            <Badge tone="accent">{tm(`enums.investorType.${buyer.investorType}`)}</Badge>
            <h1 className="text-2xl font-bold text-foreground">{buyer.headline}</h1>
            <p className="text-sm text-muted">{t("buyers.detail.anonymousNote")}</p>
          </header>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              {t("buyers.detail.mandate")}
            </h2>
            <AttributeGrid items={attributes} />
          </section>
        </div>

        <aside className="space-y-6">
          {suspended ? (
            <ReadOnlyNotice />
          ) : (
            <ContactBuyerPanel
              buyerId={buyer.userId}
              pendingCount={pendingCount}
              quota={CONTACT_QUOTA}
            />
          )}
        </aside>
      </div>
    </main>
  );
}
