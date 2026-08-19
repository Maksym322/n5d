"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { moderateAsset, moderateParticipant } from "@/actions/moderation";

type ParticipantAction = "SUSPEND" | "REACTIVATE";
type AssetAction = "SUSPEND_ASSET" | "REPUBLISH_ASSET";

const REASON_MIN = 10;

// Inline moderation control on a detail page. The min-10 counter is UX only — the guarantee
// is the DB CHECK on moderation_log.reason, which the action maps to REASON_TOO_SHORT, so a
// constraint violation surfaces here as a form error, never a 500. On success the server data
// is refreshed so the status badge and the consequence panel reflect the change immediately.
export function ModerationForm(
  props:
    | { kind: "participant"; targetId: string; action: ParticipantAction; publishedCount?: number }
    | { kind: "asset"; targetId: string; action: AssetAction },
) {
  const { kind, targetId, action } = props;
  const t = useTranslations("admin.moderate");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDanger = action === "SUSPEND" || action === "SUSPEND_ASSET";
  const count = reason.trim().length;
  const valid = count >= REASON_MIN;
  const noteCount = kind === "participant" ? props.publishedCount ?? 0 : 0;
  const dangerBtn = "border-danger/40 text-danger hover:border-danger hover:text-danger";

  async function onConfirm() {
    // Client-side enforcement of the 10-char minimum surfaces as an inline error rather than a
    // silently disabled button — but it is not the guarantee. The action re-checks (zod) and the
    // moderation_log CHECK is the backstop; both map to the same REASON_TOO_SHORT shown here.
    if (reason.trim().length < REASON_MIN) {
      setError(t("errors.REASON_TOO_SHORT"));
      return;
    }
    setPending(true);
    setError(null);
    const res =
      kind === "participant"
        ? await moderateParticipant({ userId: targetId, action, reason: reason.trim() })
        : await moderateAsset({ assetId: targetId, action, reason: reason.trim() });
    setPending(false);
    if (res.ok) {
      setOpen(false);
      setReason("");
      router.refresh();
    } else {
      setError(t(`errors.${res.error}`));
    }
  }

  if (!open) {
    return (
      <Button
        variant={isDanger ? "outline" : "solid"}
        size="sm"
        className={isDanger ? dangerBtn : undefined}
        onClick={() => setOpen(true)}
      >
        {t(`trigger.${action}`)}
      </Button>
    );
  }

  const fieldId = `mod-reason-${targetId}`;
  return (
    <div className="space-y-3 rounded-card border border-border bg-surface p-4">
      <p className="text-sm text-muted">{t(`note.${action}`, { count: noteCount })}</p>
      <Field label={t("reasonLabel")} htmlFor={fieldId} hint={t("reasonHint")} error={error}>
        <Textarea
          id={fieldId}
          rows={3}
          value={reason}
          maxLength={500}
          placeholder={t("reasonPlaceholder")}
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>
      <div className="flex items-center justify-between gap-3">
        <span className={cn("text-xs tabular-nums", valid ? "text-muted" : "text-danger")}>
          {t("counter", { count })}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
            {t("cancel")}
          </Button>
          <Button
            variant={isDanger ? "outline" : "solid"}
            size="sm"
            className={isDanger ? dangerBtn : undefined}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? t("submitting") : t(`confirm.${action}`)}
          </Button>
        </div>
      </div>
    </div>
  );
}
