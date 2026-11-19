import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TEASER_BASE, isLive, visibleVideos, type BlueprintVideo } from './blueprintVideos';
import './BlueprintTeasers.css';

function prefersReducedMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** A muted loop that only plays while on screen (and never under reduced motion). */
function Loop({ v, wide }: { v: BlueprintVideo; wide?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [still] = useState(prefersReducedMotion);
  useEffect(() => {
    const el = ref.current;
    if (!el || still || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) void el.play().catch(() => {});
      else el.pause();
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [still]);
  const poster = `${TEASER_BASE}${v.file}.jpg`;
  if (still) return <img className="bpt-media" src={poster} alt="" loading="lazy" width={wide ? 960 : 360} height={wide ? 540 : 640} />;
  return (
    <video
      ref={ref}
      className="bpt-media"
      src={`${TEASER_BASE}${v.file}.mp4`}
      poster={poster}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
    />
  );
}

// Live → a link to the post; not posted yet → the same tile, not clickable.
function Tile({ v, className, label, children }: { v: BlueprintVideo; className: string; label?: string; children: React.ReactNode }) {
  return isLive(v) ? (
    <a className={className} href={v.url} target="_blank" rel="noopener" aria-label={label}>{children}</a>
  ) : (
    <div className={`${className} bpt-soon`}>{children}</div>
  );
}

export default function BlueprintTeasers() {
  const { t } = useTranslation();
  const d = (key: string, defaultValue: string) => t(`blueprintVideos.${key}`, { defaultValue });
  const videos = visibleVideos();
  if (videos.length === 0) return null;

  const long = videos.find((v) => v.key === 'long');
  const shorts = videos.filter((v) => v.key !== 'long');
  const soon = d('soon', 'On YouTube 3 Dec');

  return (
    <section className="bpt" aria-labelledby="bpt-h2">
      <h2 id="bpt-h2">{d('h2', 'Watch the story')}</h2>
      <p className="bpt-sub">{d('sub', 'Noah talks through the year on YouTube.')}</p>
      {long && (
        <Tile v={long} className="bpt-long">
          <Loop v={long} wide />
          <span className="bpt-long__label">
            <span className="bpt-long__title">{d('long', 'The full story')}</span>
            <span className="bpt-long__meta">{isLive(long) ? d('longMeta', '12 min · Watch on YouTube →') : soon}</span>
          </span>
        </Tile>
      )}
      {shorts.length > 0 && (
        <ul className="bpt-shorts">
          {shorts.map((v) => (
            <li key={v.key}>
              {/* Each Short shows its own title on screen, so the link carries it
                  for screen readers instead of repeating it underneath. */}
              <Tile v={v} className="bpt-short" label={`${d(v.key, v.key)}: ${d('shortMeta', 'Watch on YouTube →')}`}>
                <Loop v={v} />
                <span className="bpt-short__meta">{isLive(v) ? d('shortMeta', 'Watch on YouTube →') : soon}</span>
              </Tile>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
