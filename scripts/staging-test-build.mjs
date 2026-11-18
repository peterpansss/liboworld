import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appDir = join(root, 'react-app');
const distDir = join(appDir, 'dist');
const testHost = 'https://ihcjvzhqsbwwpfqzwhzv.supabase.co';
const liveRef = 'oaftqweofrifoiuwntce';
const liveHost = `https://${liveRef}.supabase.co`;

// Match Vite's production-mode file precedence for simple literal settings.
// Reject interpolation so this check cannot disagree with Vite's expansion.
function loadBuildEnv() {
  const values = {};
  for (const name of ['.env', '.env.local', '.env.production', '.env.production.local']) {
    const path = join(appDir, name);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match) continue;
      let value = match[2];
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      } else {
        value = value.replace(/\s+#.*$/, '').trim();
      }
      if (value.includes('$')) throw new Error(`${name}: environment interpolation is not supported by the staging preflight.`);
      values[match[1]] = value;
    }
  }
  return { ...values, ...process.env };
}

function assertStagingEnv(values) {
  if (values.VITE_SUPABASE_URL !== testHost) {
    throw new Error(`Staging build requires VITE_SUPABASE_URL=${testHost}.`);
  }
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(values.VITE_SUPABASE_ANON_KEY ?? '')) {
    throw new Error('Staging build requires this test project’s publishable key in VITE_SUPABASE_ANON_KEY.');
  }
  if (values.VITE_STRIPE_PUBLISHABLE_KEY && !values.VITE_STRIPE_PUBLISHABLE_KEY.startsWith('pk_test_')) {
    throw new Error('Staging build refuses a live Stripe publishable key.');
  }
}

function writeStagingOnboarding(values) {
  const source = readFileSync(join(root, 'onboarding.html'), 'utf8');
  const gaSnippet = /<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-R05YQ1CH2N"><\/script>\s*<script>window\.dataLayer=.*?<\/script>/s;
  if (!gaSnippet.test(source)) throw new Error('Standalone onboarding analytics changed; inspect before making a test artifact.');
  const noAnalytics = source.replace(gaSnippet, '');
  const marker = 'const sb = createClient(';
  if (noAnalytics.split(marker).length !== 2) throw new Error('Expected one standalone onboarding Supabase client.');
  const start = noAnalytics.indexOf(marker);
  const end = noAnalytics.indexOf(');', start);
  if (end < 0 || !noAnalytics.slice(start, end).includes(liveRef)) {
    throw new Error('Standalone onboarding client changed; inspect it before making a test artifact.');
  }
  const replacement = `const sb = createClient(\n    ${JSON.stringify(values.VITE_SUPABASE_URL)},\n    ${JSON.stringify(values.VITE_SUPABASE_ANON_KEY)}\n  );`;
  const output = noAnalytics.slice(0, start) + replacement + noAnalytics.slice(end + 2);
  mkdirSync(distDir, { recursive: true });
  writeFileSync(join(distDir, 'onboarding.html'), output);
}

function removeProductionVoiceovers() {
  const path = join(distDir, 'exercises.json');
  if (!existsSync(path)) throw new Error('Build output is missing exercises.json.');
  const exercises = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(exercises)) throw new Error('Build exercises.json has an unexpected shape.');
  for (const exercise of exercises) {
    // Production voiceovers are public media, but test builds must never fetch
    // from the production Supabase project. Test media can be seeded separately.
    if (typeof exercise.voiceoverUrl === 'string' && exercise.voiceoverUrl.startsWith(liveHost)) {
      delete exercise.voiceoverUrl;
    }
  }
  writeFileSync(path, JSON.stringify(exercises));
}

function disableLiveTrackers(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      disableLiveTrackers(path);
    } else if (entry.name.endsWith('.js')) {
      const contents = readFileSync(path, 'utf8');
      const disabled = contents
        .replaceAll('https://www.googletagmanager.com/gtag/js?id=', 'about:blank#staging-ga?id=')
        .replaceAll('https://connect.facebook.net/en_US/fbevents.js', 'about:blank#staging-meta')
        .replaceAll('G-R05YQ1CH2N', 'G-STAGING-TEST')
        .replaceAll('1582491946914169', '0');
      if (disabled !== contents) writeFileSync(path, disabled);
    }
  }
}

function markTestPagesNoIndex(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      markTestPagesNoIndex(path);
    } else if (entry.name.endsWith('.html')) {
      const contents = readFileSync(path, 'utf8');
      if (!/<head>/i.test(contents)) throw new Error(`Test page has no HTML head: ${path}`);
      if (contents.includes('<meta name="robots" content="noindex,nofollow">')) continue;
      writeFileSync(path, contents.replace(/<head>/i, '<head>\n<meta name="robots" content="noindex,nofollow">'));
    }
  }
}

function assertNoLiveBackend(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      assertNoLiveBackend(path);
    } else if (/\.(?:html|js|json)$/.test(entry.name)) {
      const contents = readFileSync(path, 'utf8');
      if (contents.includes(liveHost)) throw new Error(`Staging artifact contains the live Supabase URL: ${path}`);
      if (contents.includes('pk_live_') || contents.includes('sk_live_') || contents.includes('sb_secret_')) {
        throw new Error(`Staging artifact contains a live payment key or server secret: ${path}`);
      }
      if (contents.includes('www.googletagmanager.com/gtag/js') || contents.includes('connect.facebook.net/en_US/fbevents.js')
        || contents.includes('G-R05YQ1CH2N') || contents.includes('1582491946914169')) {
        throw new Error(`Staging artifact contains a live analytics loader: ${path}`);
      }
    }
  }
}

const values = loadBuildEnv();
assertStagingEnv(values);
if (process.argv[2] === 'preflight') {
  console.log('World staging test backend configuration validated.');
} else if (process.argv[2] === 'finish') {
  if (!existsSync(distDir)) throw new Error('Build output is missing. Run the staging build first.');
  writeStagingOnboarding(values);
  removeProductionVoiceovers();
  disableLiveTrackers(distDir);
  markTestPagesNoIndex(distDir);
  writeFileSync(join(distDir, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  assertNoLiveBackend(distDir);
  console.log('World staging artifact contains only the isolated test Supabase project.');
} else {
  throw new Error('Use preflight or finish.');
}
