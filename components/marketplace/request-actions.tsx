"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { respondToRequest } from "@/actions/conversations";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";

// Accept / decline an incoming PENDING request (F2/F3). Symmetric — shown to whichever party did
// not initiate. Used both inline in the conversation thread and on the seller dashboard.
export function RequestActions({ conversationId }: { conversationId: string }) {
  const t = useTranslations("messages");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function respond(decision: "ACCEPT" | "DECLINE") {
    setError(null);
    startTransition(async () => {
      const res = await respondToRequest({ conversationId, decision });
      if (res.ok) {
        router.refresh();
      } else {
        setError(
          res.error === "NOT_ALLOWED" ? t("respond.notAllowed") : t("respond.error"),
        );
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => respond("ACCEPT")}
          disabled={isPending}
        >
          <CheckIcon className="h-4 w-4" />
          {t("respond.accept")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => respond("DECLINE")}
          disabled={isPending}
        >
          {t("respond.decline")}
        </Button>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
