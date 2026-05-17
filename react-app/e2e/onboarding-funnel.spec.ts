/**
 * E2E: onboarding quiz funnel.
 *
 * The /onboarding flow is a multi-step wizard. We don't try to march
 * through every step — that would couple the test to the marketing
 * team's content choices. Instead we verify:
 *   - the page loads without errors
 *   - some interactive control is present (button to start)
 */
import { test, expect } from '@playwright/test';

test.describe('Onboarding funnel', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/rest/v1/funnel_signups*', (route) =>
      route.fulfill({ status: 201, body: '[]', contentType: 'application/json' }),
    );
  });

  test('page loads and shows interactive content', async ({ page }) => {
    await page.goto('/onboarding');
    // The onboarding page has at least one interactive control.
    const interactives = page.locator('button, [role="button"], input');
    await expect(interactives.first()).toBeVisible({ timeout: 10_000 });
  });

  test('does not redirect away from /onboarding (catch-all guard works)', async ({ page }) => {
    await page.goto('/onboarding');
    // Wait for any client-side redirect that might happen after first paint.
    await page.waitForTimeout(1_000);
    expect(page.url()).toMatch(/\/onboarding/);
  });
});
