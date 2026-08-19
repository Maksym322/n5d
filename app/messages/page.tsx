import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/db/session";
import { listMyConversations } from "@/lib/db/conversations";
import { buttonClasses } from "@/components/ui/button";
import { ConversationList } from "@/components/marketplace/conversation-list";
import { EmptyState } from "@/components/marketplace/empty-state";

export default async function MessagesPage() {
  await requireUser();
  const items = await listMyConversations();
  const t = await getTranslations("messages");

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted">{t("subtitle")}</p>
      </header>

      {items.length === 0 ? (
        <EmptyState
          title={t("empty.title")}
          description={t("empty.body")}
          action={
            <Link
              href="/assets"
              className={buttonClasses({ variant: "outline", size: "sm" })}
            >
              {t("empty.browse")}
            </Link>
          }
        />
      ) : (
        <ConversationList items={items} />
      )}
    </main>
  );
}
