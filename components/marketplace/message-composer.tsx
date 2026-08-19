"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { sendMessage } from "@/actions/conversations";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const t = useTranslations("messages");
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await sendMessage({ conversationId, body });
      if (res.ok) {
        setBody("");
        router.refresh();
      } else {
        setError(res.error === "NOT_ALLOWED" ? t("thread.notAllowed") : t("thread.error"));
      }
    });
  }

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Textarea
        rows={3}
        maxLength={4000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t("thread.composerPlaceholder")}
        disabled={isPending}
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending || body.trim().length === 0}>
          {isPending ? t("thread.sending") : t("thread.send")}
        </Button>
      </div>
    </form>
  );
}
