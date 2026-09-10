/**
 * The four filmed beta-tester testimonials on the homepage video wall.
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
 * (2160×3840 phone footage) and `SOS-LIB.MOV` at the repo root for Gabriel.
 * Encoded by `scripts/encode-testimonial-video.sh`, uploaded by
 * `libo-landing/scripts/upload-marketing-video.mjs`.
 *
 * Crop and trim per person, so a re-cut reproduces exactly:
 *
 *   somin   crop 2160:2700:0:609      0.00 → 30.70   poster @12s
 *   jerson  crop 1600:2000:280:1000  45.80 → 74.85   poster @50s
 *   ken     crop 1900:2375:300:820   45.05 → 72.10   poster @60s
 *   gabriel crop 1080:1350:0:240      0.00 → 24.09   poster @12s
 *
 * Gabriel ships FULL and untrimmed, reverted 2026-09-10 from a 7-second cut.
 * That cut removed a body-results line and "It's free, so check it out" on the
 * grounds of the never-say rules — which was wrong. Those rules govern LIBO's
 * OWN copy: "Libo gets you in the best shape of your life" is a company claim.
 * A named beta tester describing his own experience in his own voice is the
 * entire point of a testimonial, and "it's free" is simply true — the app is
 * free to use and Premium is optional. Do not re-trim this for content.
 *
 * His crop is the odd one out in two ways. His master is 1080x1920, NOT
 * 2160x3840 like the other three, so 1080 wide is the FULL frame and the
 * numbers are not comparable to theirs — it is also the only crop that neither
 * up- nor downscales. And y=240 is a COMPROMISE, not a best fit: the framing
 * changes hard at 8.67s from arm's-length torso to a close talking head, and
 * his head sits at roughly y=370 at 21s but y=780 at 12s. 240 is the offset
 * that keeps his head whole on both sides of that cut. The earlier y=470 was
 * tuned only for the 8.69-15.80 window and decapitates him after it.
 *
 * Avatar crops, same masters and timestamps, square and face-centred:
 *
 *   somin   crop 1500:1500:400:800
 *   jerson  crop 1250:1250:500:1330
 *   ken     crop 1250:1250:560:1240
 *   gabriel crop 760:760:150:700
 *
 * **Gabriel's crop numbers are on a different scale.** His master is 1080×1920,
 * not 2160×3840 like the other three, so 1080:1350:0:470 is the FULL width of
 * the frame — the equivalent of Somin's full-width crop, not of Ken's tight
 * one. Doubling it to compare against the others is the mistake to avoid. It is
 * also the only crop here that neither up- nor downscales: 1080×1350 out of a
 * 1080-wide master is 1:1, and anything narrower would have upscaled.
 *
 * The long ones are trimmed on WORD boundaries taken from whisper's word-level
 * output, not on its sentence cues — the cue boundaries fall mid-phrase and
 * cost Jerson his "After work" and Ken his "I feel that you're going to".
 * Word times only choose the words, though; the cuts themselves come from
 * `ffmpeg silencedetect`, because whisper's word timings absorb the pauses
 * either side and drift up to ~150ms off the actual audio edge.
 *
 * Gabriel's 7 seconds are the whole of what his 24.09s master can ship, and
 * the reason is worth keeping written down. The sentence before his
 * ("This is honestly crazy, and I generally achieve this result with the help
 * of Libo") and the two after it ("get the best form of your life in a short
 * amount of time" / "It's free, so check it out") all fail the never-say
 * checklist in `UserVoices/USER-VOICES-BRIEF.md` — the first two on rule 6,
 * body results, which the brief flags as the rule people break by accident.
 * The master is also framed as a physique display for its first 8.67s (phone
 * held at arm's length, full torso in frame) before he hard-cuts to a talking
 * head at 8.672; the in-point sits just past that cut, so no torso frame
 * survives into the rendition. Do not "recover" the extra seventeen seconds
 * without re-reading that checklist — they are cut on purpose, not for length.
 *
 * Full names, for provenance — the cards show first name + last initial:
 *
 *   gabriel  Gabriel Koffisoza (name supplied by Noah, not stated on camera;
 *            "Koffisoza" is the spelling already used across the Day-3 user
 *            research, e.g. `UserResearch/Day3-User-Research-Synthesis.md`)
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
  /**
   * Exactly as it appears on the card, which renders it uppercase.
   *
   * A literal string rather than first-name + last-initial: most are of that
   * shape ("Somin K.", "Jerson O.", "Gabriel K."), but Ken is a doctor and goes
   * by his full name and title, which no initial-assembling helper survives
   * contact with.
   */
  displayName: string;
  /** Never a payout or result claim. See the note above. */
  badge: string;
  /** Verbatim, from this person's own transcript. Two lines on the card. */
  quote: string;
  /**
   * Human-readable length, e.g. "0:29". Not rendered — it is spoken, in the
   * play button's aria-label ("Play: Somin K.'s review, 0:30"), so a screen
   * reader user knows what they are committing to before starting it.
   */
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
  };
}

export const TESTIMONIAL_VIDEOS: TestimonialVideo[] = [
  {
    id: 'voice-gabriel',
    ...urls('voice-gabriel-full'),
    displayName: 'Gabriel K.',
    badge: 'BETA TESTER',
    // Verbatim. The only editorial act is the em-dash, standing in for the
    // spoken pause before the last word; there is no punctuation in speech to
    // be faithful to.
    //
    // Chosen over his longer "I've tried everything before — notes, different
    // apps, different routines — but nothing actually kept me as consistent as
    // Libo did." Both are his; that one is better body copy than a headline,
    // and it is still in the video at 8.7s regardless. This one leads because
    // it is short enough to read at a glance on the first card, and names a
    // loss before a gain, which the longer line takes twenty words to reach.
    quote:
      'This app brought me back something I completely lost — discipline.',
    duration: '0:24',
    durationSeconds: 24,
    title: 'Gabriel K. on training with Libo',
  },
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
 * All of them as one `@graph` for `SeoHead`'s `jsonLd` prop, which takes a
 * single object. `buildFunnelVideoSchema` emits a lone VideoObject because
 * those pages carry exactly one film; the homepage carries the whole wall, and
 * a graph is how you say that in one script tag.
 */
export function buildTestimonialVideoGraph(videos: TestimonialVideo[] = TESTIMONIAL_VIDEOS) {
  return {
    '@context': 'https://schema.org',
    '@graph': videos.map(videoObject),
  };
}
