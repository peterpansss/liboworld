import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { TEASER_BASE, visibleVideos, type BlueprintVideo } from './blueprintVideos';
import './BlueprintTeasers.css';

const FALLBACK = 'https://www.youtube.com/@liboworldapp';

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

export default function BlueprintTeasers() {
  const { t } = useTranslation();
  const { search } = useLocation();
  const d = (key: string, defaultValue: string) => t(`blueprintVideos.${key}`, { defaultValue });
  const videos = visibleVideos(search);
  if (videos.length === 0) return null;

  const long = videos.find((v) => v.key === 'long');
  const shorts = videos.filter((v) => v.key !== 'long');
  const href = (v: BlueprintVideo) => v.url ?? FALLBACK;

  return (
    <section className="bpt" aria-labelledby="bpt-h2">
      <h2 id="bpt-h2">{d('h2', 'Watch the story')}</h2>
      <p className="bpt-sub">{d('sub', 'Noah talks through the year on YouTube.')}</p>
      {long && (
        <a className="bpt-long" href={href(long)} target="_blank" rel="noopener">
          <Loop v={long} wide />
          <span className="bpt-long__label">
            <span className="bpt-long__title">{d('long', 'The full story')}</span>
            <span className="bpt-long__meta">{d('longMeta', '12 min · Watch on YouTube →')}</span>
          </span>
        </a>
      )}
      {shorts.length > 0 && (
        <ul className="bpt-shorts">
          {shorts.map((v) => (
            <li key={v.key}>
              {/* Each Short shows its own title on screen, so the link carries it
                  for screen readers instead of repeating it underneath. */}
              <a
                className="bpt-short"
                href={href(v)}
                target="_blank"
                rel="noopener"
                aria-label={`${d(v.key, v.key)}: ${d('shortMeta', 'Watch on YouTube →')}`}
              >
                <Loop v={v} />
                <span className="bpt-short__meta">{d('shortMeta', 'Watch on YouTube →')}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
