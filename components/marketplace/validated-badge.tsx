import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { CheckIcon } from "@/components/ui/icons";

export function ValidatedBadge() {
  const t = useTranslations("marketplace");
  return (
    <Badge tone="success">
      <CheckIcon className="h-3 w-3" />
      {t("listing.validated")}
    </Badge>
  );
}
