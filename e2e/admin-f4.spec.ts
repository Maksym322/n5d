import { test, expect, type Page } from "@playwright/test";
import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// F4 — the manager suspends a non-compliant seller, their published listings leave the public
// catalogue, and the action lands in the audit log. Unlike the read-only F1/F2/F3 smoke specs this
// one MUTATES (a suspension), so beforeAll/afterAll restore the seller to ACTIVE and delete the
// moderation_log rows it creates — the seeded state is left exactly as it was (seller01 has no
// seeded moderation rows, so deleting by its target_id removes only what this test wrote).

config({ path: ".env.local" });
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY;
// An ACTIVE seller with published listings that no other spec touches (the generic "Seller" login
// button is seller01, and seller06 is used by the F2 spec) — so this test's temporary suspension
// can't race the read-only specs under parallel workers.
const TARGET_EMAIL = "seller03@example.com";
const TARGET_DISPLAY = "Seller #03";

function admin(): SupabaseClient {
  if (!URL || !SECRET) throw new Error("Missing Supabase env for the F4 teardown");
  return createClient(URL, SECRET, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function targetUserId(db: SupabaseClient): Promise<string> {
  const { data, error } = await db.auth.admin.listUsers({ perPage: 200 });
  if (error) throw error;
  const user = data.users.find((u) => u.email === TARGET_EMAIL);
  if (!user) throw new Error(`${TARGET_EMAIL} not found — run npm run seed`);
  return user.id;
}

// Return the seller to fixture state: ACTIVE, and remove any moderation_log rows this test wrote.
async function restore() {
  const db = admin();
  const id = await targetUserId(db);
  await db.from("profiles").update({ status: "ACTIVE" }).eq("id", id);
  await db.from("moderation_log").delete().eq("target_id", id);
}

test.beforeAll(restore);
test.afterAll(restore);

async function signIn(page: Page, role: "Manager" | "Buyer") {
  await page.goto("/login");
  await page.getByRole("button", { name: role, exact: true }).click();
  await page.waitForURL("http://localhost:3000/");
}

test("manager suspends a seller: listings leave the catalogue, log records it, short reason is rejected", async ({
  page,
}) => {
  // --- Manager opens the seller in the registry and captures a PUBLISHED listing ref -----------
  await signIn(page, "Manager");
  await page.goto("/admin/sellers");
  await page.getByRole("link").filter({ hasText: TARGET_DISPLAY }).first().click();
  await expect(page).toHaveURL(/\/admin\/sellers\/[0-9a-f-]+/);
  const detailUrl = page.url();

  await expect(page.getByText(/public in the catalogue now/i)).toBeVisible();
  // The seller also owns a draft + a suspended asset, so filter the detail links to a PUBLISHED one.
  const publishedLink = page
    .locator('a[href^="/admin/assets/"]')
    .filter({ hasText: "Published" })
    .first();
  const href = await publishedLink.getAttribute("href");
  const ref = href?.split("/").pop() ?? "";
  expect(ref).toMatch(/^\d+$/);

  // --- Baseline: a BUYER sees the listing in the public catalogue (the manager sees everything, so
  //     the propagation is only observable from a non-manager view) ------------------------------
  await signIn(page, "Buyer");
  await page.goto(`/assets?q=%23${ref}`);
  await expect(page.getByText(`Asset #${ref}`)).toBeVisible();

  // --- Manager: short reason is refused inline (no change), then a valid reason suspends ---------
  await signIn(page, "Manager");
  await page.goto(detailUrl);
  await page.getByRole("button", { name: "Suspend participant" }).click();
  await page.getByPlaceholder("Why is this action being taken?").fill("nope");
  await page.getByRole("button", { name: "Suspend", exact: true }).click();
  await expect(page.getByText("The reason must be at least 10 characters.")).toBeVisible();
  await expect(page.getByText(/public in the catalogue now/i)).toBeVisible(); // unchanged

  const reason = "Automated F4 end-to-end verification of the suspension flow.";
  await page.getByPlaceholder("Why is this action being taken?").fill(reason);
  await page.getByRole("button", { name: "Suspend", exact: true }).click();

  // Consequence panel flips (before → after, observed) and the audit entry appears in the history…
  await expect(page.getByText(/hidden from the catalogue/i)).toBeVisible();
  await expect(page.getByText(reason)).toBeVisible();
  // …and on the global moderation log.
  await page.goto("/admin/log");
  await expect(page.getByText(reason)).toBeVisible();

  // --- The listing has now left the public catalogue from the BUYER's view ----------------------
  await signIn(page, "Buyer");
  await page.goto(`/assets?q=%23${ref}`);
  await expect(page.getByText(`Asset #${ref}`)).toHaveCount(0);
});
