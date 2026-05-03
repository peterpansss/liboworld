import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Vitest setup for the liboworld React app.
 *
 * Mirrors `libo-app-v2/vitest.config.ts` in spirit:
 *  - happy-dom for the browser-shaped runtime our utilities expect
 *  - tests live under `tests/` (so they don't pollute `src/`)
 *  - per-file isolation to avoid module-cache leaks
 *
 * The `@vitejs/plugin-react` plugin is needed so JSX in component tests
 * compiles via the same transform Vite uses for the dev server.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    isolate: true,
  },
});
