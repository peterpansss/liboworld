/**
 * The two funnel films, shot 25 Aug 2026 and cut for the website.
 *
 * Single source of truth for both funnel pages, the way `challengeTiers.ts` is
 * for tier facts. Masters live at
 * `Brand-Management/Marketing/FunnelVideosLiboWeb/`; web renditions are encoded
 * by `scripts/encode-marketing-video.sh` and pushed to R2 by
 * `libo-landing/scripts/upload-marketing-video.mjs`.
 *
 * Why R2 and not `public/`: `.gitignore` excludes `*.mp4` repo-wide, so an mp4
 * dropped in `public/` never reaches the CI build and never ships. Posters are
 * JPGs, so those DO live in `public/` and deploy normally.
 */

/** R2 public base — same bucket and custom domain as the exercise clips. */
const CDN = 'https://videos.liboworld.com/marketing';

/**
 * Bumped by hand whenever a film is re-encoded and re-uploaded. Cloudflare
 * caches these aggressively (immutable), and the filenames are stable, so this
 * query string is the only thing that busts the edge. Same trick as the `?v=`
 * on exercise `videoUrl`s.
 */
const V = '1785331200000';

export type FunnelVideo = {
  /** Desktop rendition, 1920×1080. */
  src1080: string;
  /** Narrow-viewport rendition, 1280×720 — roughly a third of the bytes. */
  src720: string;
  /** Poster still, served from the site itself (not R2). */
  poster: string;
  /** Rendered next to the play button, e.g. "2:44". */
  duration: string;
  /** Seconds — for the VideoObject `duration` in ISO-8601. */
  durationSeconds: number;
  /** Human title, used for schema.org and the analytics event name. */
  title: string;
};

function urls(base: string) {
  return {
    src1080: `${CDN}/${base}-1080p.mp4?v=${V}`,
    src720: `${CDN}/${base}-720p.mp4?v=${V}`,
    poster: `/funnel-media/${base}-poster.jpg`,
  };
}

export const FOUNDING_MEMBER_VIDEO: FunnelVideo = {
  ...urls('founding-member'),
  duration: '2:44',
  durationSeconds: 164,
  title: 'Become a Founding Member — Libo Training Club',
};

export const CASH_CHALLENGE_VIDEO: FunnelVideo = {
  ...urls('cash-challenge'),
  duration: '2:24',
  durationSeconds: 144,
  title: 'How the Libo cash challenge works',
};

/** ISO-8601 duration, e.g. 164 → "PT2M44S". */
function isoDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `PT${m}M${s}S`;
}

/**
 * schema.org VideoObject for `SeoHead`'s `jsonLd` prop. Google wants an
 * absolute `thumbnailUrl` and an `uploadDate`, so both are absolute/literal
 * rather than derived at render time.
 */
export function buildFunnelVideoSchema(video: FunnelVideo, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.title,
    description,
    thumbnailUrl: `https://liboworld.com${video.poster}`,
    uploadDate: '2026-08-27',
    duration: isoDuration(video.durationSeconds),
    contentUrl: video.src1080,
    inLanguage: 'en',
  };
}
