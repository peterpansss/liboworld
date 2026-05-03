/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

/**
 * Vitest config for the admin React app. Mirrors the libo-app-v2 setup so
 * test conventions stay consistent across the monorepo.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    isolate: true,
  },
});
