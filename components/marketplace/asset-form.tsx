"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Constants } from "@/lib/types/database";
import type { MyAssetDetail } from "@/lib/db/seller-assets";
import type { AssetCategory, DealType } from "@/lib/db/assets";
import { SEEDED_JURISDICTIONS, jurisdictionName } from "@/lib/jurisdictions";
import { defaultPriceHistory } from "@/lib/price-history";
import { saveAsset, changeAssetStatus } from "@/actions/seller-assets";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { CheckIcon } from "@/components/ui/icons";

const centsToEuro = (v: number | null) => (v === null ? "" : String(v / 100));
const euroToCents = (v: string): number | null =>
  v.trim() ? Math.max(0, Math.round(Number(v) * 100)) : null;
const toIntOrNull = (v: string): number | null =>
  v.trim() ? Math.trunc(Number(v)) : null;

type PricePointDraft = { year: number; value: string }; // value in euros

function initialPricePoints(
  initial: MyAssetDetail | null,
  currentYear: number,
): PricePointDraft[] {
  if (initial && initial.priceHistory.length > 0) {
    return initial.priceHistory.map((p) => ({
      year: p.year,
      value: centsToEuro(p.valueCents),
    }));
  }
  return defaultPriceHistory(currentYear, initial?.askingPriceCents ?? null).map((p) => ({
    year: p.year,
    value: centsToEuro(p.value_cents),
  }));
}

