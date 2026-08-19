import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { AccountStatus, AssetStatus } from "@/lib/db/admin-filters";

// Status pills for the registry. Tone mapping matches the seller dashboard (asset-status-group):
// active/published read as success, suspended as danger.
const ACCOUNT_TONE: Record<AccountStatus, "success" | "danger"> = {
  ACTIVE: "success",
  SUSPENDED: "danger",
};

const ASSET_TONE: Record<AssetStatus, "neutral" | "success" | "danger" | "accent"> = {
  DRAFT: "neutral",
  PUBLISHED: "success",
  SUSPENDED: "danger",
  SOLD: "accent",
};

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  const t = useTranslations("admin.status");
  return <Badge tone={ACCOUNT_TONE[status]}>{t(status)}</Badge>;
}

export function AssetStatusBadge({ status }: { status: AssetStatus }) {
  const t = useTranslations("admin.status");
  return <Badge tone={ASSET_TONE[status]}>{t(status)}</Badge>;
}
