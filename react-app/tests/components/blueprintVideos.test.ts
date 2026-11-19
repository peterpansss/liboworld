import { describe, it, expect } from 'vitest';
import { BLUEPRINT_VIDEOS, isLive, visibleVideos } from '../../src/components/blueprint/blueprintVideos';

describe('Blueprint teasers', () => {
  it('all five show, linked or not (Noah, 19 Nov)', () => {
    const none = BLUEPRINT_VIDEOS.map((v) => ({ ...v, url: null }));
    expect(visibleVideos(none)).toHaveLength(5);
  });
  it('only a teaser with a URL is live (a link)', () => {
    const one = BLUEPRINT_VIDEOS.map((v, i) => ({ ...v, url: i === 1 ? 'https://youtu.be/x' : null }));
    expect(one.filter(isLive).map((v) => v.key)).toEqual(['short1']);
  });
});
