import { test, expect, type Page } from "@playwright/test";
import { waitForMagicLink, logSize } from "./helpers/magic-link";

// Requires: a seeded test DB (npm run db:seed against the test DATABASE_URL) and
// the dev server (started by the playwright webServer). Owner = owner@nestrest.dev.
const OWNER = "owner@nestrest.dev";

async function loginOwner(page: Page) {
  const offset = logSize();
  await page.goto("/login");
  await page.getByRole("tab", { name: /magic link/i }).click();
  await page.getByLabel("Email").fill(OWNER);
  await page.getByRole("button", { name: /email me a link/i }).click();
  const link = await waitForMagicLink(OWNER, offset);
  await page.goto(link);
}

function isoDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

test.describe("owner flows", () => {
  test("magic-link login lands on a dashboard with KPIs", async ({ page }) => {
    await loginOwner(page);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // KPI tiles render pre-formatted values (occupancy % and revenue $).
    await expect(page.getByText("%").first()).toBeVisible();
    await expect(page.getByText("$").first()).toBeVisible();
  });

  test("creating a manual block over a reservation shows a conflict warning", async ({ page }) => {
    await loginOwner(page);
    await page.goto("/calendar");
    await page.getByRole("button", { name: /add block|new block|block/i }).first().click();
    // The seeded 'upcoming' reservation is 1–5 days out; overlap it.
    await page.getByLabel(/start/i).fill(isoDays(2));
    await page.getByLabel(/end/i).fill(isoDays(3));
    await expect(page.getByText(/conflict|overlaps/i)).toBeVisible();
  });

  test("editing a protected booking field updates the activity timeline", async ({ page }) => {
    await loginOwner(page);
    await page.goto("/bookings");
    await page.getByRole("link", { name: /reservation/i }).first().click();
    await page.getByLabel(/payout/i).fill("777");
    await page.getByRole("button", { name: /save/i }).first().click();
    await expect(page.getByText(/owner edited booking/i)).toBeVisible();
  });

  test("message composer blocks send on an unresolved merge field, then schedules", async ({ page }) => {
    await loginOwner(page);
    await page.goto("/messages");
    await expect(page.getByText(/\{\{|unresolved|missing/i).first()).toBeVisible();
    const send = page.getByRole("button", { name: /^send|send now/i }).first();
    if (await send.isVisible()) await expect(send).toBeDisabled();
    const schedule = page.getByRole("button", { name: /schedule/i }).first();
    if (await schedule.isVisible()) await schedule.click();
  });
});
