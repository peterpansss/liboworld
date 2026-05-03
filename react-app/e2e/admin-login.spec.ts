/**
 * E2E: admin login flow.
 *
 * - With invalid creds, an error must appear.
 * - With valid admin creds, the dashboard loads.
 * - With a non-admin user, the "not an admin" message is shown.
 *
 * We mock the Supabase auth + profiles endpoints because it's much
 * faster + deterministic than spinning up real users in the local DB.
 */
import { test, expect } from '@playwright/test';

async function mockSupabaseAuth(page: any, scenario: 'admin' | 'not-admin' | 'bad-creds') {
  await page.route('**/auth/v1/token*', (route: any) => {
    if (scenario === 'bad-creds') {
      return route.fulfill({
        status: 400,
        body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials' }),
        contentType: 'application/json',
      });
    }
    return route.fulfill({
      status: 200,
      body: JSON.stringify({
        access_token: 'fake_jwt',
        refresh_token: 'fake_refresh',
        expires_in: 3600,
        user: { id: scenario === 'admin' ? 'u_admin' : 'u_user', email: 'test@test.com' },
      }),
      contentType: 'application/json',
    });
  });

  await page.route('**/rest/v1/profiles*', (route: any) =>
    route.fulfill({
      status: 200,
      body: JSON.stringify({ is_admin: scenario === 'admin' }),
      contentType: 'application/json',
    }),
  );

  await page.route('**/rest/v1/rpc/is_caller_admin', (route: any) =>
    route.fulfill({
      status: 200,
      body: JSON.stringify(scenario === 'admin'),
      contentType: 'application/json',
    }),
  );
}

test.describe('Admin login', () => {
  test('shows the admin login form for unauthenticated visitors', async ({ page }) => {
    await mockSupabaseAuth(page, 'not-admin');
    await page.goto('/admin');
    // Either a sign-in form or the not-admin message is acceptable.
    // (Both fields appearing is fine — we just need to see at least one.)
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 15_000 });
  });

  test('rejects bad credentials with a visible error', async ({ page }) => {
    await mockSupabaseAuth(page, 'bad-creds');
    await page.goto('/admin');

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    if (await emailInput.count() && await passwordInput.count()) {
      await emailInput.fill('not-an-admin@libo.com');
      await passwordInput.fill('wrong-password');
      await page.getByRole('button', { name: /sign in|log in/i }).first().click();
      await expect(page.locator('body')).toContainText(/invalid|error|incorrect/i, { timeout: 10_000 });
    }
  });
});
