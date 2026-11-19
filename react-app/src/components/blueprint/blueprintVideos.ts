// The Blueprint videos on YouTube (@liboworldapp). Each teaser on /blueprint
// is a short muted loop that links to the real post, so the views land on
// YouTube where they count (Noah, 19 Nov 2026).
//
// The posts go live on 3 Dec (organic launch; ads ~17 Dec). Until a URL is
// filled in, that teaser doesn't render, and with no URLs at all the whole
// section stays hidden. To switch on: paste the live YouTube links below.
// `?teasers=preview` shows the section with every teaser for review.

export interface BlueprintVideo {
  key: 'long' | 'short1' | 'short2' | 'short3' | 'short4';
  /** Live YouTube URL, or null while the post isn't published. */
  url: string | null;
  /** Muted loop + poster under /downloads/blueprint/teasers/ (versioned names). */
  file: string;
}

export const BLUEPRINT_VIDEOS: BlueprintVideo[] = [
  { key: 'long', url: null, file: 'long-v1' },
  { key: 'short1', url: null, file: 'short1-v1' },
  { key: 'short2', url: null, file: 'short2-v1' },
  { key: 'short3', url: null, file: 'short3-v1' },
  { key: 'short4', url: null, file: 'short4-v1' },
];

export const TEASER_BASE = '/downloads/blueprint/teasers/';

/** The videos to show: live ones, or all of them in preview mode. */
export function visibleVideos(search: string, videos = BLUEPRINT_VIDEOS): BlueprintVideo[] {
  const preview = new URLSearchParams(search).get('teasers') === 'preview';
  return preview ? videos : videos.filter((v) => !!v.url);
}
