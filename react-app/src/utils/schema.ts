/**
 * Schema.org JSON-LD builders for SEO. Combined into a single @graph object
 * per page so Google can pick up multiple types in one script tag.
 */

import type { Exercise } from '../data/exercises';
import { exerciseThumb } from './thumbnails';
import { getInstructions } from './exerciseInfo';

const SITE_URL = 'https://liboworld.com';
// VideoObject.uploadDate is required by Google. Real per-video upload dates aren't
// tracked in the JSON yet — we use a fixed sentinel that predates any real publish
// activity. PR 2/3 can replace this with R2 file mtimes.
const VIDEO_UPLOAD_DATE_FALLBACK = '2026-01-01';

function absoluteUrl(path: string): string {
  if (!path) return SITE_URL;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

function exerciseDescription(ex: Exercise): string {
  const notes = (ex.setupNotes || '').trim();
  if (notes) return notes.length > 240 ? notes.slice(0, 237) + '…' : notes;
  return `${ex.name} — ${ex.bodyFocus} exercise using ${ex.equipment}. ${ex.diff} difficulty.`;
}

export function buildHowToSchema(ex: Exercise) {
  const steps = getInstructions(ex).map((text, i) => ({
    '@type': 'HowToStep',
    position: i + 1,
    name: `Step ${i + 1}`,
    text,
  }));

  const image = exerciseThumb(ex);
  const out: Record<string, unknown> = {
    '@type': 'HowTo',
    '@id': `${SITE_URL}/exercises/${ex.id}#howto`,
    name: `How to do ${ex.name}`,
    description: exerciseDescription(ex),
    step: steps,
    tool: [{ '@type': 'HowToTool', name: ex.equipment }],
  };
  if (image) out.image = absoluteUrl(image);
  return out;
}

export function buildVideoObjectSchema(ex: Exercise) {
  if (!ex.videoUrl) return null;
  const thumb = exerciseThumb(ex);
  return {
    '@type': 'VideoObject',
    '@id': `${SITE_URL}/exercises/${ex.id}#video`,
    name: `${ex.name} demo`,
    description: exerciseDescription(ex),
    thumbnailUrl: thumb ? absoluteUrl(thumb) : undefined,
    contentUrl: ex.videoUrl,
    uploadDate: VIDEO_UPLOAD_DATE_FALLBACK,
  };
}

export function buildBreadcrumbSchema(ex: Exercise, primaryMuscle: string) {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${SITE_URL}/exercises/${ex.id}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Exercises', item: `${SITE_URL}/exercises` },
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
}

export function buildExerciseGraph(ex: Exercise, primaryMuscle: string) {
  const graph: Record<string, unknown>[] = [
    buildHowToSchema(ex) as Record<string, unknown>,
    buildBreadcrumbSchema(ex, primaryMuscle) as Record<string, unknown>,
  ];
  const video = buildVideoObjectSchema(ex);
  if (video) graph.push(video as Record<string, unknown>);
  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

export function exerciseCanonicalUrl(ex: Exercise): string {
  return `${SITE_URL}/exercises/${ex.id}`;
}

export function libraryCanonicalUrl(query?: string): string {
  return query ? `${SITE_URL}/exercises?${query}` : `${SITE_URL}/exercises`;
}
