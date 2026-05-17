/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: [
        'src/lib/**/*.ts',
        'src/utils/**/*.ts',
        'src/components/**/*.tsx',
        'src/pages/**/*.tsx',
        'src/App.tsx',
        'src/main.tsx',
        'src/theme.ts',
        'src/i18n/index.ts',
      ],
      exclude: ['src/**/*.d.ts'],
    },
  },
});
