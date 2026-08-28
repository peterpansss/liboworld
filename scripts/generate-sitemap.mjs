#!/usr/bin/env node
/**
 * Generate sitemap.xml covering every public route on liboworld.com:
 *   /, /exercises, /exercises/<slug>, /workouts, /workouts/<id>,
 *   /blog, /blog/<slug>, /privacy, /terms, /rules.
 *
 * Reads source data:
 *   - react-app/public/exercises.json  (680 exercises)
 *   - react-app/public/workouts.json   (136 workouts)
 *   - react-app/src/data/blog.ts       (parsed for slugs)
 *
 * Writes to:
 *   - <repo>/sitemap.xml
 *   - <repo>/react-app/public/sitemap.xml  (so vite copies it into dist/)
 *   - <repo>/react-app/dist/sitemap.xml    (also overwritten by deploy.yml)
 *
 * Run: node scripts/generate-sitemap.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SITE_URL = 'https://liboworld.com';

const EXERCISES_JSON = path.join(REPO_ROOT, 'react-app', 'public', 'exercises.json');
const WORKOUTS_JSON = path.join(REPO_ROOT, 'react-app', 'public', 'workouts.json');
const FACETS_JSON = path.join(REPO_ROOT, 'react-app', 'public', 'workout-facets.json');
const BLOG_TS = path.join(REPO_ROOT, 'react-app', 'src', 'data', 'blog.ts');

// NOTE the third path. This script runs as `postbuild`, i.e. AFTER Vite has
// already copied `public/` into `dist/` — so writing only to `public/` leaves
// `dist/sitemap.xml` holding the PREVIOUS build's output, and `dist/` is what
// gets deployed. The result was a deployed sitemap permanently one build
// behind (two builds in a row were needed for a change to ship). Writing
// `dist/` directly closes that gap.
const OUTPUTS = [
  path.join(REPO_ROOT, 'sitemap.xml'),
  path.join(REPO_ROOT, 'react-app', 'public', 'sitemap.xml'),
  path.join(REPO_ROOT, 'react-app', 'dist', 'sitemap.xml'),
];

const TODAY = new Date().toISOString().slice(0, 10);

function urlEntry(loc, priority, changefreq, lastmod = TODAY) {
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority != null ? `    <priority>${priority.toFixed(1)}</priority>` : null,
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');
}

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function loadBlogSlugs() {
  const src = fs.readFileSync(BLOG_TS, 'utf8');
  const slugs = [];
  const re = /slug:\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src)) !== null) slugs.push(m[1]);
  return slugs;
}

function main() {
  const exercises = JSON.parse(fs.readFileSync(EXERCISES_JSON, 'utf8'));
  const workouts = JSON.parse(fs.readFileSync(WORKOUTS_JSON, 'utf8'));
  const blogSlugs = loadBlogSlugs();

  const entries = [];

  // Static high-priority routes
  entries.push(urlEntry(`${SITE_URL}/`, 1.0, 'weekly'));
  entries.push(urlEntry(`${SITE_URL}/exercises`, 0.9, 'weekly'));
  entries.push(urlEntry(`${SITE_URL}/workouts`, 0.9, 'weekly'));
  entries.push(urlEntry(`${SITE_URL}/blog`, 0.8, 'weekly'));
  entries.push(urlEntry(`${SITE_URL}/onboarding`, 0.6, 'monthly'));
  // /giveaway and /cash-challenge are NOT listed. Both redirect to `/` while
  // LAUNCH_MODE is 'prelaunch' (see react-app/src/App.tsx), so advertising them
  // asks Google to crawl URLs that serve no content — soft-404s that dilute the
  // pages that do. Re-add them in the same commit that flips LAUNCH_MODE to
  // 'launched', not before.
  // Brand pages from the site relaunch. The funnels they feed (/join and
  // /cash-challenges/<tier>) are deliberately NOT listed — they're conversion
  // surfaces with one action and no standalone search intent, and indexing them
  // would compete with the catalogue page that should rank.
  // /pricing, /money-challenges and /affiliate are not listed either: they are
  // now <Navigate> redirects to the routes below.
  entries.push(urlEntry(`${SITE_URL}/cash-challenges`, 0.8, 'weekly'));
  entries.push(urlEntry(`${SITE_URL}/membership`, 0.7, 'monthly'));
  entries.push(urlEntry(`${SITE_URL}/get-app`, 0.5, 'monthly'));
  entries.push(urlEntry(`${SITE_URL}/privacy`, 0.3, 'yearly'));
  entries.push(urlEntry(`${SITE_URL}/terms`, 0.3, 'yearly'));
  // /rules — the public Cash Challenge Rules. Indexed on purpose, unlike the
  // funnels: the launch films name liboworld.com/rules out loud, so people
  // will search for it.
  entries.push(urlEntry(`${SITE_URL}/rules`, 0.4, 'monthly'));

  // Exercise detail pages — slug-first, id fallback (route is /exercises/:slug)
  for (const ex of exercises) {
    const urlKey = ex.slug || ex.id;
    if (!urlKey) continue;
    entries.push(urlEntry(`${SITE_URL}/exercises/${escapeXml(urlKey)}`, 0.7, 'monthly'));
  }

  // Workout detail pages
  for (const wk of workouts) {
    if (!wk.id) continue;
    entries.push(urlEntry(`${SITE_URL}/workouts/${escapeXml(wk.id)}`, 0.7, 'monthly'));
  }

  // Best-workouts facet landing pages — programmatic SEO hub network.
  // Slugs are stable (treated as an API by generate-workout-facets.mjs);
  // only facets with ≥3 matching workouts make it into the sidecar.
  if (fs.existsSync(FACETS_JSON)) {
    const facetData = JSON.parse(fs.readFileSync(FACETS_JSON, 'utf8'));
    for (const slug of Object.keys(facetData.facets || {})) {
      entries.push(urlEntry(`${SITE_URL}/best-workouts/${escapeXml(slug)}`, 0.7, 'weekly'));
    }
  }

  // Blog posts
  for (const slug of blogSlugs) {
    entries.push(urlEntry(`${SITE_URL}/blog/${escapeXml(slug)}`, 0.6, 'monthly'));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;

  for (const out of OUTPUTS) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, xml);
    console.log(`wrote ${path.relative(REPO_ROOT, out)} (${entries.length} URLs)`);
  }
}

main();
