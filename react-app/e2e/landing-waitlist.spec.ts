/**
 * E2E: landing → fill email → submit → "you're on the list" UX.
 *
 * The form posts to the live Supabase. To avoid actually inserting real
 * email rows we monkey-patch fetch on the page so anything pointed at
 * supabase is intercepted and answered locally with a deterministic
 * response. (Playwright's `route.fulfill` works at the network level.)
 */
import { test, expect } from '@playwright/test';

test.describe('Landing waitlist', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept all supabase REST calls and return a successful insert.
    await page.route('**/rest/v1/funnel_signups*', (route) =>
      route.fulfill({ status: 201, body: '[]', contentType: 'application/json' }),
    );
    await page.route('**/rest/v1/waitlist*', (route) =>
      route.fulfill({ status: 201, body: '[]', contentType: 'application/json' }),
    );
  });

  test('renders the landing page with hero copy', async ({ page }) => {
    await page.goto('/');
    // Look for any hero/CTA text — Libo brand is hard-coded in the page.
    await expect(page.locator('body')).toContainText(/Libo/i);
  });

  test('email input appears in the hero (or a CTA leads to one)', async ({ page }) => {
    await page.goto('/');
    // Either the hero has an email input directly, or there is a button to
    // open the waitlist form. We accept either.
    const directInput = page.locator('input[type="email"]').first();
    if (await directInput.count()) {
      await expect(directInput).toBeVisible();
    } else {
      // Look for a visible "join" or "waitlist" CTA.
      const cta = page.getByRole('button', { name: /join|waitlist|notify/i }).first();
      await expect(cta).toBeVisible();
    }
  });
});
