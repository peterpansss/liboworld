# Isolated World test build

The regular `npm run build` keeps its existing production behavior. Use this
separate command when testing World against the personal Supabase project
`ihcjvzhqsbwwpfqzwhzv`:

```sh
cd react-app
npm run build:staging-test
```

Set these values in the ignored `react-app/.env.local` (or in the build process
environment) before running it:

```text
VITE_SUPABASE_URL=https://ihcjvzhqsbwwpfqzwhzv.supabase.co
VITE_SUPABASE_ANON_KEY=<that project's sb_publishable_ key>
```

The preflight rejects a different Supabase URL, a non-publishable key, or a
live Stripe publishable key. Leave the Stripe key unset for mock payment UI or
use a `pk_test_` key. The command builds the React app, adds a test-configured
copy of the standalone root `onboarding.html` to `react-app/dist`, removes
production Supabase voiceover URLs from the generated `exercises.json`, and
disables Libo's production Google Analytics and Meta Pixel trackers. It fails
if generated HTML, JS, or JSON still contains the production Supabase URL or a
live analytics loader. Test store buttons stay on the test site, QR codes use
the current site origin, and generated pages are marked `noindex` with a
disallowing `robots.txt`. The source `onboarding.html` and normal release build
are not rewritten.

This is an artifact check, not a deployed environment. The personal Supabase
project still needs the Libo schema, policies, Edge Functions, and test data
before end-to-end flows can run. Production voiceover media will be absent in
this build unless test media is seeded into the isolated project. Do not serve
the repository-root `onboarding.html` alongside a staging build: serve the
copy generated in `react-app/dist`.

Public marketing videos and images still come from Libo's media CDN, and legal
links and contact addresses still point to Libo. They are read-only or
explicitly navigational content. The test build makes no operational calls to
the production Supabase project, live Stripe, GA4, or Meta Pixel.
