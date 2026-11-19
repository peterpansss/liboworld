// The Blueprint videos on YouTube (@liboworldapp). Each teaser on /blueprint
// is a short muted loop that links to the real post, so the views land on
// YouTube where they count (Noah, 19 Nov 2026).
//
// The posts go live on 3 Dec (organic launch; ads ~17 Dec). Every teaser shows
// from 19 Nov (Noah); until its URL is filled in it plays but isn't a link and
// reads "On YouTube 3 Dec". To switch the links on: paste the YouTube URLs below.

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

/** All teasers show (Noah, 19 Nov); `isLive` says whether one links out yet. */
export function visibleVideos(videos = BLUEPRINT_VIDEOS): BlueprintVideo[] {
  return videos;
}

export const isLive = (v: BlueprintVideo): v is BlueprintVideo & { url: string } => !!v.url;
