import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const t = await getTranslations("common");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto max-w-[1240px] px-6 py-16">
      <div className="mx-auto max-w-2xl rounded-card border border-border bg-surface p-10 text-center">
        <h1 className="text-3xl font-bold text-foreground">{t("home.title")}</h1>
        <p className="mt-3 text-muted">{t("home.body")}</p>
        {!user && (
          <Link
            href="/login"
            className="mt-6 inline-block rounded-pill bg-accent px-5 py-2 text-sm font-medium text-accent-foreground"
          >
            {t("header.signIn")}
          </Link>
        )}
      </div>
    </main>
  );
}
