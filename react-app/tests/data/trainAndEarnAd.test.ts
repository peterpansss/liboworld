import { describe, expect, it } from 'vitest';
import { adForLanguage, adVideo } from '../../src/data/trainAndEarnAd';

describe('train and earn ad', () => {
  it('gives German the German cut without subtitles', () => {
    expect(adForLanguage('de')).toEqual({ lang: 'de', cues: null });
    expect(adForLanguage('de-AT').lang).toBe('de');
  });

  it('gives English (and unknown languages) the English cut without subtitles', () => {
    expect(adForLanguage('en')).toEqual({ lang: 'en', cues: null });
    expect(adForLanguage(undefined)).toEqual({ lang: 'en', cues: null });
  });

  it.each(['es', 'fr', 'pt'])('gives %s the English cut with 12 subtitles in order', (lng) => {
    const { lang, cues } = adForLanguage(lng);
    expect(lang).toBe('en');
    expect(cues).toHaveLength(12);
    cues!.forEach((c, i) => {
      expect(c.end).toBeGreaterThan(c.start);
      if (i) expect(c.start).toBeGreaterThanOrEqual(cues![i - 1].end);
    });
  });

  it('keeps amount and condition together in every cash line', () => {
    for (const lng of ['es', 'fr', 'pt']) {
      const cash = adForLanguage(lng).cues!.find((c) => c.text.includes('50 €'));
      expect(cash?.text).toMatch(/30/);
    }
  });

  it('serves 16:9 on wide screens and 9:16 on phones', () => {
    expect(adVideo('en', 'wide').src).toContain('train-and-earn-en-1080p.mp4');
    expect(adVideo('de', 'tall').src).toContain('train-and-earn-de-vertical.mp4');
    expect(adVideo('de', 'tall').poster).toBe('/ad-media/train-and-earn-de-9x16-poster.webp?v=1');
  });
});
