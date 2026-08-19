import { getTranslations } from "next-intl/server";
import { signInAs } from "@/actions/auth";

const ROLES = ["BUYER", "SELLER", "MANAGER"] as const;

export default async function LoginPage() {
  const t = await getTranslations("common");

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-6 px-6 py-16">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-foreground">{t("login.title")}</h1>
        <p className="text-sm text-muted">{t("login.subtitle")}</p>
      </div>

      <form className="grid gap-3">
        {ROLES.map((role) => (
          <button
            key={role}
            formAction={signInAs.bind(null, role)}
            className="rounded-card border border-border bg-surface px-5 py-3 text-base font-semibold text-foreground transition hover:border-accent hover:text-accent"
          >
            {t(`roles.${role}`)}
          </button>
        ))}
      </form>

      <p className="text-center text-xs text-muted">{t("login.note")}</p>
    </main>
  );
}