// Asset create/edit form (F2). Money is entered in euros and converted to cents at this boundary
// (ADR-4), matching mandate-form. Highlights and the six-point price history are edited inline;
// "Generate" seeds a plausible curve the seller can adjust. Save draft persists; Publish saves then
// transitions DRAFT → PUBLISHED.
export function AssetForm({
  initial,
  currentYear,
}: {
  initial: MyAssetDetail | null;
  currentYear: number;
}) {
  const t = useTranslations("seller");
  const tm = useTranslations("marketplace");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [assetId, setAssetId] = useState<string | null>(initial?.id ?? null);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState<AssetCategory>(
    initial?.category ?? Constants.public.Enums.asset_category[0],
  );
  const [jurisdiction, setJurisdiction] = useState(
    initial?.jurisdiction ?? SEEDED_JURISDICTIONS[0],
  );
  const [dealType, setDealType] = useState<DealType>(
    initial?.dealType ?? Constants.public.Enums.deal_type[0],
  );
  const [revenue, setRevenue] = useState(centsToEuro(initial?.revenueCents ?? null));
  const [ebitda, setEbitda] = useState(centsToEuro(initial?.ebitdaCents ?? null));
  const [askingPrice, setAskingPrice] = useState(
    centsToEuro(initial?.askingPriceCents ?? null),
  );
  const [employees, setEmployees] = useState(
    initial?.employees !== null && initial?.employees !== undefined
      ? String(initial.employees)
      : "",
  );
  const [yearFounded, setYearFounded] = useState(
    initial?.yearFounded !== null && initial?.yearFounded !== undefined
      ? String(initial.yearFounded)
      : "",
  );
  const [highlights, setHighlights] = useState<string[]>(
    initial && initial.highlights.length > 0 ? initial.highlights : [""],
  );
  const [pricePoints, setPricePoints] = useState<PricePointDraft[]>(
    initialPricePoints(initial, currentYear),
  );

  function setHighlight(i: number, value: string) {
    setHighlights((prev) => prev.map((h, idx) => (idx === i ? value : h)));
  }
  function addHighlight() {
    setHighlights((prev) => (prev.length >= 12 ? prev : [...prev, ""]));
  }
  function removeHighlight(i: number) {
    setHighlights((prev) => prev.filter((_, idx) => idx !== i));
  }

  function setPointValue(i: number, value: string) {
    setPricePoints((prev) => prev.map((p, idx) => (idx === i ? { ...p, value } : p)));
  }
  function regeneratePoints() {
    setPricePoints(
      defaultPriceHistory(currentYear, euroToCents(askingPrice)).map((p) => ({
        year: p.year,
        value: centsToEuro(p.value_cents),
      })),
    );
  }

  function payload() {
    return {
      id: assetId,
      title,
      description,
      category,
      jurisdiction,
      dealType,
      revenueCents: euroToCents(revenue),
      ebitdaCents: euroToCents(ebitda),
      askingPriceCents: euroToCents(askingPrice),
      employees: toIntOrNull(employees),
      yearFounded: toIntOrNull(yearFounded),
      highlights: highlights.map((h) => h.trim()).filter((h) => h.length > 0),
      priceHistory: pricePoints.map((p) => ({
        year: p.year,
        valueCents: euroToCents(p.value) ?? 0,
      })),
    };
  }

  function errorFor(code: string): string {
    if (code === "CHECK_FAILED") return t("form.checkFailed");
    if (code === "NOT_ALLOWED") return t("form.notAllowed");
    if (code === "INVALID") return t("form.invalid");
    return t("form.error");
  }

  function submit(publish: boolean) {
    setSaved(false);
    setFormError(null);
    startTransition(async () => {
      const res = await saveAsset(payload());
      if (!res.ok) {
        setFormError(errorFor(res.error));
        return;
      }
      setAssetId(res.id);
      if (publish) {
        const pub = await changeAssetStatus({ id: res.id, status: "PUBLISHED" });
        if (!pub.ok) {
          setFormError(errorFor(pub.error));
          return;
        }
        router.push("/seller");
        router.refresh();
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      <Field label={t("form.title")} htmlFor="title">
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("form.titlePlaceholder")}
          maxLength={200}
          required
        />
      </Field>

      <Field label={t("form.description")} htmlFor="description">
        <Textarea
          id="description"
          rows={4}
          maxLength={4000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("form.descriptionPlaceholder")}
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("form.category")} htmlFor="category">
          <Select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as AssetCategory)}
          >
            {Constants.public.Enums.asset_category.map((c) => (
              <option key={c} value={c}>
                {tm(`enums.category.${c}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("form.jurisdiction")} htmlFor="jurisdiction">
          <Select
            id="jurisdiction"
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value)}
          >
            {SEEDED_JURISDICTIONS.map((code) => (
              <option key={code} value={code}>
                {jurisdictionName(code)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("form.dealType")} htmlFor="dealType">
          <Select
            id="dealType"
            value={dealType}
            onChange={(e) => setDealType(e.target.value as DealType)}
          >
            {Constants.public.Enums.deal_type.map((d) => (
              <option key={d} value={d}>
                {tm(`enums.dealType.${d}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("form.revenue")} htmlFor="revenue" hint={t("form.euroHint")}>
          <Input
            id="revenue"
            type="number"
            min={0}
            inputMode="numeric"
            value={revenue}
            onChange={(e) => setRevenue(e.target.value)}
          />
        </Field>
        <Field label={t("form.ebitda")} htmlFor="ebitda" hint={t("form.euroHint")}>
          <Input
            id="ebitda"
            type="number"
            min={0}
            inputMode="numeric"
            value={ebitda}
            onChange={(e) => setEbitda(e.target.value)}
          />
        </Field>
        <Field
          label={t("form.askingPrice")}
          htmlFor="askingPrice"
          hint={t("form.euroHint")}
        >
          <Input
            id="askingPrice"
            type="number"
            min={0}
            inputMode="numeric"
            value={askingPrice}
            onChange={(e) => setAskingPrice(e.target.value)}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("form.employees")} htmlFor="employees">
          <Input
            id="employees"
            type="number"
            min={0}
            inputMode="numeric"
            value={employees}
            onChange={(e) => setEmployees(e.target.value)}
          />
        </Field>
        <Field label={t("form.yearFounded")} htmlFor="yearFounded">
          <Input
            id="yearFounded"
            type="number"
            min={1800}
            max={2100}
            inputMode="numeric"
            value={yearFounded}
            onChange={(e) => setYearFounded(e.target.value)}
          />
        </Field>
      </div>

      {/* Highlights — add/remove list */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">
          {t("form.highlights")}
        </legend>
        <p className="text-xs text-muted">{t("form.highlightsHint")}</p>
        <div className="space-y-2">
          {highlights.map((h, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={h}
                maxLength={120}
                onChange={(e) => setHighlight(i, e.target.value)}
                placeholder={t("form.highlightPlaceholder")}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeHighlight(i)}
                aria-label={t("form.removeHighlight")}
              >
                ✕
              </Button>
            </div>
          ))}
        </div>
        {highlights.length < 12 ? (
          <Button type="button" variant="outline" size="sm" onClick={addHighlight}>
            {t("form.addHighlight")}
          </Button>
        ) : null}
      </fieldset>

      {/* Price history — six annual points feeding the Market Trend chart */}
      <fieldset className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <legend className="text-sm font-medium text-foreground">
            {t("form.priceHistory")}
          </legend>
          <Button type="button" variant="outline" size="sm" onClick={regeneratePoints}>
            {t("form.generatePriceHistory")}
          </Button>
        </div>
        <p className="text-xs text-muted">{t("form.priceHistoryHint")}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {pricePoints.map((p, i) => (
            <Field key={p.year} label={String(p.year)} htmlFor={`price-${p.year}`}>
              <Input
                id={`price-${p.year}`}
                type="number"
                min={0}
                inputMode="numeric"
                value={p.value}
                onChange={(e) => setPointValue(i, e.target.value)}
              />
            </Field>
          ))}
        </div>
      </fieldset>

      {formError ? <p className="text-sm text-danger">{formError}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => submit(false)}
          disabled={isPending}
        >
          {t("form.saveDraft")}
        </Button>
        <Button type="button" onClick={() => submit(true)} disabled={isPending}>
          {t("form.publish")}
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
