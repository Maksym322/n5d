"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Constants } from "@/lib/types/database";
import type { BuyerMandate } from "@/lib/db/buyer";
import type { AssetCategory, DealType } from "@/lib/db/assets";
import type { InvestorType } from "@/lib/db/buyer";
import { SEEDED_JURISDICTIONS, jurisdictionName } from "@/lib/jurisdictions";
import { updateMyBuyerProfile } from "@/actions/buyer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { CheckIcon } from "@/components/ui/icons";

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

const centsToEuro = (v: number | null) => (v === null ? "" : String(v / 100));
const euroToCents = (v: string): number | null =>
  v.trim() ? Math.max(0, Math.round(Number(v) * 100)) : null;

export function MandateForm({ initial }: { initial: BuyerMandate | null }) {
  const t = useTranslations("profile");
  const tm = useTranslations("marketplace");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);

  const [headline, setHeadline] = useState(initial?.headline ?? "");
  const [investorType, setInvestorType] = useState<InvestorType>(
    initial?.investorType ?? Constants.public.Enums.investor_type[0],
  );
  const [categories, setCategories] = useState<AssetCategory[]>(
    initial?.categories ?? [],
  );
  const [jurisdictions, setJurisdictions] = useState<string[]>(
    initial?.jurisdictions ?? [],
  );
  const [dealTypes, setDealTypes] = useState<DealType[]>(initial?.dealTypes ?? []);
  const [ticketMin, setTicketMin] = useState(centsToEuro(initial?.ticketMinCents ?? null));
  const [ticketMax, setTicketMax] = useState(centsToEuro(initial?.ticketMaxCents ?? null));
  const [isListed, setIsListed] = useState(initial?.isListed ?? true);

  function submit() {
    setSaved(false);
    setFormError(null);
    setRangeError(null);
    startTransition(async () => {
      const res = await updateMyBuyerProfile({
        headline,
        investorType,
        categories,
        jurisdictions,
        dealTypes,
        ticketMinCents: euroToCents(ticketMin),
        ticketMaxCents: euroToCents(ticketMax),
        isListed,
      });
      if (res.ok) {
        setSaved(true);
      } else if (res.error === "TICKET_RANGE_INVALID") {
        setRangeError(t("form.ticketRangeInvalid"));
      } else if (res.error === "INVALID") {
        setFormError(t("form.invalid"));
      } else {
        setFormError(t("form.error"));
      }
    });
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Field label={t("form.headline")} htmlFor="headline">
        <Input
          id="headline"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder={t("form.headlinePlaceholder")}
          maxLength={200}
          required
        />
      </Field>

      <Field label={t("form.investorType")} htmlFor="investorType">
        <Select
          id="investorType"
          value={investorType}
          onChange={(e) => setInvestorType(e.target.value as InvestorType)}
        >
          {Constants.public.Enums.investor_type.map((it) => (
            <option key={it} value={it}>
              {tm(`enums.investorType.${it}`)}
            </option>
          ))}
        </Select>
      </Field>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">
          {t("form.categories")}
        </legend>
        <div className="flex flex-wrap gap-3">
          {Constants.public.Enums.asset_category.map((c) => (
            <label key={c} className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={categories.includes(c)}
                onChange={() => setCategories((prev) => toggle(prev, c))}
              />
              {tm(`enums.category.${c}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">
          {t("form.jurisdictions")}
        </legend>
        <div className="flex flex-wrap gap-3">
          {SEEDED_JURISDICTIONS.map((code) => (
            <label
              key={code}
              className="flex items-center gap-2 text-sm text-foreground"
            >
              <Checkbox
                checked={jurisdictions.includes(code)}
                onChange={() => setJurisdictions((prev) => toggle(prev, code))}
              />
              {jurisdictionName(code)}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">
          {t("form.dealTypes")}
        </legend>
        <div className="flex flex-wrap gap-3">
          {Constants.public.Enums.deal_type.map((d) => (
            <label key={d} className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={dealTypes.includes(d)}
                onChange={() => setDealTypes((prev) => toggle(prev, d))}
              />
              {tm(`enums.dealType.${d}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-4">
        <Field label={t("form.ticketMin")} htmlFor="ticketMin" hint={t("form.ticketHint")}>
          <Input
            id="ticketMin"
            type="number"
            min={0}
            inputMode="numeric"
            value={ticketMin}
            onChange={(e) => setTicketMin(e.target.value)}
          />
        </Field>
        <Field label={t("form.ticketMax")} htmlFor="ticketMax" error={rangeError}>
          <Input
            id="ticketMax"
            type="number"
            min={0}
            inputMode="numeric"
            value={ticketMax}
            onChange={(e) => setTicketMax(e.target.value)}
          />
        </Field>
      </div>

      <label className="flex items-start gap-3 rounded-thumb border border-border p-3">
        <Checkbox
          checked={isListed}
          onChange={(e) => setIsListed(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          <span className="block text-sm font-medium text-foreground">
            {t("form.isListed")}
          </span>
          <span className="block text-xs text-muted">{t("form.isListedHint")}</span>
        </span>
      </label>

      {formError ? <p className="text-sm text-danger">{formError}</p> : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? t("form.saving") : t("form.save")}
        </Button>
        {saved ? (
          <span className="inline-flex items-center gap-1 text-sm text-success">
            <CheckIcon className="h-4 w-4" />
            {t("form.saved")}
          </span>
        ) : null}
      </div>
    </form>
  );
}
