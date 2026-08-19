import type { Enums } from "@/lib/types/database";
import { Constants } from "@/lib/types/database";

// Pure registry-filter helpers — no database/server imports, so they unit-test in a node
// environment (ADR-14) and mirror lib/db/asset-filters.ts. lib/db/admin.ts re-exports these.
// All Platform Manager registry state lives in the URL search params (ADR-3); this is the
// single place they are validated.

export type AccountStatus = Enums<"account_status">; // ACTIVE | SUSPENDED
export type AssetStatus = Enums<"asset_status">; // DRAFT | PUBLISHED | SUSPENDED | SOLD
export type AssetCategory = Enums<"asset_category">;
export type ModerationActionType = Enums<"moderation_action">;
export type ModerationTargetType = "USER" | "ASSET";

export const ADMIN_PAGE_SIZE = 20;

const TARGET_TYPES: readonly ModerationTargetType[] = ["USER", "ASSET"];

export type AdminBuyerFilters = {
  q: string | null;
  status: AccountStatus | null;
  listed: boolean | null; // directory opt-out tri-state
  page: number;
};

export type AdminSellerFilters = {
  q: string | null;
  status: AccountStatus | null;
  verified: boolean | null;
  page: number;
};

export type AdminAssetFilters = {
  q: string | null;
  status: AssetStatus | null;
  category: AssetCategory | null;
  page: number;
};

export type ModLogFilters = {
  action: ModerationActionType | null;
  targetType: ModerationTargetType | null;
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

function first(sp: RawParams, key: string): string | undefined {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

function inEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T | null {
  return value && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

function toBool(value: string | undefined): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function toPage(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

function toQuery(value: string | undefined): string | null {
  return value?.trim() || null;
}

export function parseAdminBuyerFilters(sp: RawParams): AdminBuyerFilters {
  return {
    q: toQuery(first(sp, "q")),
    status: inEnum(first(sp, "status"), Constants.public.Enums.account_status),
    listed: toBool(first(sp, "listed")),
    page: toPage(first(sp, "page")),
  };
}

export function parseAdminSellerFilters(sp: RawParams): AdminSellerFilters {
  return {
    q: toQuery(first(sp, "q")),
    status: inEnum(first(sp, "status"), Constants.public.Enums.account_status),
    verified: toBool(first(sp, "verified")),
    page: toPage(first(sp, "page")),
  };
}

export function parseAdminAssetFilters(sp: RawParams): AdminAssetFilters {
  return {
    q: toQuery(first(sp, "q")),
    status: inEnum(first(sp, "status"), Constants.public.Enums.asset_status),
    category: inEnum(first(sp, "category"), Constants.public.Enums.asset_category),
    page: toPage(first(sp, "page")),
  };
}

export function parseModLogFilters(sp: RawParams): ModLogFilters {
  return {
    action: inEnum(first(sp, "action"), Constants.public.Enums.moderation_action),
    targetType: inEnum(first(sp, "target"), TARGET_TYPES),
    page: toPage(first(sp, "page")),
  };
}

export function hasActiveBuyerFilters(f: AdminBuyerFilters): boolean {
  return f.q !== null || f.status !== null || f.listed !== null;
}

export function hasActiveSellerFilters(f: AdminSellerFilters): boolean {
  return f.q !== null || f.status !== null || f.verified !== null;
}

export function hasActiveAssetFilters(f: AdminAssetFilters): boolean {
  return f.q !== null || f.status !== null || f.category !== null;
}

export function hasActiveModLogFilters(f: ModLogFilters): boolean {
  return f.action !== null || f.targetType !== null;
}
