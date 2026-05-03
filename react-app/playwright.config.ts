/**
 * Playwright config for liboworld/react-app.
 *
 * Runs tests against the local Vite dev server (auto-started via webServer).
 * Use the local Supabase (libo-app-v2/scripts/rls-test-setup.mjs) when the
 * tests need real backend behaviour. The default base URL points at
 * http://127.0.0.1:5173 which Vite picks by default.
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = 5173;

export default defineConfig({
  testDir: './e2e',
  // CI guarantees fail-fast; local dev tolerates flaky infra one retry.
  retries: process.env.CI ? 1 : 0,
  fullyParallel: true,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 5_000,
    navigationTimeout: 15_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
