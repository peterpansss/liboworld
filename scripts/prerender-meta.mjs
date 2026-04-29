#!/usr/bin/env node
/**
 * Postbuild: generate per-route static HTML stubs with route-specific
 * <title>, <meta>, OG tags, canonical, and JSON-LD pre-injected into <head>.
 *
 * The body is still the standard SPA shell (`<div id="root"></div>` + bundle),
 * so the client takes over after first paint. Crawlers (Google, Facebook,
 * Twitter, LinkedIn, Slack, Discord) read meta tags from the static <head>
 * before any JS runs, which solves the social-share-preview problem.
 *
 * Routes covered in PR 1:
 *   /exercises/<slug>   → dist/exercises/<slug>/index.html
 *
 * Future PRs can extend this to /workouts/* and /blog/*.
 *
 * Run: node scripts/prerender-meta.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const DIST = path.join(REPO_ROOT, 'react-app', 'dist');
const SITE_URL = 'https://liboworld.com';
const VIDEO_UPLOAD_DATE_FALLBACK = '2026-01-01';
const DEFAULT_OG_IMAGE = `${SITE_URL}/brand/libo-og-image.jpg`;

// ── Helpers replicated from src/utils/exerciseInfo.ts (kept in sync manually).
//    These need no react/vite to run, just plain string transforms.
const BODY_FOCUS_MUSCLE_MAP = {
  Chest: ['Chest', 'Front Delts', 'Triceps'],
  Back: ['Lats', 'Rhomboids', 'Rear Delts', 'Biceps'],
  Shoulders: ['Front Delts', 'Side Delts', 'Rear Delts', 'Traps'],
  Biceps: ['Biceps', 'Forearms'],
  Triceps: ['Triceps', 'Chest'],
  Legs: ['Quads', 'Hamstrings', 'Glutes', 'Calves'],
  Glutes: ['Glutes', 'Hamstrings', 'Hip Flexors'],
  Core: ['Abs', 'Obliques', 'Lower Back'],
  Hamstrings: ['Hamstrings', 'Glutes', 'Lower Back'],
  Calves: ['Calves'],
  Forearms: ['Forearms', 'Biceps'],
  Traps: ['Traps', 'Rear Delts', 'Rhomboids'],
  'Full Body': ['Quads', 'Glutes', 'Core', 'Shoulders', 'Back'],
  Quads: ['Quads', 'Glutes', 'Calves'],
};
const MUSCLE_KEYS = Object.keys(BODY_FOCUS_MUSCLE_MAP);

function getPrimaryMuscleGroup(bodyFocus) {
  const parts = bodyFocus.split(/[\/&,]+/).map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    if (BODY_FOCUS_MUSCLE_MAP[part]) return part;
    const key = MUSCLE_KEYS.find(
      (k) =>
        part.toLowerCase().includes(k.toLowerCase()) ||
        k.toLowerCase().includes(part.toLowerCase()),
    );
    if (key) return key;
  }
  return parts[0] ?? bodyFocus;
}

function exerciseThumbPath(ex) {
  if (!ex.videoUrl) return null;
  const basename = ex.videoUrl
    .split('?')[0]
    .split('/')
    .pop()
    ?.replace(/\.mp4$/i, '');
  if (!basename) return null;
  return `/images/thumbnails/exercises/${basename}.jpg`;
}

function instructionsFromSetupNotes(setupNotes) {
  if (!setupNotes) return [];
  return setupNotes
    .split(/\.\s+/)
    .map((s) => s.trim().replace(/\.$/, ''))
    .filter((s) => s.length > 5)
    .map((s) => s + '.');
}

function exerciseDescription(ex) {
  const notes = (ex.setupNotes || '').trim();
  if (notes) return notes.length > 240 ? notes.slice(0, 237) + '…' : notes;
  return `${ex.name} — ${ex.bodyFocus} exercise using ${ex.equipment}. ${ex.diff} difficulty.`;
}

function buildExerciseGraph(ex, primaryMuscle) {
  const steps = instructionsFromSetupNotes(ex.setupNotes).map((text, i) => ({
    '@type': 'HowToStep',
    position: i + 1,
    name: `Step ${i + 1}`,
    text,
  }));
  const thumb = exerciseThumbPath(ex);
  const absoluteThumb = thumb ? `${SITE_URL}${thumb}` : null;

  const howTo = {
    '@type': 'HowTo',
    '@id': `${SITE_URL}/exercises/${ex.id}#howto`,
    name: `How to do ${ex.name}`,
    description: exerciseDescription(ex),
    step: steps,
    tool: [{ '@type': 'HowToTool', name: ex.equipment }],
  };
  if (absoluteThumb) howTo.image = absoluteThumb;

  const breadcrumb = {
    '@type': 'BreadcrumbList',
    '@id': `${SITE_URL}/exercises/${ex.id}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Exercises',
        item: `${SITE_URL}/exercises`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: primaryMuscle,
        item: `${SITE_URL}/exercises?muscle=${encodeURIComponent(primaryMuscle)}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: ex.name,
        item: `${SITE_URL}/exercises/${ex.id}`,
      },
    ],
  };

  const graph = [howTo, breadcrumb];

  if (ex.videoUrl) {
    graph.push({
      '@type': 'VideoObject',
      '@id': `${SITE_URL}/exercises/${ex.id}#video`,
      name: `${ex.name} demo`,
      description: exerciseDescription(ex),
      thumbnailUrl: absoluteThumb || undefined,
      contentUrl: ex.videoUrl,
      uploadDate: VIDEO_UPLOAD_DATE_FALLBACK,
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

// ── Build the head injection string ──
function buildHeadInjection({
  title,
  description,
  canonical,
  ogImage,
  ogType,
  jsonLd,
}) {
  const escaped = (s) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const metaTags = [
    `<title>${escaped(title)}</title>`,
    `<meta name="description" content="${escaped(description)}" />`,
    `<link rel="canonical" href="${escaped(canonical)}" />`,
    `<meta property="og:title" content="${escaped(title)}" />`,
    `<meta property="og:description" content="${escaped(description)}" />`,
    `<meta property="og:url" content="${escaped(canonical)}" />`,
    `<meta property="og:image" content="${escaped(ogImage)}" />`,
    `<meta property="og:type" content="${escaped(ogType)}" />`,
    `<meta property="og:site_name" content="Libo" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escaped(title)}" />`,
    `<meta name="twitter:description" content="${escaped(description)}" />`,
    `<meta name="twitter:image" content="${escaped(ogImage)}" />`,
  ];
  // JSON-LD: don't escape — it's already a JSON string. Strip </script> as a safety measure.
  const jsonLdSafe = JSON.stringify(jsonLd).replace(/<\/script>/gi, '<\\/script>');
  metaTags.push(`<script type="application/ld+json">${jsonLdSafe}</script>`);

  return metaTags.join('\n    ');
}

// ── Inject into the base index.html template ──
function injectHead(template, injection) {
  // Strip the existing <title> and generic <meta name="description"> so per-route values win.
  let html = template
    .replace(/<title>[^<]*<\/title>/, '')
    .replace(/<meta\s+name="description"[^>]*\/?>/, '');
  // Insert before </head>
  return html.replace('</head>', `    ${injection}\n  </head>`);
}

function main() {
  const indexHtmlPath = path.join(DIST, 'index.html');
  if (!fs.existsSync(indexHtmlPath)) {
    console.error(`prerender-meta: ${indexHtmlPath} missing — run \`vite build\` first.`);
    process.exit(1);
  }
  const template = fs.readFileSync(indexHtmlPath, 'utf8');

  const exercisesPath = path.join(DIST, 'exercises.json');
  const exercises = JSON.parse(fs.readFileSync(exercisesPath, 'utf8'));

  let count = 0;
  for (const ex of exercises) {
    if (!ex.id) continue;
    const primaryMuscle = getPrimaryMuscleGroup(ex.bodyFocus);
    const thumb = exerciseThumbPath(ex);
    const ogImage = thumb ? `${SITE_URL}${thumb}` : DEFAULT_OG_IMAGE;
    const description =
      ex.setupNotes && ex.setupNotes.length > 158
        ? ex.setupNotes.replace(/\s+/g, ' ').slice(0, 155) + '…'
        : (ex.setupNotes || '').replace(/\s+/g, ' ').trim() ||
          `Learn how to perform ${ex.name} — a ${ex.diff} ${ex.bodyFocus.toLowerCase()} exercise using ${ex.equipment.toLowerCase()}.`;

    const injection = buildHeadInjection({
      title: `${ex.name} — How to Perform | Libo`,
      description,
      canonical: `${SITE_URL}/exercises/${ex.id}`,
      ogImage,
      ogType: 'article',
      jsonLd: buildExerciseGraph(ex, primaryMuscle),
    });

    const html = injectHead(template, injection);
    const outDir = path.join(DIST, 'exercises', ex.id);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), html);
    count++;
  }

  console.log(`prerender-meta: wrote ${count} exercise route stubs into dist/exercises/<slug>/index.html`);
}

main();
