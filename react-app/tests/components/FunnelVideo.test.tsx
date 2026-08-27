/**
 * Tests for src/components/funnel/FunnelVideo.tsx.
 *
 * The behaviour worth pinning is the bandwidth contract. These films are ~50 MB
 * (1080p) and sit on the two paid conversion surfaces, so a regression that
 * mounts the <video> on render — or drops the 720p source and hands phones the
 * desktop file — costs real money and real bounce rate without breaking
 * anything visibly. Hence: no <video> in the DOM until the poster is clicked,
 * and both renditions present with the wide one gated behind a media query.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

void React;

const trackVideoPlay = vi.fn();
vi.mock('../../src/lib/consent', () => ({ trackVideoPlay }));

const FunnelVideo = (await import('../../src/components/funnel/FunnelVideo')).default;
const { CASH_CHALLENGE_VIDEO } = await import('../../src/data/funnelVideos');

const setup = () =>
  render(
    <FunnelVideo
      video={CASH_CHALLENGE_VIDEO}
      playLabel="Play: the cash challenge, 2 minutes 24 seconds"
      caption="The cash challenge — 2:24"
      analyticsName="cash_challenge"
      className="cf-video"
    />,
  );

beforeEach(() => { trackVideoPlay.mockClear(); });

describe('FunnelVideo', () => {
  it('renders the poster and no <video> until asked', () => {
    const { container } = setup();
    expect(container.querySelector('video')).toBeNull();
    const still = container.querySelector('img.fv__still') as HTMLImageElement;
    expect(still).not.toBeNull();
    expect(still.getAttribute('src')).toBe(CASH_CHALLENGE_VIDEO.poster);
    // Poster is lazy: it is below the fold on ChallengeFunnel.
    expect(still.getAttribute('loading')).toBe('lazy');
  });

  it('keeps the page frame class alongside its own', () => {
    const { container } = setup();
    const root = container.querySelector('.fv') as HTMLElement;
    expect(root.classList.contains('cf-video')).toBe(true);
    // usePopIn() scans for this attribute; without it the reveal never fires.
    expect(root.getAttribute('data-popin')).not.toBeNull();
  });

  it('mounts the player with both renditions on click', async () => {
    const user = userEvent.setup();
    const { container } = setup();

    await user.click(screen.getByRole('button', { name: /play: the cash challenge/i }));

    const video = container.querySelector('video') as HTMLVideoElement;
    expect(video).not.toBeNull();
    expect(video.hasAttribute('controls')).toBe(true);
    expect(video.hasAttribute('playsinline')).toBe(true);
    expect(video.getAttribute('poster')).toBe(CASH_CHALLENGE_VIDEO.poster);

    const sources = Array.from(container.querySelectorAll('source'));
    expect(sources).toHaveLength(2);
    // Wide first and media-gated, narrow second as the fallback — order matters,
    // the browser takes the first source whose media query matches.
    expect(sources[0].getAttribute('media')).toBe('(min-width: 901px)');
    expect(sources[0].getAttribute('src')).toBe(CASH_CHALLENGE_VIDEO.src1080);
    expect(sources[1].getAttribute('media')).toBeNull();
    expect(sources[1].getAttribute('src')).toBe(CASH_CHALLENGE_VIDEO.src720);
  });

  it('reports the play once, not on render', async () => {
    const user = userEvent.setup();
    setup();
    expect(trackVideoPlay).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /play: the cash challenge/i }));
    expect(trackVideoPlay).toHaveBeenCalledTimes(1);
    expect(trackVideoPlay).toHaveBeenCalledWith('cash_challenge');
  });

  it('serves both renditions from the CDN, never from the site bundle', () => {
    // *.mp4 is gitignored repo-wide, so a root-relative src would 404 in prod
    // while working perfectly in local dev. Pin the origin.
    for (const src of [CASH_CHALLENGE_VIDEO.src1080, CASH_CHALLENGE_VIDEO.src720]) {
      expect(src.startsWith('https://videos.liboworld.com/marketing/')).toBe(true);
      expect(src).toMatch(/\?v=\d+$/); // cache-bust, or Cloudflare pins a stale cut
    }
    // The poster is a JPG and DOES ship with the site.
    expect(CASH_CHALLENGE_VIDEO.poster.startsWith('/funnel-media/')).toBe(true);
  });
});
