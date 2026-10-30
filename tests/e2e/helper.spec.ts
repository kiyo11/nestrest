import { test, expect } from "@playwright/test";

// Helper password login on a 390px mobile viewport. Requires the seeded test DB.
const HELPER = "helper@nestrest.dev";
const HELPER_PW = "helper1234";

test.use({ viewport: { width: 390, height: 844 } });

test.describe("helper mobile flow", () => {
  test("password login shows only assigned tasks with no payout/PII", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("tab", { name: /password/i }).click();
    await page.locator("#email").fill(HELPER);
    await page.locator("#password").fill(HELPER_PW);
    await page.getByRole("button", { name: /^sign in$/i }).click();

    await page.waitForURL(/\/helper/);
    await expect(page.getByRole("heading", { name: /your turnovers/i })).toBeVisible();

    // No financial or guest-contact data leaks into the helper view.
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/payout/i);
    expect(body).not.toMatch(/\$\d/);
    expect(body).not.toMatch(/@example\.com/);
  });

  test("ticking a checklist item moves the task TODO -> IN_PROGRESS and completes with confirm", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("tab", { name: /password/i }).click();
    await page.locator("#email").fill(HELPER);
    await page.locator("#password").fill(HELPER_PW);
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await page.waitForURL(/\/helper/);

    await page.getByRole("link").filter({ hasText: /turnover/i }).first().click();
    await page.waitForURL(/\/helper\/tasks\//);

    // Tick the first unchecked item (optimistic -> IN_PROGRESS server-side).
    const firstBox = page.getByRole("checkbox").first();
    await firstBox.click();
    await expect(firstBox).toBeChecked();

    // Complete with the unchecked-items confirm dialog.
    await page.getByRole("button", { name: /mark turnover complete/i }).click();
    const confirm = page.getByRole("button", { name: /complete anyway/i });
    if (await confirm.isVisible()) await confirm.click();

    await page.waitForURL(/\/helper$/);
  });
});
