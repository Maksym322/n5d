import { test, expect, type Page } from "@playwright/test";

// F2 — seller publishes/manages assets, receives a contact request, and on acceptance both
// identities are revealed. F3 — seller browses anonymised buyers, filters, and reaches the contact
// panel. Like the buyer-f1 specs these are READ-ONLY on purpose: they drive each flow up to the
// mutation and assert state without submitting, so they stay repeatable against a seeded database
// (no conversation is created, no request accepted/declined, no quota consumed).

async function signInAsSeller(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Seller" }).click();
  await page.waitForURL("http://localhost:3000/");
}

async function signInAsAccount(page: Page, email: string) {
  await page.goto("/login");
  await page.getByText("Sign in as a specific account").click();
  await page.getByRole("button", { name: new RegExp(email.replace(/\./g, "\\.")) }).click();
  await page.waitForURL("http://localhost:3000/");
}

test("seller dashboard groups assets and lists incoming requests", async ({ page }) => {
  await signInAsSeller(page);
  await page.goto("/seller");
  await expect(
    page.getByRole("heading", { name: "Seller dashboard", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "New asset" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your assets" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Requests needing a response" }),
  ).toBeVisible();
});

test("an accepted conversation reveals the counterparty for the seller", async ({ page }) => {
  await signInAsSeller(page);
  await page.goto("/messages");
  const accepted = page.getByRole("link").filter({ hasText: "Accepted" }).first();
  await expect(accepted).toBeVisible();
  await accepted.click();
  await expect(page).toHaveURL(/\/messages\/[0-9a-f-]+/);
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(/Anonymous/i);
});

test("an incoming pending request shows accept and decline (no submit)", async ({ page }) => {
  // seller06 holds a pending incoming request from buyer05 in the seed.
  await signInAsAccount(page, "seller06@example.com");
  await page.goto("/messages");
  const pending = page.getByRole("link").filter({ hasText: "Pending" }).first();
  await expect(pending).toBeVisible();
  await pending.click();
  await expect(page).toHaveURL(/\/messages\/[0-9a-f-]+/);
  await expect(page.getByRole("button", { name: "Accept" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Decline" })).toBeVisible();
});

test("seller can filter the buyer directory by category", async ({ page }) => {
  await signInAsSeller(page);
  await page.goto("/seller/buyers");
  await expect(
    page.getByRole("heading", { name: "Buyer directory", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Fintech/ }).click();
  await expect(page).toHaveURL(/category=FINTECH/);
});

test("seller reaches the buyer contact panel from a card (no submit)", async ({ page }) => {
  await signInAsSeller(page);
  await page.goto("/seller/buyers");
  await page.locator('a[href^="/seller/buyers/"]').first().click();
  await expect(page).toHaveURL(/\/seller\/buyers\/[0-9a-f-]+/);
  await expect(page.getByText(/of 5 requests active/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Send request" })).toBeVisible();
});
