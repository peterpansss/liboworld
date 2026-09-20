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
 * (2160×3840 phone footage), `SOS-LIB.MOV` at the repo root for Gabriel, and
 * `WhatsApp Video 2026-09-14 at 00.12.47.mp4`, also at the repo root, for Ben.
 * Masters are never committed — `.gitignore` drops `*.mp4`/`*.MOV`, which is
 * why the two at the repo root are fine where they are.
 * Encoded by `scripts/encode-testimonial-video.sh`, uploaded by
 * `libo-landing/scripts/upload-marketing-video.mjs`.
 *
 * Crop and trim per person, so a re-cut reproduces exactly:
 *
 *   somin   crop 2160:2700:0:609      0.00 → 30.70   poster @12s
 *   jerson  crop 1600:2000:280:1000  45.80 → 74.85   poster @50s
 *   ken     crop 1900:2375:300:820   45.05 → 72.10   poster @60s
 *   gabriel crop 1080:1350:0:240      0.00 → 24.09   poster @12s
 *   ben     crop 478:598:0:0         14.70 → 35.85   poster @24.50s
 *   ben-progression
 *           crop 478:598:0:0         97.30 → 128.20  poster @120.20s
 *
 * Ben has TWO cuts on R2 and neither is in the array. `voice-ben-*` is the
 * first (busy father of two, 21.15s); `voice-ben-progression-*` is the second
 * (18 Sep 2026, 30.93s), made after the owner asked for the strong windows
 * back with the brand name cut out rather than stepped around. Same master,
 * same crop, different window — see the Ben block further down.
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
 *   ben     crop 240:240:100:15
 *   ben-progression
 *           crop 200:200:128:76
 *
 * Ben's second avatar is a 200px box, not 240. His head is smaller in frame at
 * 120.20s than at 24.50s, so a 240 box framed on his face would have carried
 * half the kitchen into a 32px circle. 200→256 upscales 1.28× against 240's
 * 1.07×, which on this master is the cheaper of the two prices.
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
 * **Ben is encoded and uploaded TWICE and in the array NEITHER time** — the
 * assets exist (`voice-ben-{1080p,720p}.mp4` and
 * `voice-ben-progression-{1080p,720p}.mp4` on R2, all four posters and avatars
 * in `public/funnel-media/`, transcripts at
 * `UserVoices/transcripts/voice-ben.vtt` and `voice-ben-progression.vtt`), the
 * entry does not. The gate is his consent, not the cut: see the note by the
 * commented entry below.
 *
 * **He calls the app "Ladder", ten times across the master** (5.60, 96.14,
 * 169.65, 235.37 as "latter", 273.26, 283.22, 303.31, 358.23, 399.40, 418.46),
 * and never says "Libo" once. Not a mishearing — the same word comes back from
 * isolated segments at both model sizes and does not move when the decoder is
 * primed with "Libo". The first pass treated every one of those as a wall and
 * shipped the longest brand-free stretch it could find. **The owner's
 * instruction on 18 Sep 2026 was to go back and cut the NAME out instead**, on
 * the grounds that he was plainly talking about Libo. That second pass is
 * `voice-ben-progression`, and what it found is worth not re-deriving:
 *
 *   - **The name comes off cleanly in exactly one place.** At 96.14 it sits in
 *     the run-up clause "so another good thing about Ladder", which drops
 *     WHOLE at the 96.897–97.588 pause, leaving "I really enjoy the structured
 *     progression that it has" as a grammatical cold open. No excision inside
 *     a sentence, no crossfade, no internal splice anywhere in the 30.9s.
 *   - **Everywhere else the name is load-bearing mid-sentence** — "and Ladder
 *     actually helps me monitor that", "so Ladder actually lets me specify",
 *     "after using Ladder for a couple of weeks now". Cutting the word leaves
 *     no subject; cutting the clause leaves no sentence. Those windows are
 *     unusable for the name alone, before anything else is checked.
 *   - **The best single line in the master is still unshippable, and the name
 *     is not why.** "Am I finding that I have a bit more consistency? Yeah,
 *     absolutely" (402.16→405.22) is the most on-brand sentence he says. It is
 *     followed immediately by "I know if I was to pay for a gym membership and
 *     a coach…" and then by a second "Ladder". Cut both and ~9s survives with
 *     two internal splices in it. It is a QUOTE, not a clip.
 *   - **Pillar G is not in this master at all.** Not with the name, not
 *     without it. He never mentions bodybuilding or physique; the nearest is
 *     171.95→188.96, "I don't really like going to the gym so much… people
 *     using their phone too much in the gym… having to wait for machines",
 *     which is gym LOGISTICS, runs 17.2s, and points a complaint at the people
 *     the launch avatar is made of (brief risk 8). Do not keep re-opening it.
 *     What the master actually argues is decision fatigue (Somin's), time
 *     efficiency and training at home (Tony's), and cost (banned outright).
 *
 * His master is also by far the worst of the five: `WhatsApp Video 2026-09-14
 * at 00.12.47.mp4` is **478×850**, WhatsApp-recompressed, where the others are
 * 1080- or 2160-wide. Consequences worth knowing before re-cutting:
 *
 *   - 478 is the FULL width, so the crop is full-width like Gabriel's and the
 *     numbers are again not comparable to Somin's or Ken's. y=0 is forced, not
 *     chosen: the framing drifts through the take and his head reaches y≈33 at
 *     the tightest moment (~18s), so any positive y offset crops his hat off.
 *   - 478×598 → 1080×1350 is a **2.26× upscale**. The `-1080p` rendition is
 *     1080×1350 in name only; there is no 1080p detail in it, and the 4.6MB
 *     (6.5MB for the longer second cut) is mostly spent re-encoding WhatsApp's
 *     artefacts. Do not read its size as quality, and do not "fix" it by
 *     cropping tighter — that upscales harder. If a real rendition is wanted,
 *     the fix is Ben's original file.
 *   - The avatar is 256px, matching `voice-gabriel-full-avatar.jpg` rather than
 *     the 160px of the first three.
 *
 * Both his in/outs come from silencedetect like the other long cuts:
 *
 *   - 14.70 sits inside the 14.304–14.779 pause between "so" and "my current
 *     situation"; 35.85 inside 35.615–36.087 after "growing", before "the real
 *     appeal for me was that" — the sentence that would have taken cut one
 *     into Somin's pillar.
 *   - 97.30 sits inside the 96.897–97.588 pause after "Ladder", before "I
 *     really enjoy"; 128.20 inside 128.001–128.383 after "workout", before
 *     "obviously, time efficiency is a big thing for me as well" — the
 *     sentence that would have taken cut two into Tony's pillar and, eleven
 *     seconds later, into the cost-of-a-trainer material.
 *
 * Cut two's poster is at 120.20 rather than mid-clip by accident: his framing
 * is handheld and drifts the whole take, and 120.20 is the one frame in the
 * window where his mouth is closed, his eyes are on the lens and the hat has
 * headroom. 102.2 and 117.5 are the next best and both clip the top of the hat.
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

/**
 * Poster cache-bust. The renditions carry `?v=` already; the posters did not,
 * so re-cutting Gabriel's still shipped to the origin and Cloudflare kept
 * serving the old bytes off the unchanged filename — twice. Bump this on any
 * poster change.
 */
const POSTER_V = '1789000000000';

function urls(base: string) {
  return {
    src1080: `${CDN}/${base}-1080p.mp4?v=${V}`,
    src720: `${CDN}/${base}-720p.mp4?v=${V}`,
    poster: `/funnel-media/${base}-poster.jpg?v=${POSTER_V}`,
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
      "I'm just lazy — I just want to have a simple plan… and I feel like this is just a perfect option for me.",
    duration: '0:30',
    durationSeconds: 30,
    title: 'Somin K. on training with Libo',
  },
  {
    id: 'voice-ken',
    ...urls('voice-ken'),
    displayName: 'Dr. Kenneth Sullivan-Bol',
    badge: 'BETA TESTER',
    quote:
      "It takes the thinking out, and it takes the concern that they're not doing the right thing for the right muscle group.",
    duration: '0:27',
    durationSeconds: 27,
    title: 'Dr. Kenneth Sullivan-Bol on training with Libo',
  },
  // TODO(ben) — fifth card, blocked on the cut, not on the layout. Footage
  // arrived 14 Sep 2026; the encode/upload agent owns the numbers. Everything
  // this array's consumers need already works at five: the wall (`.vt-rail`)
  // scrolls any count, and `.cf-quotes` on the funnel now centres an odd last
  // card instead of orphaning it (ChallengeFunnel.css, 18 Sep 2026).
  //
  // The renditions, posters and avatars for BOTH cuts are on R2 and in
  // `public/funnel-media/` and all four URLs return 200. What is missing is
  // his SITE consent (`USER-VOICES-BRIEF.md`, casting table) — nothing of his
  // goes on liboworld.com until that row is ticked, footage in hand or not.
  //
  // RECOMMENDED — cut two, "structured progression". Paste as-is:
  //
  // {
  //   id: 'voice-ben',
  //   ...urls('voice-ben-progression'),   // basename of what was uploaded
  //   displayName: 'Ben',
  //   badge: 'BETA TESTER',
  //   quote:
  //     'I can see it straight there on the app, so I kind of know where I was last week, the week before, and how I\'m progressing.',
  //   duration: '0:31',
  //   durationSeconds: 31,
  //   title: 'Ben on training with Libo',
  // },
  //
  // The quote is subtractive only — his words are "I can see it straight there
  // on the on the app so I kind of know where I was you know last week the week
  // before you know the weeks before that and then how I'm progressing over the
  // time that I you know can dedicate to doing a workout". Dropped: the
  // stutter, three "you know"s, "the weeks before that", "then", and the
  // trailing clause. Nothing added, nothing reordered. It is inside the shipped
  // window (clip 17.08–30.48), so a viewer who presses play hears the line.
  //
  // Shorter alternative from the same window, also inside the clip:
  //   'I really enjoy the structured progression… I can see it straight there
  //    on the app, so I kind of know where I was last week, the week before.'
  //
  // TO SHIP CUT ONE INSTEAD — "busy father of two", 21.15s — swap the spread to
  // `...urls('voice-ben')`, duration '0:21', durationSeconds 21, and take the
  // quote from `transcripts/voice-ben.vtt`. That cut is biography with no
  // product in it, which is why cut two is the recommendation.
  //
  // NOT AVAILABLE AS A CLIP, worth knowing before someone asks for it: his
  // strongest sentence is "Am I finding that I have a bit more consistency?
  // Yeah, absolutely" at master 402.16. It cannot be a card quote either — the
  // rule is the line comes out of the video, and it is in neither cut.
  //
  // Three things that are NOT free-choice here:
  //   - He is a professor. The card says "Ben" and nothing else — no surname,
  //     no institution. Same rule Ken got, and it is in USER-VOICES-BRIEF.md
  //     risk 9 because an academic credential on a testimonial reads as an
  //     expert endorsement.
  //   - His pillar is "not the gym guy". The quote must be what he wants for
  //     himself, never a swipe at people who lift — brief risk 8. A line that
  //     lands as contempt gets cut, not softened.
  //   - Nothing about what training does to a body, his or anyone's.
  //
  // Position in the array is the owner's call; appended last unless told
  // otherwise. The site rule is only that the wall must not OPEN on the older
  // half of the cast (brief, "Age spread"), and Gabriel already leads.
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
