import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adForLanguage, adVideo, type AdFormat } from '../data/trainAndEarnAd';
import './HomeAd.css';

const TALL_QUERY = '(max-width: 768px)';

function useFormat(): AdFormat {
  const get = (): AdFormat =>
    typeof window !== 'undefined' && window.matchMedia?.(TALL_QUERY).matches ? 'tall' : 'wide';
  const [format, setFormat] = useState<AdFormat>(get);
  useEffect(() => {
    const mq = window.matchMedia?.(TALL_QUERY);
    if (!mq) return;
    const on = () => setFormat(mq.matches ? 'tall' : 'wide');
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return format;
}

/**
 * The TRAIN AND EARN ad, right under the hero (Noah, 19 Nov 2026).
 * 16:9 on desktop, 9:16 on phones; German cut for German, English for the
 * rest, with ES/FR/PT subtitles drawn here (not native <track>, which iOS does
 * not paint on a muted inline video). Nothing is fetched until the section is
 * near the viewport; it plays muted and loops while visible, and the sound
 * button restarts it from the top so the whole story is heard.
 */
export default function HomeAd() {
  const { t, i18n } = useTranslation();
  const format = useFormat();
  const { lang, cues } = adForLanguage(i18n.resolvedLanguage ?? i18n.language);
  const { src, poster } = adVideo(lang, format);
  const reduced = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [muted, setMuted] = useState(true);
  const [cue, setCue] = useState<string | null>(null);

  // Load only when the section comes close; play/pause with visibility.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setNear(true); return; }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNear(true);
        const v = videoRef.current;
        if (!v || reduced) return;
        if (entry.intersectionRatio >= 0.35) v.play().catch(() => {});
        else v.pause();
      },
      { rootMargin: '300px 0px', threshold: [0, 0.35] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced, src]);

  // Subtitles follow the playhead.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !cues) { setCue(null); return; }
    const onTime = () => {
      const now = v.currentTime;
      setCue(cues.find((c) => now >= c.start && now < c.end)?.text ?? null);
    };
    v.addEventListener('timeupdate', onTime);
    return () => v.removeEventListener('timeupdate', onTime);
  }, [cues, near, src]);

  const toggleSound = () => {
    const v = videoRef.current;
    if (!v) return;
    const next = !muted;
    v.muted = next;
    if (!next) { v.currentTime = 0; v.play().catch(() => {}); }
    setMuted(next);
  };

  return (
    <section className="rh-ad" aria-label={t('homeAd.label')}>
      <div ref={wrapRef} className={`rh-ad-frame rh-ad-frame--${format}`}>
        <video
          key={src}
          ref={videoRef}
          className="rh-ad-video"
          src={near ? src : undefined}
          poster={poster}
          muted={muted}
          loop
          playsInline
          preload={near ? 'auto' : 'none'}
          controls={reduced}
          disablePictureInPicture
        />
        {cue && <p className="rh-ad-cue">{cue}</p>}
        {!reduced && (
          <button type="button" className="rh-ad-sound" onClick={toggleSound} aria-pressed={!muted}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor" />
              {muted ? <path d="m22 9-6 6M16 9l6 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />}
            </svg>
            {muted ? t('homeAd.soundOn') : t('homeAd.soundOff')}
          </button>
        )}
      </div>
    </section>
  );
}
