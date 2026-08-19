import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/actions/auth";
import { LocaleSwitcher } from "@/components/marketplace/locale-switcher";

// Shared shell header. Shows the active role, buyer navigation and a locale switcher.
export async function SiteHeader() {
  const t = await getTranslations("common");
  const nav = await getTranslations("marketplace.nav");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = typeof user?.app_metadata?.role === "string" ? user.app_metadata.role : null;
  const roleLabel = role ? t(`roles.${role}`) : "";

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-foreground">{t("appName")}</span>
            <span className="hidden text-sm text-muted sm:inline">{t("tagline")}</span>
          </Link>

          {user ? (
            <nav className="flex items-center gap-1 text-sm font-medium">
              {/* Role-aware nav: sellers manage listings and browse the buyer directory; buyers and
                  managers browse the public catalogue. Messages + profile are shared. */}
              {role === "SELLER" ? (
                <>
                  <Link
                    href="/seller"
                    className="rounded-pill px-3 py-1.5 text-foreground transition hover:bg-background"
                  >
                    {nav("dashboard")}
                  </Link>
                  <Link
                    href="/seller/buyers"
                    className="rounded-pill px-3 py-1.5 text-foreground transition hover:bg-background"
                  >
                    {nav("buyers")}
                  </Link>
                </>
              ) : (
                <Link
                  href="/assets"
                  className="rounded-pill px-3 py-1.5 text-foreground transition hover:bg-background"
                >
                  {nav("assets")}
                </Link>
              )}
              <Link
                href="/messages"
                className="rounded-pill px-3 py-1.5 text-foreground transition hover:bg-background"
              >
                {nav("messages")}
              </Link>
              <Link
                href="/profile"
                className="rounded-pill px-3 py-1.5 text-foreground transition hover:bg-background"
              >
                {nav("profile")}
              </Link>
            </nav>
          ) : null}
        </div>

        <div className="flex items-center gap-4">
          <LocaleSwitcher />
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted">
                {t("header.signedInAs", { role: roleLabel })}
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-pill border border-border px-4 py-1.5 text-sm font-medium text-foreground transition hover:bg-background"
                >
                  {t("header.signOut")}
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-pill bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground"
            >
              {t("header.signIn")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
