/**
 * Emit react-app/public/faq.json — the FAQ the mobile app fetches.
 *
 * WHY THIS EXISTS: the website's FAQ copy lives as i18n keys consumed by
 * FunnelFAQ/Home/Pricing, which means it is only reachable inside the compiled
 * JS bundle. The app can't scrape that. This publishes the same copy as a plain
 * static JSON next to exercises.json, so mobile fetches it at runtime and the
 * website stays the single place anyone edits FAQ text.
 *
 * Structure comes from src/data/faq.ts (ids + which i18n keys, in file order);
 * copy comes from src/i18n/locales/<lang>.json. Both halves stay authoritative —
 * nothing is duplicated here.
 *
 * Output shape:
 *   { "generatedAt": "...", "langs": ["en", ...],
 *     "items": [ { "id": "different", "en": { "q": "...", "a": "..." }, ... } ] }
 *
 * Run: node scripts/generate-faq-json.mjs   (wired into react-app's build)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');
const FAQ_TS = path.join(REPO_ROOT, 'react-app', 'src', 'data', 'faq.ts');
const LOCALES_DIR = path.join(REPO_ROOT, 'react-app', 'src', 'i18n', 'locales');
const OUT = path.join(REPO_ROOT, 'react-app', 'public', 'faq.json');

const LANGS = ['en', 'es', 'pt', 'de', 'fr'];

/** Resolve a dotted i18n key ("relaunchHome.faq.q1") against a locale object. */
function lookup(obj, dotted) {
  return dotted.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
}

/**
 * Pull { id, qKey, aKey } out of faq.ts in declaration order.
 *
 * Regex rather than importing it: faq.ts is TypeScript and this script runs as
 * plain Node during the build, with no transpile step in the path.
 */
function readFaqStructure() {
  const src = fs.readFileSync(FAQ_TS, 'utf8');
  const items = [];
  const re = /\{\s*id:\s*'([^']+)'\s*,\s*qKey:\s*'([^']+)'\s*,\s*aKey:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    items.push({ id: m[1], qKey: m[2], aKey: m[3] });
  }
  return items;
}

function main() {
  const structure = readFaqStructure();
  if (structure.length === 0) {
    console.error('generate-faq-json: parsed 0 items from faq.ts — refusing to write an empty FAQ.');
    process.exit(1);
  }

  const locales = {};
  for (const lang of LANGS) {
    const p = path.join(LOCALES_DIR, `${lang}.json`);
    if (!fs.existsSync(p)) {
      console.error(`generate-faq-json: missing locale ${p}`);
      process.exit(1);
    }
    locales[lang] = JSON.parse(fs.readFileSync(p, 'utf8'));
  }

  const items = [];
  let missing = 0;
  for (const { id, qKey, aKey } of structure) {
    const entry = { id };
    for (const lang of LANGS) {
      const q = lookup(locales[lang], qKey);
      const a = lookup(locales[lang], aKey);
      // A locale missing a translation falls back to English rather than
      // shipping an empty accordion row.
      if (typeof q !== 'string' || typeof a !== 'string') {
        missing += 1;
        entry[lang] = {
          q: lookup(locales.en, qKey) ?? '',
          a: lookup(locales.en, aKey) ?? '',
        };
      } else {
        entry[lang] = { q, a };
      }
    }
    items.push(entry);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    langs: LANGS,
    items,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(
    `wrote faq.json (${items.length} items × ${LANGS.length} langs` +
      (missing ? `, ${missing} fell back to English` : '') +
      ')',
  );
}

main();
