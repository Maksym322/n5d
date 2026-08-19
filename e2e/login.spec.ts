import { test, expect } from "@playwright/test";

test("login page offers the three role buttons", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Buyer" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Seller" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Manager" })).toBeVisible();
});

test("signing in as Buyer reveals the active role in the header", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Buyer" }).click();
  await page.waitForURL("http://localhost:3000/");
  await expect(page.getByText(/Signed in as/i)).toBeVisible();
});

test("the account picker signs into a specific seeded account", async ({ page }) => {
  await page.goto("/login");
  await page.getByText("Sign in as a specific account").click(); // expand the picker
  await page.getByRole("button", { name: /buyer05@example\.com/ }).click();
  await page.waitForURL("http://localhost:3000/");
  await expect(page.getByText(/Signed in as/i)).toBeVisible();
});
