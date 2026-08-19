"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

// Shared registry tab strip (Buyers / Sellers / Assets). Extracted once and rendered by each
// list page rather than copied into three files. Tabs are plain links — the active tab is
// derived from the path (ADR-3: navigation state in the URL, not client state). Switching
// tabs drops the previous tab's filter params, which live in each list page's own searchParams.
const TABS = [
  { key: "buyers", href: "/admin/buyers" },
  { key: "sellers", href: "/admin/sellers" },
  { key: "assets", href: "/admin/assets" },
] as const;

export function RegistryTabs() {
  const t = useTranslations("admin.tabs");
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 border-b border-border" aria-label="Registry">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition",
              active
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground",
            )}
          >
            {t(tab.key)}
          </Link>
        );
      })}
    </nav>
  );
}
