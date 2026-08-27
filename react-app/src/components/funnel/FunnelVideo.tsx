import { useState, type ReactNode } from 'react';

import type { FunnelVideo as FunnelVideoData } from '../../data/funnelVideos';
import { trackVideoPlay } from '../../lib/consent';
import './FunnelVideo.css';

type Props = {
  video: FunnelVideoData;
  /** Accessible label on the play button, e.g. "Play: the cash challenge, 2:24". */
  playLabel: string;
  /** Short line under the play button. Omit for a bare frame. */
  caption?: string;
  /** Name sent with the analytics event; also the schema title fallback. */
  analyticsName: string;
  /** Frame class from the host page — carries aspect ratio, radius, margins. */
  className?: string;
  /** Rendered over the poster only, e.g. JoinFunnel's "Inside the club". */
  overlay?: ReactNode;
};

/**
 * Click-to-play player for the two ~2½-minute funnel films.
 *
 * Deliberately NOT the autoplay-muted-loop pattern used everywhere else on the
 * site (`Landing.tsx`, `ExerciseDetail.tsx`) — those are 3-13s silent clips,
 * these are narrated films of ~50 MB. So:
 *
 * - nothing is fetched until the visitor asks. The <video> is not in the DOM at
 *   all while idle, which is stronger than preload="none" (Safari has shipped
 *   bugs where preload="none" still pulls the first bytes).
 * - the wide rendition is gated behind a `media` query so phones get the 720p.
 *   `media` is evaluated once, at mount — a viewer who resizes mid-video keeps
 *   whichever rendition they started with, which is fine here.
 * - subtitles are burned into the picture, so there is no <track>. That also
 *   means the films are English-only; callers say so in non-EN captions.
 */
export default function FunnelVideo({
  video,
  playLabel,
  caption,
  analyticsName,
  className = '',
  overlay,
}: Props) {
  const [playing, setPlaying] = useState(false);

  const start = () => {
    setPlaying(true);
    trackVideoPlay(analyticsName);
  };

  return (
    <div className={`fv ${className}`.trim()} data-popin>
      {playing ? (
        <video
          className="fv__video"
          poster={video.poster}
          controls
          autoPlay
          playsInline
          preload="auto"
          aria-label={playLabel}
        >
          <source media="(min-width: 901px)" src={video.src1080} type="video/mp4" />
          <source src={video.src720} type="video/mp4" />
        </video>
      ) : (
        <button type="button" className="fv__poster" onClick={start} aria-label={playLabel}>
          <img className="fv__still" src={video.poster} alt="" loading="lazy" />
          <span className="fv__scrim" aria-hidden="true" />
          <span className="fv__play" aria-hidden="true">
            <span className="fv__triangle" />
          </span>
          {caption && <span className="fv__caption font-display">{caption}</span>}
          <span className="fv__duration font-display" aria-hidden="true">
            {video.duration}
          </span>
          {overlay}
        </button>
      )}
    </div>
  );
}
