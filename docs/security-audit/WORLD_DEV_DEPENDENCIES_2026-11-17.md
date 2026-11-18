# Libo World development dependency security candidate — 17 November 2026

Scope: `codex/security-world-2026-11-17` at `106b1d5`; only the `react-app`
project manifest, lockfile, and one test isolation fix changed. This is a
project-local candidate. No system/user package, runtime, package manager,
PATH, service, or global cache was installed or changed. No deployment occurred.

## Advisory result

The November 17 npm advisory graph changed as follows (affected package
entries, not independently exploitable Libo findings):

| Dependency scope | Before | Candidate |
| --- | --- | --- |
| Full lockfile | 3 critical / 15 high / 12 moderate / 1 low | **0 critical / 13 high / 0 moderate / 0 low** |
| Production only (`--omit=dev`) | 0 at all severities | **0 at all severities** |

The three critical entries were `vitest`, `@vitest/coverage-v8` by propagation,
and `tinypool`. The direct Vitest and coverage packages moved from 2.1.9 to
5.1.0; Vitest 5 no longer installs Tinypool. This also removes the older
Vitest/Vite/esbuild branch. The [Vitest maintainer advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-5xrq-8626-4rwp)
describes the exposed UI server risk; that particular path requires network
exposure or Windows. Libo's ordinary test command runs locally on this Mac,
but the dependency should not remain vulnerable in CI/developer use.

The remaining 13 high entries all lead through the unresolved
[`picomatch` ReDoS advisory](https://github.com/advisories/GHSA-fc5q-39xc-vjpf)
and its development-tool parents: `fdir`, `tinyglobby`, Vite, Vitest, coverage,
the Vite React plugin, and TypeScript ESLint. The locked `picomatch@4.0.7` is
still within npm's affected range `<=4.0.7`; npm currently offers no patched
4.x release. A partial older-line override does not remove this risk and can
inflate npm's parent advisory graph. Until a real patch is available, keep
Vite/Vitest development servers bound to localhost and do not serve
attacker-controlled glob patterns. No affected package is in World’s
production dependency set.

## Direct packages and provenance

The five direct changes below are exact pins. The dates are npm registry
publication times, not independently established artifact build dates. npm
records GitHub Actions as publisher for these versions. The `package-lock.json`
contains SHA-512 integrity for every resolved package and is the exact
dependency-change manifest.

| Package | Before → after | Published UTC | npm SHA-512 integrity |
| --- | --- | --- | --- |
| `vitest` | 2.1.9 → 5.1.0 | 2026-11-02 16:12 | `sha512-MzmNFnrwa8v8lF1bLxw3UJ4EREwVOVb75VqJZmUDRjJ6EluK/x9th7qTbaeDk41WxE1GxWqmTXcdsfobfH5sOA==` |
| `@vitest/coverage-v8` | 2.1.9 → 5.1.0 | 2026-11-02 16:11 | `sha512-OY9aShBQG5KOIw2zCo9fDoCHI9RHliNHJ//nM7m6jGg41Hyke9JOGWmeMlK74xYErsxMoK8mIB3gAeEyFVA7LA==` |
| `happy-dom` | 20.9.0 → 21.0.4 | 2026-10-20 18:05 | `sha512-tFm+GaLBgo6o0awHnvHaNoraVo27qJ+2tZEtZ+cIa08hXbeitrxAJajLI05hsUy/2/YTKcUjQYzHe5mCcraLBw==` |
| `vite` | 8.0.13 → 8.1.7 | 2026-11-09 11:02 | `sha512-VUfShUOzJPHXz1o6YpAy92kkbuke3SWfEnHzFKg6oIc+tfXHgSiIz36RhKR4UP0FvJaY8Ku/NPFjMRodAccWWg==` |
| `typescript-eslint` | 8.59.3 → 8.73.0 | 2026-11-16 17:07 | `sha512-+EnKy9rkYPun4l+kG2bDuYWQ6y1tGVgdR/tY1U9AC6h21CjEwOoc7gsjwe0FXB8uWFzk4QiCFbuRWgX758PiAg==` |

The Happy DOM update addresses the [maintainer’s import-alias code injection
advisory](https://github.com/capricorn86/happy-dom/security/advisories/GHSA-834v-8h66-3h79).
Vite 8.1.7 is beyond the 8.1.6 fixes in the [Vite/launch-editor
advisory](https://github.com/vitejs/launch-editor/security/advisories/GHSA-r825-w8mm-5pxw).
TypeScript ESLint 8.73.0 moves to patched Minimatch 11.0.9; the previous 10.x
line is within the npm denial-of-service advisory range. The exact release
pins are all younger than 30 days as of this review. They address known security findings
and are **project-local only**. Any later host/user package installation would
need its own user approval and exact maturity/provenance review under AGENTS.md.

## Full resolution and verification

`package.json` adds exact overrides for the affected compatible transitive
lines: Babel Core 7.29.13, Baseline Browser Mapping 2.11.23, Brace Expansion
1.1.21 and 5.0.12, Browserslist 4.29.0 plus four compatible dataset helpers,
JS-YAML 4.3.2, Nano ID 3.3.20, PostCSS 8.5.23, Source Map JS 1.2.2,
Undici 7.30.1, ws 8.21.0, and Zod 4.6.7. The lockfile has **85 version
changes, 14 additions, and 139 removals**; most removals belong to the old
Vitest/Vite dependency branch and optional platform builds. No unlisted
package-manager cleanup was run. React Router and React Router DOM remain
exactly **7.18.4**, preserving the World production fix.

`npm ci --ignore-scripts --no-audit --no-fund` installed the exact lock into
this isolated `react-app/node_modules` with a temporary cache under
`/private/tmp`, and npm checked tarball integrity. `npm audit signatures`
then verified registry signatures on all **353** installed packages and
attestations on **150**. Registry signatures authenticate package metadata
and tarball digests, not source safety. Independent build dates, source-to-tarball
reproducibility, and provenance for every transitive artifact remain unverified.

The exact-lock test suite passed **103 files, 1,133 tests, 1 skipped**. One
checkout mock test had relied on `mockClear()` resetting the prior test’s
mock implementation; Vitest 5 exposed that shared state, and the test now
explicitly resets and reinstates the default mock. Lint passed with the
existing 60 warnings. The normal World build and isolated staging test build
both passed; the latter’s artifact scanner found no production Supabase URL,
live Stripe key, server secret, or production GA/Meta marker. No browser or
live Supabase/provider tests were run from this branch.

Source evidence: [npm registry signature verification](https://docs.npmjs.com/verifying-registry-signatures/),
[npm audit behavior](https://docs.npmjs.com/auditing-package-dependencies-for-security-vulnerabilities/).
