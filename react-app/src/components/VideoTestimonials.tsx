import { useEffect, useRef, useState } from 'react';

import { TESTIMONIAL_VIDEOS, type TestimonialVideo } from '../data/testimonialVideos';
import { trackVideoPlay } from '../lib/consent';
import './VideoTestimonials.css';

/**
 * The homepage video wall — filmed beta testers, one card each.
 *
 * Not built on `FunnelVideo` even though the idle→playing behaviour rhymes.
 * That component is a single 16:9 hero film with native `controls`; these are a
 * row of 4:5 portrait cards that each keep a name and pull-quote legible over
 * the frame for the whole clip, and only one may play at a time. The parts
 * worth keeping (video absent from the DOM until asked for, `<source media>`
 * gating the big rendition, `trackVideoPlay` on start) are reproduced here
 * deliberately.
 *
 * No native `controls`, and no `<track>`. Both exist to be read, and both sit
 * exactly where the name and quote sit — the control bar covers the bottom of
 * the frame, and rendered cues land on top of the quote. So the card plays
 * chromeless: the frame is one big play/pause target, and the only affordance
 * during playback is a hairline progress bar pinned to the bottom edge.
 */

function Card({
  video,
  isActive,
  onActivate,
  playLabel,
  pauseLabel,
}: {
  video: TestimonialVideo;
  /** True when this is the card the row has handed playback to. */
  isActive: boolean;
  onActivate: () => void;
  playLabel: string;
  pauseLabel: string;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  // One-way: once the visitor asks for this clip the element stays in the DOM,
  // so pausing and resuming never re-requests the file.
  const [mounted, setMounted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  // Another card took playback — stop this one rather than talk over it.
  useEffect(() => {
    if (!isActive) ref.current?.pause();
  }, [isActive]);

  const toggle = () => {
    if (!mounted) {
      setMounted(true);
      onActivate();
      trackVideoPlay(video.id);
      return;
    }
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      onActivate();
      void el.play();
    } else {
      el.pause();
    }
  };

  return (
    <figure className="vt-card" data-popin>
      {mounted ? (
        <video
          ref={ref}
          className="vt-card__video"
          poster={video.poster}
          autoPlay
          playsInline
          preload="auto"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setProgress(0);
            if (ref.current) ref.current.currentTime = 0;
          }}
          onTimeUpdate={(e) => {
            const el = e.currentTarget;
            if (el.duration) setProgress(el.currentTime / el.duration);
          }}
        >
          <source media="(min-width: 901px)" src={video.src1080} type="video/mp4" />
          <source src={video.src720} type="video/mp4" />
        </video>
      ) : (
        <img className="vt-card__still" src={video.poster} alt="" loading="lazy" />
      )}

      {/* The whole frame is the control. Above the picture, below the caption —
          so the name and quote stay readable and are never the click target. */}
      <button
        type="button"
        className="vt-card__hit"
        onClick={toggle}
        aria-label={playing ? pauseLabel : playLabel}
      >
        <span className="vt-card__scrim" aria-hidden="true" />
        <span
          className={`vt-card__play${playing ? ' vt-card__play--hidden' : ''}`}
          aria-hidden="true"
        >
          <span className="vt-card__triangle" />
        </span>
        {!mounted && (
          <span className="vt-card__duration font-display" aria-hidden="true">
            {video.duration}
          </span>
        )}
      </button>

      {/* Stays up for the whole clip. This is the thing the card exists to say,
          and Ladder's reference keeps it visible while the video runs. */}
      <figcaption className="vt-card__meta">
        <span className="vt-card__name font-display">{video.displayName}</span>
        <blockquote className="vt-card__quote">&ldquo;{video.quote}&rdquo;</blockquote>
      </figcaption>

      {mounted && (
        <span className="vt-card__progress" aria-hidden="true">
          <span className="vt-card__progress-fill" style={{ transform: `scaleX(${progress})` }} />
        </span>
      )}
    </figure>
  );
}

export default function VideoTestimonials({
  videos = TESTIMONIAL_VIDEOS,
  playLabelFor,
  pauseLabelFor,
}: {
  videos?: TestimonialVideo[];
  playLabelFor: (name: string, duration: string) => string;
  pauseLabelFor: (name: string) => string;
}) {
  // Only one card plays at a time — three testimonials talking over each other
  // is the failure mode this guards against.
  const [activeId, setActiveId] = useState<string | null>(null);

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
            isActive={activeId === v.id}
            onActivate={() => setActiveId(v.id)}
            playLabel={playLabelFor(v.displayName, v.duration)}
            pauseLabel={pauseLabelFor(v.displayName)}
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
