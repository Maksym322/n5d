"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createContactRequest, type ContactResult } from "@/actions/conversations";
import { Textarea } from "@/components/ui/input";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { CheckIcon } from "@/components/ui/icons";

export function ContactPanel({
  sellerId,
  assetId,
  pendingCount,
  quota,
}: {
  sellerId: string;
  assetId: string;
  pendingCount: number;
  quota: number;
}) {
  const t = useTranslations("marketplace");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ContactResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const atQuota = pendingCount >= quota;

  function submit() {
    setResult(null);
    startTransition(async () => {
      setResult(
        await createContactRequest({ sellerId, assetId, openingMessage: message }),
      );
    });
  }

  if (result?.ok) {
    return (
      <section id="contact" className="rounded-card border border-border bg-surface p-5">
        <div className="flex items-center gap-2 text-success">
          <CheckIcon className="h-5 w-5" />
          <p className="text-sm font-medium">{t("contact.success")}</p>
        </div>
        <Link
          href={`/messages/${result.conversationId}`}
          className={buttonClasses({ variant: "solid", size: "sm", className: "mt-4" })}
        >
          {t("contact.goToMessages")}
        </Link>
      </section>
    );
  }

  const errorText = (() => {
    if (!result || result.ok) return null;
    if (result.error === "QUOTA_EXCEEDED")
      return t("contact.quotaExceeded", { max: quota });
    if (result.error === "ALREADY_EXISTS") return t("contact.alreadyExists");
    if (result.error === "NOT_ALLOWED") return t("contact.notAllowed");
    return t("contact.error");
  })();

  return (
    <section id="contact" className="space-y-4 rounded-card border border-border bg-surface p-5">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">
          {t("contact.heading")}
        </h2>
        <p className="text-sm text-muted">{t("contact.anonymousNote")}</p>
      </div>

      {/* Quota counter shown BEFORE the action, so the limit is never a surprise (D5). */}
      <div
        className={`flex items-center justify-between rounded-thumb border px-3 py-2 text-sm ${
          atQuota ? "border-danger/40 text-danger" : "border-border text-muted"
        }`}
      >
        <span>{t("contact.quota", { count: pendingCount, max: quota })}</span>
      </div>

      <Field label={t("contact.openingLabel")}>
        <Textarea
          rows={4}
          maxLength={4000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("contact.openingPlaceholder")}
          disabled={atQuota || isPending}
        />
      </Field>

      {errorText ? <p className="text-sm text-danger">{errorText}</p> : null}
      {atQuota && !errorText ? (
        <p className="text-sm text-danger">
          {t("contact.quotaExceeded", { max: quota })}
        </p>
      ) : null}

      <Button
        type="button"
        onClick={submit}
        disabled={atQuota || isPending || message.trim().length === 0}
      >
        {isPending ? t("contact.sending") : t("contact.send")}
      </Button>
    </section>
  );
}
