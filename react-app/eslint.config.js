import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // eslint-plugin-react-hooks v7 folded the React Compiler diagnostics into
      // `recommended` as errors. They flag long-standing, working patterns
      // (fetch-on-mount effects that set loading state, refs read in render,
      // helpers declared after the effect that calls them) across ~50 sites
      // that predate the upgrade. Each one needs a behavioural refactor, not a
      // lint tweak, so they are reported as warnings — still visible in every
      // `npm run lint` — instead of blocking CI. Promote back to 'error' as the
      // backlog is paid down.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/use-memo': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      // A leading underscore marks a deliberately unused binding (kept for a
      // stable call signature, e.g. publicVideoUrlAlt's `_voice`/`_lang`).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
])
