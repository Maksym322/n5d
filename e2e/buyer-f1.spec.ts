import { test, expect, type Page } from "@playwright/test";

// F1 — buyer completes their mandate → filters assets → opens a listing → contacts the
// seller. These specs are READ-ONLY on purpose: they drive the flow up to the contact
// mutation and assert the panel state without submitting, so they stay repeatable against a
// seeded database (no conversation is created, no quota is consumed).

async function signInAsBuyer(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Buyer" }).click();
  await page.waitForURL("http://localhost:3000/");
}

test("buyer can filter the catalogue by category", async ({ page }) => {
  await signInAsBuyer(page);
  await page.goto("/assets");

  await expect(page.getByRole("heading", { name: "Assets", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /View asset/i }).first()).toBeVisible();

  await page.getByRole("button", { name: /Fintech/ }).click();
  await expect(page).toHaveURL(/category=FINTECH/);
});

test("search finds an asset by its reference number", async ({ page }) => {
  await signInAsBuyer(page);
  await page.goto("/assets");

  // The ref is an integer, not part of the ilike text search — this exercises the OR'd
  // public_ref match so a user searching "Asset #100" actually finds it.
  //
  // Search is submit-driven since natural-language search landed (ADR-6), hence the Enter. A
  // query that parses as a reference short-circuits past the model, so this stays deterministic
  // and needs no API key.
  await page.getByRole("searchbox").fill("Asset #100");
  await page.getByRole("searchbox").press("Enter");
  await expect(page.getByRole("heading", { name: "Asset #100" })).toBeVisible();
});

test("buyer reaches the contact panel from a listing (no submit)", async ({ page }) => {
  await signInAsBuyer(page);
  await page.goto("/assets");

  await page.getByRole("link", { name: /View asset/i }).first().click();
  await expect(page).toHaveURL(/\/assets\/\d+/);

  // Anonymous listing: no seller company name is shown on the detail page (D1).
  await expect(page.getByRole("heading", { name: /^Asset #\d+$/ })).toBeVisible();

  // Quota counter is shown BEFORE the action (D5), and the request is not submitted.
  await expect(page.getByText(/of 5 requests active/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Send request" })).toBeVisible();
});

test("an accepted conversation reveals the counterparty", async ({ page }) => {
  await signInAsBuyer(page);
  await page.goto("/messages");

  // The seeded buyer holds an ACCEPTED thread, so the identity is revealed by RLS — the
  // thread header is a company name, not the anonymous placeholder.
  const accepted = page.getByRole("link").filter({ hasText: "Accepted" }).first();
  await expect(accepted).toBeVisible();
  await accepted.click();

  await expect(page).toHaveURL(/\/messages\/[0-9a-f-]+/);
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(/Anonymous/i);
});
