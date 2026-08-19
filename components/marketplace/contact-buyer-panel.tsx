"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  createSellerContactRequest,
  type ContactResult,
} from "@/actions/conversations";
import { Textarea } from "@/components/ui/input";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { CheckIcon } from "@/components/ui/icons";

// Seller-initiated contact from a buyer card (F3). Mirror of ContactPanel with the roles swapped;
// the quota counter is shown before the action so the D5 limit is never a surprise — symmetric.
export function ContactBuyerPanel({
  buyerId,
  pendingCount,
  quota,
}: {
  buyerId: string;
  pendingCount: number;
  quota: number;
}) {
  const t = useTranslations("seller");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ContactResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const atQuota = pendingCount >= quota;

  function submit() {
    setResult(null);
    startTransition(async () => {
      setResult(
        await createSellerContactRequest({ buyerId, openingMessage: message }),
      );
    });
  }

  if (result?.ok) {
    return (
      <section id="contact" className="rounded-card border border-border bg-surface p-5">
        <div className="flex items-center gap-2 text-success">
          <CheckIcon className="h-5 w-5" />
          <p className="text-sm font-medium">{t("buyers.contact.success")}</p>
        </div>
        <Link
          href={`/messages/${result.conversationId}`}
          className={buttonClasses({ variant: "solid", size: "sm", className: "mt-4" })}
        >
          {t("buyers.contact.goToMessages")}
        </Link>
      </section>
    );
  }

  const errorText = (() => {
    if (!result || result.ok) return null;
    if (result.error === "QUOTA_EXCEEDED")
      return t("buyers.contact.quotaExceeded", { max: quota });
    if (result.error === "ALREADY_EXISTS") return t("buyers.contact.alreadyExists");
    if (result.error === "NOT_ALLOWED") return t("buyers.contact.notAllowed");
    return t("buyers.contact.error");
  })();

  return (
    <section id="contact" className="space-y-4 rounded-card border border-border bg-surface p-5">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">
          {t("buyers.contact.heading")}
        </h2>
        <p className="text-sm text-muted">{t("buyers.contact.anonymousNote")}</p>
      </div>

      {/* Quota counter shown BEFORE the action (D5). */}
      <div
        className={`flex items-center justify-between rounded-thumb border px-3 py-2 text-sm ${
          atQuota ? "border-danger/40 text-danger" : "border-border text-muted"
        }`}
      >
        <span>{t("buyers.contact.quota", { count: pendingCount, max: quota })}</span>
      </div>

      <Field label={t("buyers.contact.openingLabel")}>
        <Textarea
          rows={4}
          maxLength={4000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("buyers.contact.openingPlaceholder")}
          disabled={atQuota || isPending}
        />
      </Field>

      {errorText ? <p className="text-sm text-danger">{errorText}</p> : null}
      {atQuota && !errorText ? (
        <p className="text-sm text-danger">
          {t("buyers.contact.quotaExceeded", { max: quota })}
        </p>
      ) : null}

      <Button
        type="button"
        onClick={submit}
        disabled={atQuota || isPending || message.trim().length === 0}
      >
        {isPending ? t("buyers.contact.sending") : t("buyers.contact.send")}
      </Button>
    </section>
  );
}
