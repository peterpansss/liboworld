/**
 * The three filmed beta-tester testimonials on the homepage video wall.
 *
 * Sibling of `funnelVideos.ts`, and the same deal: masters are cut and encoded
 * locally, renditions live on R2, posters ship from `public/`. Split into its
 * own module because these carry things a funnel film does not — a person's
 * name, the verbatim line pulled out of their own footage, and a caption track.
 *
 * Filmed per the brief at
 * `Brand-Management/Marketing/Pre-Launch/UserVoices/`. That brief is also where
 * the naming rules come from, and they are not stylistic:
 *
 *   - `badge` is "BETA TESTER". Never a payout claim. The fabricated
 *     "PAID €15" badges these replace were logged as live legal exposure.
 *   - `quote` is what the person actually said, lifted from their own
 *     transcript. It is deliberately NOT wrapped in `t()` — a translated
 *     "verbatim quote" is a contradiction, and the caption track already
 *     carries the full text for anyone who needs it.
 *
 * Masters: `~/Downloads/LiboWorldWebsiteVideosReviews/{Somin,Jerson,Ken}Libo.mp4`
 * (2160×3840 phone footage). Encoded by `scripts/encode-testimonial-video.sh`,
 * uploaded by `libo-landing/scripts/upload-marketing-video.mjs`.
 *
 * Crop and trim per person, so a re-cut reproduces exactly:
 *
 *   somin   crop 2160:2700:0:609      0.00 → 30.70   poster @12s
 *   jerson  crop 1600:2000:280:1000  45.80 → 74.85   poster @50s
 *   ken     crop 1900:2375:300:820   45.05 → 72.10   poster @60s
 *
 * Avatar crops, same masters and timestamps, square and face-centred:
 *
 *   somin   crop 1500:1500:400:800
 *   jerson  crop 1250:1250:500:1330
 *   ken     crop 1250:1250:560:1240
 *
 * The two long ones are trimmed on WORD boundaries taken from whisper's
 * word-level output, not on its sentence cues — the cue boundaries fall
 * mid-phrase and cost Jerson his "After work" and Ken his "I feel that
 * you're going to".
 */

/** R2 public base — same bucket and custom domain as the funnel films. */
const CDN = 'https://videos.liboworld.com/marketing';

/**
 * Bumped by hand whenever a clip is re-encoded and re-uploaded. Filenames are
 * stable, so this query string is the only thing that busts the Cloudflare
 * edge. Same trick as `funnelVideos.ts`.
 */
const V = '1788307200000';

export type TestimonialVideo = {
  /** Stable id — also the R2 basename and the analytics event name. */
  id: string;
  /** Card rendition, 1080×1350 (4:5). */
  src1080: string;
  /** Narrow-viewport rendition, 720×900. */
  src720: string;
  /** Poster still, 1080×1350, served from the site itself (not R2). */
  poster: string;
  /**
   * Square face crop, 160px. The funnel quote cards show a 32px circle and the
   * homepage written reviews a 44px one; centre-cropping the 4:5 poster to a
   * circle cuts the forehead off, so this is framed separately.
   */
  avatar: string;
  /** Caption track, served from the site itself. */
  vtt: string;
  /**
   * Exactly as it appears on the card, which renders it uppercase.
   *
   * A literal string rather than first-name + last-initial: two of the three
   * are "Somin K." / "Jerson O.", but Ken is a doctor and goes by his full
   * name and title, which no initial-assembling helper survives contact with.
   */
  displayName: string;
  /** Never a payout or result claim. See the note above. */
  badge: string;
  /** Verbatim, from this person's own transcript. Two lines on the card. */
  quote: string;
  /** Rendered next to the play button, e.g. "0:29". */
  duration: string;
  /** Seconds — for the VideoObject `duration` in ISO-8601. */
  durationSeconds: number;
  /** Human title, for schema.org. */
  title: string;
};

function urls(base: string) {
  return {
    src1080: `${CDN}/${base}-1080p.mp4?v=${V}`,
    src720: `${CDN}/${base}-720p.mp4?v=${V}`,
    poster: `/funnel-media/${base}-poster.jpg`,
    avatar: `/funnel-media/${base}-avatar.jpg`,
    vtt: `/funnel-media/${base}.vtt`,
  };
}

export const TESTIMONIAL_VIDEOS: TestimonialVideo[] = [
  {
    id: 'voice-somin',
    ...urls('voice-somin'),
    displayName: 'Somin K.',
    badge: 'BETA TESTER',
    quote:
      "I'm just lazy. I just want a simple plan and to get back into working out — this is perfect for me.",
    duration: '0:30',
    durationSeconds: 30,
    title: 'Somin K. on training with Libo',
  },
  {
    id: 'voice-jerson',
    ...urls('voice-jerson'),
    displayName: 'Jerson O.',
    badge: 'BETA TESTER',
    quote:
      "After work you're tired. You don't want to spend time looking for what to do — you want to go straight to the point.",
    duration: '0:29',
    durationSeconds: 29,
    title: 'Jerson O. on training with Libo',
  },
  {
    id: 'voice-ken',
    ...urls('voice-ken'),
    displayName: 'Dr. Kenneth Sullivan-Bol',
    badge: 'BETA TESTER',
    quote:
      "It takes the thinking out — and the concern that you're not doing the right thing for the right muscle group.",
    duration: '0:27',
    durationSeconds: 27,
    title: 'Dr. Kenneth Sullivan-Bol on training with Libo',
  },
];

/** ISO-8601 duration, e.g. 29 → "PT0M29S". */
function isoDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `PT${m}M${s}S`;
}

/**
 * One schema.org VideoObject. No `@context` — these are only ever emitted
 * inside the `@graph` below, and repeating the context on every node is noise.
 */
function videoObject(v: TestimonialVideo) {
  return {
    '@type': 'VideoObject',
    name: v.title,
    description: v.quote,
    thumbnailUrl: `https://liboworld.com${v.poster}`,
    uploadDate: '2026-09-06',
    duration: isoDuration(v.durationSeconds),
    contentUrl: v.src1080,
    inLanguage: 'en',
  };
}

/**
 * All three as one `@graph` for `SeoHead`'s `jsonLd` prop, which takes a single
 * object. `buildFunnelVideoSchema` emits a lone VideoObject because those pages
 * carry exactly one film; the homepage carries three, and a graph is how you
 * say that in one script tag.
 */
export function buildTestimonialVideoGraph(videos: TestimonialVideo[] = TESTIMONIAL_VIDEOS) {
  return {
    '@context': 'https://schema.org',
    '@graph': videos.map(videoObject),
  };
}
