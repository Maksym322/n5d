"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { SellerProfileFull } from "@/lib/db/seller";
import { SEEDED_JURISDICTIONS, jurisdictionName } from "@/lib/jurisdictions";
import { updateMySellerProfile } from "@/actions/seller";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { CheckIcon } from "@/components/ui/icons";

// Seller profile editor (brief §6). The public/private split is the product, so it is made legible:
// two labelled sections make clear which fields sellers-see-anonymously vs which are revealed only
// when a contact request is accepted (ADR-10/11).
export function SellerProfileForm({ initial }: { initial: SellerProfileFull }) {
  const t = useTranslations("seller");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [headline, setHeadline] = useState(initial.profile?.headline ?? "");
  const [jurisdiction, setJurisdiction] = useState(
    initial.profile?.jurisdiction ?? SEEDED_JURISDICTIONS[0],
  );
  const [description, setDescription] = useState(initial.profile?.description ?? "");
  const [companyName, setCompanyName] = useState(initial.identity?.companyName ?? "");
  const [registrationNumber, setRegistrationNumber] = useState(
    initial.identity?.registrationNumber ?? "",
  );
  const [website, setWebsite] = useState(initial.identity?.website ?? "");
  const [contactName, setContactName] = useState(initial.identity?.contactName ?? "");

  function submit() {
    setSaved(false);
    setFormError(null);
    startTransition(async () => {
      const res = await updateMySellerProfile({
        headline,
        jurisdiction,
        description,
        companyName,
        registrationNumber,
        website,
        contactName,
      });
      if (res.ok) setSaved(true);
      else if (res.error === "INVALID") setFormError(t("profile.form.invalid"));
      else setFormError(t("profile.form.error"));
    });
  }

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <section className="space-y-4 rounded-card border border-border bg-surface p-5">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">
            {t("profile.public.title")}
          </h2>
          <p className="text-sm text-muted">{t("profile.public.note")}</p>
        </div>

        <Field label={t("profile.form.headline")} htmlFor="headline">
          <Input
            id="headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder={t("profile.form.headlinePlaceholder")}
            maxLength={200}
            required
          />
        </Field>

        <Field label={t("profile.form.jurisdiction")} htmlFor="jurisdiction">
          <Select
            id="jurisdiction"
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value)}
          >
            {SEEDED_JURISDICTIONS.map((code) => (
              <option key={code} value={code}>
                {jurisdictionName(code, locale)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t("profile.form.description")} htmlFor="description">
          <Textarea
            id="description"
            rows={4}
            maxLength={4000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("profile.form.descriptionPlaceholder")}
          />
        </Field>
      </section>

      <section className="space-y-4 rounded-card border border-dashed border-accent/40 bg-surface p-5">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">
            {t("profile.private.title")}
          </h2>
          <p className="text-sm text-muted">{t("profile.private.note")}</p>
        </div>

        <Field label={t("profile.form.companyName")} htmlFor="companyName">
          <Input
            id="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            maxLength={200}
            required
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("profile.form.registrationNumber")} htmlFor="registrationNumber">
            <Input
              id="registrationNumber"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              maxLength={100}
            />
          </Field>
          <Field label={t("profile.form.website")} htmlFor="website">
            <Input
              id="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              maxLength={200}
              placeholder="https://"
            />
          </Field>
        </div>

        <Field label={t("profile.form.contactName")} htmlFor="contactName">
          <Input
            id="contactName"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            maxLength={200}
          />
        </Field>
      </section>

      {formError ? <p className="text-sm text-danger">{formError}</p> : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? t("profile.form.saving") : t("profile.form.save")}
        </Button>
        {saved ? (
          <span className="inline-flex items-center gap-1 text-sm text-success">
            <CheckIcon className="h-4 w-4" />
            {t("profile.form.saved")}
          </span>
        ) : null}
      </div>
    </form>
  );
}
