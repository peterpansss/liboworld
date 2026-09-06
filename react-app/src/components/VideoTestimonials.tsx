import { useEffect, useRef, useState } from 'react';

import { TESTIMONIAL_VIDEOS, type TestimonialVideo } from '../data/testimonialVideos';
import { trackVideoPlay } from '../lib/consent';
import './VideoTestimonials.css';

/**
 * The homepage video wall — filmed beta testers, one card each.
 *
 * Not built on `FunnelVideo` even though the idle→playing behaviour is the
 * same. That component is shaped around a single 16:9 hero film with a caption
 * and a duration pill; these are a row of 4:5 portrait cards that each carry a
 * person's name and their own pull-quote, and only one of them may play at a
 * time. Bolting all of that onto `FunnelVideo` would have left both callers
 * worse off, so the two share the pattern and not the code — the parts worth
 * keeping (video absent from the DOM until asked for, `<source media>` gating
 * the big rendition, `trackVideoPlay` on start) are reproduced deliberately
 * and noted below.
 */

function Card({
  video,
  playing,
  onPlay,
  playLabel,
}: {
  video: TestimonialVideo;
  playing: boolean;
  onPlay: () => void;
  playLabel: string;
}) {
  return (
    <figure className="vt-card" data-popin>
      {playing ? (
        /* Mounted only once asked for. `preload="none"` is not enough on its
           own — Safari has shipped builds that fetch the first bytes anyway —
           so the element simply does not exist until then. */
        <video
          className="vt-card__video"
          poster={video.poster}
          controls
          autoPlay
          playsInline
          preload="auto"
          aria-label={playLabel}
        >
          <source media="(min-width: 901px)" src={video.src1080} type="video/mp4" />
          <source src={video.src720} type="video/mp4" />
          {/* The funnel films burn their subtitles in and so carry no track.
              These have a clean picture, so the captions are a real text track:
              styleable, translatable, and readable by crawlers. */}
          <track kind="captions" srcLang="en" label="English" src={video.vtt} default />
        </video>
      ) : (
        <button type="button" className="vt-card__poster" onClick={onPlay} aria-label={playLabel}>
          <img className="vt-card__still" src={video.poster} alt="" loading="lazy" />
          <span className="vt-card__scrim" aria-hidden="true" />
          <span className="vt-card__play" aria-hidden="true">
            <span className="vt-card__triangle" />
          </span>
          <span className="vt-card__duration font-display" aria-hidden="true">
            {video.duration}
          </span>
        </button>
      )}

      {/* Outside the button so the quote stays selectable text, and so it
          survives the swap to the playing state — the name and quote belong to
          the card, not to the poster. */}
      {/* No "BETA TESTER" pill here, though the data carries one: the section
          eyebrow immediately above this row already reads "Beta program", and a
          third repetition per card only crowded the play control. `video.badge`
          is still read by the funnel quote cards, which have no such eyebrow. */}
      <figcaption className="vt-card__meta">
        <span className="vt-card__name font-display">{video.displayName}</span>
        <blockquote className="vt-card__quote">&ldquo;{video.quote}&rdquo;</blockquote>
      </figcaption>
    </figure>
  );
}

export default function VideoTestimonials({
  videos = TESTIMONIAL_VIDEOS,
  playLabelFor,
}: {
  videos?: TestimonialVideo[];
  /** e.g. (name, duration) => `Play: ${name}'s review, ${duration}`. */
  playLabelFor: (name: string, duration: string) => string;
}) {
  // Only one card plays at a time — three testimonials talking over each other
  // is the failure mode this guards against. `null` means all idle.
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Carousel scroll state, same shape as the blog row: listen on the scroll
  // container, recompute on resize, 2px slack at the extremes to forgive
  // sub-pixel scroll positions.
  const railRef = useRef<HTMLDivElement | null>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const update = () => {
      setCanScrollPrev(el.scrollLeft > 2);
      setCanScrollNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [videos.length]);

  const scrollByPage = (direction: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth, behavior: 'smooth' });
  };

  const start = (v: TestimonialVideo) => {
    setPlayingId(v.id);
    trackVideoPlay(v.id);
  };

  return (
    <div className="vt-wrap">
      <button
        type="button"
        className="vt-arrow vt-arrow--prev"
        onClick={() => scrollByPage(-1)}
        disabled={!canScrollPrev}
        aria-label="Previous reviews"
      >
        &larr;
      </button>

      <div className="vt-rail" ref={railRef}>
        {videos.map((v) => (
          <Card
            key={v.id}
            video={v}
            playing={playingId === v.id}
            onPlay={() => start(v)}
            playLabel={playLabelFor(v.displayName, v.duration)}
          />
        ))}
      </div>

      <button
        type="button"
        className="vt-arrow vt-arrow--next"
        onClick={() => scrollByPage(1)}
        disabled={!canScrollNext}
        aria-label="More reviews"
      >
        &rarr;
      </button>
    </div>
  );
}
