import { describe, it, expect } from "vitest";
import {
  parseAdminBuyerFilters,
  parseAdminSellerFilters,
  parseAdminAssetFilters,
  parseModLogFilters,
  hasActiveBuyerFilters,
  hasActiveSellerFilters,
  hasActiveAssetFilters,
  hasActiveModLogFilters,
} from "@/lib/db/admin-filters";

describe("parseAdminBuyerFilters", () => {
  it("returns defaults for empty params", () => {
    expect(parseAdminBuyerFilters({})).toEqual({
      q: null,
      status: null,
      listed: null,
      page: 1,
    });
  });

  it("validates account status against the enum", () => {
    expect(parseAdminBuyerFilters({ status: "SUSPENDED" }).status).toBe("SUSPENDED");
    expect(parseAdminBuyerFilters({ status: "ACTIVE" }).status).toBe("ACTIVE");
    expect(parseAdminBuyerFilters({ status: "DRAFT" }).status).toBeNull(); // asset status, not account
    expect(parseAdminBuyerFilters({ status: "nope" }).status).toBeNull();
  });

  it("parses the directory tri-state", () => {
    expect(parseAdminBuyerFilters({ listed: "true" }).listed).toBe(true);
    expect(parseAdminBuyerFilters({ listed: "false" }).listed).toBe(false);
    expect(parseAdminBuyerFilters({ listed: "maybe" }).listed).toBeNull();
    expect(parseAdminBuyerFilters({}).listed).toBeNull();
  });

  it("trims the query and clamps the page", () => {
    expect(parseAdminBuyerFilters({ q: "  acme " }).q).toBe("acme");
    expect(parseAdminBuyerFilters({ q: "   " }).q).toBeNull();
    expect(parseAdminBuyerFilters({ page: "4" }).page).toBe(4);
    expect(parseAdminBuyerFilters({ page: "0" }).page).toBe(1);
    expect(parseAdminBuyerFilters({ page: "x" }).page).toBe(1);
  });
});

describe("parseAdminSellerFilters", () => {
  it("parses the verified tri-state and status", () => {
    expect(parseAdminSellerFilters({ verified: "true" }).verified).toBe(true);
    expect(parseAdminSellerFilters({ verified: "false" }).verified).toBe(false);
    expect(parseAdminSellerFilters({ verified: "x" }).verified).toBeNull();
    expect(parseAdminSellerFilters({ status: "SUSPENDED" }).status).toBe("SUSPENDED");
  });
});

describe("parseAdminAssetFilters", () => {
  it("validates asset status and category enums", () => {
    expect(parseAdminAssetFilters({ status: "PUBLISHED" }).status).toBe("PUBLISHED");
    expect(parseAdminAssetFilters({ status: "SUSPENDED" }).status).toBe("SUSPENDED");
    expect(parseAdminAssetFilters({ status: "ACTIVE" }).status).toBeNull(); // account status, not asset
    expect(parseAdminAssetFilters({ category: "FINTECH" }).category).toBe("FINTECH");
    expect(parseAdminAssetFilters({ category: "nope" }).category).toBeNull();
  });
});

describe("parseModLogFilters", () => {
  it("returns defaults for empty params", () => {
    expect(parseModLogFilters({})).toEqual({ action: null, targetType: null, page: 1 });
  });

  it("validates the moderation action enum", () => {
    expect(parseModLogFilters({ action: "SUSPEND" }).action).toBe("SUSPEND");
    expect(parseModLogFilters({ action: "REPUBLISH_ASSET" }).action).toBe("REPUBLISH_ASSET");
    expect(parseModLogFilters({ action: "DELETE" }).action).toBeNull();
  });

  it("validates the target type", () => {
    expect(parseModLogFilters({ target: "USER" }).targetType).toBe("USER");
    expect(parseModLogFilters({ target: "ASSET" }).targetType).toBe("ASSET");
    expect(parseModLogFilters({ target: "GROUP" }).targetType).toBeNull();
  });
});

describe("hasActive* helpers", () => {
  it("buyers", () => {
    expect(hasActiveBuyerFilters({ q: null, status: null, listed: null, page: 1 })).toBe(false);
    expect(hasActiveBuyerFilters({ q: "a", status: null, listed: null, page: 1 })).toBe(true);
    expect(hasActiveBuyerFilters({ q: null, status: null, listed: false, page: 1 })).toBe(true);
  });

  it("sellers", () => {
    expect(hasActiveSellerFilters({ q: null, status: null, verified: null, page: 1 })).toBe(false);
    expect(hasActiveSellerFilters({ q: null, status: "ACTIVE", verified: null, page: 1 })).toBe(true);
  });

  it("assets", () => {
    expect(hasActiveAssetFilters({ q: null, status: null, category: null, page: 1 })).toBe(false);
    expect(hasActiveAssetFilters({ q: null, status: "DRAFT", category: null, page: 1 })).toBe(true);
  });

  it("moderation log", () => {
    expect(hasActiveModLogFilters({ action: null, targetType: null, page: 1 })).toBe(false);
    expect(hasActiveModLogFilters({ action: "SUSPEND", targetType: null, page: 1 })).toBe(true);
    expect(hasActiveModLogFilters({ action: null, targetType: "ASSET", page: 1 })).toBe(true);
  });
});
