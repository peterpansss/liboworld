import { describe, it, expect } from 'vitest';
import { BLUEPRINT_VIDEOS, visibleVideos } from '../../src/components/blueprint/blueprintVideos';

describe('Blueprint teasers', () => {
  it('stay hidden until a YouTube link is filled in', () => {
    const none = BLUEPRINT_VIDEOS.map((v) => ({ ...v, url: null }));
    expect(visibleVideos('', none)).toHaveLength(0);
  });
  it('show only the videos that have a link', () => {
    const one = BLUEPRINT_VIDEOS.map((v, i) => ({ ...v, url: i === 1 ? 'https://youtu.be/x' : null }));
    expect(visibleVideos('', one).map((v) => v.key)).toEqual(['short1']);
  });
  it('show every teaser with ?teasers=preview', () => {
    const none = BLUEPRINT_VIDEOS.map((v) => ({ ...v, url: null }));
    expect(visibleVideos('?teasers=preview', none)).toHaveLength(5);
  });
});
