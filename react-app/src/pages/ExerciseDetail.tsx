import { useEffect, useRef, useState, useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getExercises, loadExerciseContent, type Exercise, type ExerciseContent } from '../data/exercises';
import {
  exerciseThumb,
  publicVideoUrl,
  publicVideoUrlAlt,
  publicVideoUrlAltBase,
  type VoicePreference,
  type SupportedLang,
} from '../utils/thumbnails';
import { Target, Dumbbell, Zap, Volume2, VolumeX, Maximize2, Minimize2, ICON_STROKE } from '../utils/icons';
import { MuscleTile } from '../components/MuscleTile';
import { SeoHead } from '../components/SeoHead';
import { AnatomyDiagram } from '../components/AnatomyDiagram';
import { AlternativesGrid } from '../components/AlternativesGrid';
import { MuscleGroupStrip } from '../components/MuscleGroupStrip';
import { RelatedArticles } from '../components/RelatedArticles';
import {
  getInstructions,
  getTips,
  getCommonMistakes,
  getPrimaryMuscleGroup,
} from '../utils/exerciseInfo';
import { buildExerciseGraph, exerciseCanonicalUrl } from '../utils/schema';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import './ExerciseDetail.css';

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const MUSCLE_I18N_KEYS: Record<string, string> = {
  All: 'all', Chest: 'chest', Back: 'back', Shoulders: 'shoulders',
  Biceps: 'biceps', Triceps: 'triceps', Core: 'core', Legs: 'legs',
  Glutes: 'glutes', Cardio: 'cardio', 'Full Body': 'fullBody',
  Forearms: 'forearms', Traps: 'traps',
};

const EQUIPMENT_I18N_KEYS: Record<string, string> = {
  All: 'all', Bodyweight: 'bodyweight', Barbell: 'barbell',
  Dumbbell: 'dumbbell', Cable: 'cable', Machine: 'machine',
  Kettlebell: 'kettlebell', 'Resistance Bands': 'resistanceBands',
  Bar: 'bar', 'Swiss Ball': 'swissBall',
};

export default function ExerciseDetail() {
  const { t, i18n } = useTranslation();
  const muscleLabel = (m: string) => {
    const key = MUSCLE_I18N_KEYS[m];
    return key ? t(`exerciseLibrary.muscles.${key}`) : m;
  };
  const equipmentLabel = (e: string) => {
    const key = EQUIPMENT_I18N_KEYS[e];
    return key ? t(`exerciseLibrary.equipment.${key}`) : e;
  };
  const difficultyLabel = (d: string) =>
    t(`exerciseDetail.difficultyLevels.${d}`, { defaultValue: capitalize(d) });

  const { slug } = useParams<{ slug: string }>();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiContent, setAiContent] = useState<Record<string, ExerciseContent>>({});
  const videoRef = useRef<HTMLVideoElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  // Tracks whether we've already swapped a missing localized variant for the
  // English fallback on the current (exercise, voice, lang) tuple. Reset by
  // the effect below whenever any of those change, so each new selection
  // gets a fresh chance to load the localized clip.
  // Tracks which fallback step has been attempted on the current source.
  // 0 = primary (lang+voice), 1 = en+voice, 2 = en+onyx (always exists).
  const fallbackStepRef = useRef(0);
  // Default unmuted so the voiceover coaching is the first thing users
  // hear — many users specifically come for the VO. Browsers block unmuted
  // autoplay without a user gesture; the [mainSrc] effect below falls back
  // to muted in that case so the video still plays and the prominent volume
  // button advertises that audio is available.
  const [muted, setMuted] = useState(false);
  const [showingAlt, setShowingAlt] = useState(false);
  // Voice coach: persisted in localStorage so the choice survives reloads.
  const [voice, setVoice] = useState<VoicePreference>(() => {
    if (typeof window === 'undefined') return 'male';
    return (window.localStorage.getItem('libo-voice-pref') as VoicePreference) === 'female'
      ? 'female'
      : 'male';
  });
  const toggleVoice = () => {
    const next: VoicePreference = voice === 'male' ? 'female' : 'male';
    setVoice(next);
    try {
      window.localStorage.setItem('libo-voice-pref', next);
    } catch {
      /* private mode */
    }
    // Video src reload is handled by the useEffect on [mainSrc]/[pipSrc] —
    // calling .load() here too races against React's reconcile and causes
    // a visible flicker.
  };

  // Sticky once the user explicitly clicks the volume button. The
  // [mainSrc] effect's catch handler uses this to skip the "fall back
  // to muted" rescue on subsequent src changes (e.g. angle swap), so
  // the user's unmute preference survives the swap instead of getting
  // clobbered every time Chrome decides the play() call after a
  // setState looks like autoplay.
  const userExpressedMutePrefRef = useRef(false);

  // Cleanup for any pending one-shot "unmute on next gesture" listeners. Set
  // when the muted-fallback fires below; cleared whenever it runs, the user
  // toggles mute manually, src changes, or the component unmounts.
  const unmuteOnNextGestureRef = useRef<(() => void) | null>(null);

  const toggleMuted = () => {
    const v = videoRef.current;
    if (!v) return;
    const next = !muted;
    v.muted = next;
    userExpressedMutePrefRef.current = true;
    // Manual interaction supersedes any pending auto-unmute.
    unmuteOnNextGestureRef.current?.();
    if (!next) {
      v.currentTime = 0;
      v.play().catch(() => {});
    }
    setMuted(next);
  };

  const swapView = () => {
    // Same: src reload handled by [mainSrc]/[pipSrc] effects below.
    setShowingAlt((prev) => !prev);
  };

  // iOS Safari uses webkitEnterFullscreen on the <video> element directly;
  // standards-mode browsers use Element.requestFullscreen on the wrapper so
  // our overlay controls (mute, voice, side-view) remain visible in fullscreen.
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    type FsDoc = Document & { webkitFullscreenElement?: Element | null };
    const sync = () => {
      const d = document as FsDoc;
      setIsFullscreen(Boolean(d.fullscreenElement || d.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  const toggleFullscreen = () => {
    const v = videoRef.current;
    if (!v) return;
    type FsDoc = Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void> | void;
    };
    type FsVideo = HTMLVideoElement & {
      webkitEnterFullscreen?: () => void;
      webkitRequestFullscreen?: () => Promise<void> | void;
    };
    type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
    const d = document as FsDoc;
    const fv = v as FsVideo;
    const wrapper = v.parentElement;
    const fw = wrapper as FsEl | null;

    // Exit if already fullscreen
    if (d.fullscreenElement || d.webkitFullscreenElement) {
      if (typeof document.exitFullscreen === 'function') {
        document.exitFullscreen().catch(() => {});
      } else if (typeof d.webkitExitFullscreen === 'function') {
        d.webkitExitFullscreen();
      }
      return;
    }

    if (fw && typeof fw.requestFullscreen === 'function') {
      fw.requestFullscreen().catch(() => {});
    } else if (fw && typeof fw.webkitRequestFullscreen === 'function') {
      fw.webkitRequestFullscreen();
    } else if (typeof fv.webkitEnterFullscreen === 'function') {
      // iOS Safari — only the <video> element itself can go fullscreen, and
      // the native player chrome (with its own fullscreen exit) takes over.
      fv.webkitEnterFullscreen();
    } else if (typeof fv.requestFullscreen === 'function') {
      fv.requestFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    Promise.all([getExercises(i18n.language), loadExerciseContent()]).then(
      ([data, content]) => {
        setExercises(data);
        setAiContent(content);
        setLoading(false);
      },
    );
  }, [i18n.language]);

  const exercise = useMemo(
    () => exercises.find((e) => e.slug === slug || e.id === slug) || null,
    [exercises, slug],
  );

  // Backward-compat: if the URL still uses the legacy id (or any non-slug
  // identifier) and the exercise carries a distinct slug, canonicalize the URL.
  const needsSlugRedirect = Boolean(
    exercise && exercise.slug && exercise.slug !== slug,
  );

  const instructions = useMemo(
    () => (exercise ? getInstructions(exercise, t) : []),
    [exercise, t],
  );

  // Prefer AI-authored content from the sidecar; fall back to heuristics.
  const aiEntry = exercise ? aiContent[exercise.id] : undefined;
  const tips = useMemo(() => {
    if (!exercise) return [];
    if (aiEntry?.tips?.length) return aiEntry.tips;
    return getTips(exercise, t);
  }, [exercise, aiEntry, t]);
  const mistakes = useMemo(() => {
    if (!exercise) return [];
    if (aiEntry?.commonMistakes?.length) return aiEntry.commonMistakes;
    return getCommonMistakes(exercise, t);
  }, [exercise, aiEntry, t]);
  const breathingCue = aiEntry?.breathingCue ?? null;

  const primaryMuscle = useMemo(
    () => (exercise ? getPrimaryMuscleGroup(exercise.bodyFocus) : ''),
    [exercise],
  );

  // Resolve the active language (truncated to its primary subtag, e.g.
  // 'en-US' → 'en'). Falls back to English for any locale without a voiced
  // variant in the pipeline.
  const supportedLangs: ReadonlyArray<SupportedLang> = ['en', 'de', 'es', 'fr', 'pt'];
  const langCode = (i18n.language || 'en').split('-')[0];
  const lang: SupportedLang = (supportedLangs as readonly string[]).includes(langCode)
    ? (langCode as SupportedLang)
    : 'en';

  // If the page is a parent canonical that has no own video, fall back to
  // a child (typically the L side) for both video playback and thumbnail.
  // Mirrors the same pattern used on the library card grid so the user
  // sees a real frame and a working <video> instead of a placeholder.
  const videoSource = useMemo(() => {
    if (!exercise) return null;
    if (exercise.videoUrl) return exercise;
    const child = exercises.find(e => e.parentId === exercise.id && e.videoUrl);
    return child ?? exercise;
  }, [exercise, exercises]);

  // Resolve video sources at top level so [mainSrc]/[pipSrc] effects can
  // imperatively .load() the same <video> element when voice toggles or the
  // user swaps angles — no React `key` change → no remount → no flicker.
  const primarySrc = videoSource ? publicVideoUrl(videoSource, voice, lang) : undefined;
  const altSrc = videoSource ? publicVideoUrlAlt(videoSource, voice, lang) : undefined;
  const mainSrc = showingAlt && altSrc ? altSrc : primarySrc;
  const pipSrc = showingAlt && altSrc ? primarySrc : altSrc;

  // Reset the fallback-step counter whenever the (exercise, voice, lang)
  // tuple changes, so each new selection re-attempts the localized variant
  // first.
  useEffect(() => {
    fallbackStepRef.current = 0;
  }, [exercise?.id, voice, lang]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !mainSrc) return;
    v.load();
    v.play().catch(() => {
      // Autoplay was blocked — almost always because the user landed on
      // the page without a prior gesture and we asked for unmuted audio.
      // Fall back to muted so the video still plays; the volume button
      // overlay tells users VO is one click away.
      //
      // Skip the fallback once the user has explicitly clicked the volume
      // button. On angle swap the play() call runs in a useEffect after
      // setState, which Chrome sometimes classifies as autoplay even
      // though there was a fresh user gesture — re-muting then silently
      // clobbers the unmute preference and the side view plays silent.
      // Better to leave the element unmuted: if play() really did fail
      // we'll show a stalled poster, which is rare and self-recovers as
      // soon as the user clicks anywhere on the player.
      if (!v.muted && !userExpressedMutePrefRef.current) {
        v.muted = true;
        setMuted(true);
        v.play().catch(() => {});
        // Auto-unmute on the user's first interaction anywhere on the
        // page. Replaces any previously pending one-shot so a src change
        // (angle swap, voice/lang) doesn't accumulate listeners.
        unmuteOnNextGestureRef.current?.();
        const handler = () => {
          cleanup();
          if (userExpressedMutePrefRef.current) return;
          const vv = videoRef.current;
          if (!vv) return;
          vv.muted = false;
          setMuted(false);
          vv.play().catch(() => {});
        };
        const cleanup = () => {
          document.removeEventListener('pointerdown', handler, true);
          document.removeEventListener('keydown', handler, true);
          document.removeEventListener('touchstart', handler, true);
          if (unmuteOnNextGestureRef.current === cleanup) {
            unmuteOnNextGestureRef.current = null;
          }
        };
        document.addEventListener('pointerdown', handler, { capture: true, passive: true });
        document.addEventListener('keydown', handler, { capture: true });
        document.addEventListener('touchstart', handler, { capture: true, passive: true });
        unmuteOnNextGestureRef.current = cleanup;
      }
    });
  }, [mainSrc]);

  // Tear down any pending one-shot gesture listener on unmount.
  useEffect(() => {
    return () => {
      unmuteOnNextGestureRef.current?.();
    };
  }, []);

  useEffect(() => {
    const p = pipVideoRef.current;
    if (!p || !pipSrc) return;
    p.load();
    p.play().catch(() => {});
  }, [pipSrc]);

  const seoMeta = useMemo(() => {
    if (!exercise) return null;
    const desc = (exercise.setupNotes || '').replace(/\s+/g, ' ').trim();
    const description = desc
      ? desc.length > 158
        ? desc.slice(0, 155) + '…'
        : desc
      : `Learn how to perform ${exercise.name} — a ${exercise.diff} ${exercise.bodyFocus.toLowerCase()} exercise using ${exercise.equipment.toLowerCase()}.`;
    const thumb = exerciseThumb(exercise) ?? exerciseThumb(videoSource);
    return {
      title: `${exercise.name} — How to Perform | Libo`,
      description,
      canonical: exerciseCanonicalUrl(exercise),
      ogImage: thumb ? (thumb.startsWith('http') ? thumb : `https://liboworld.com${thumb}`) : undefined,
      jsonLd: buildExerciseGraph(exercise, primaryMuscle),
    };
  }, [exercise, primaryMuscle, videoSource]);

  if (loading) {
    return (
      <>
        <SiteNav />
        <main className="ed-loading">{t('exerciseDetail.loading')}</main>
        <SiteFooter />
      </>
    );
  }

  if (needsSlugRedirect && exercise) {
    return <Navigate to={`/exercises/${exercise.slug}`} replace />;
  }

  if (!exercise) {
    return (
      <>
        <SiteNav />
        <main className="ed-page">
          <div className="ed-container">
            <div className="ed-not-found">
              <h2 className="font-display">{t('exerciseDetail.notFoundTitle')}</h2>
              <p>{t('exerciseDetail.notFoundDescription')}</p>
              <Link to="/exercises">{t('exerciseDetail.browseAll')}</Link>
            </div>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      {seoMeta && (
        <SeoHead
          title={seoMeta.title}
          description={seoMeta.description}
          canonical={seoMeta.canonical}
          ogImage={seoMeta.ogImage}
          ogType="article"
          jsonLd={seoMeta.jsonLd}
        />
      )}
      <SiteNav />

      <main className="ed-page">
        <div className="ed-container">
          {/* Breadcrumb */}
          <nav aria-label={t('exerciseDetail.breadcrumbLabel')} className="ed-breadcrumb">
            <Link to="/">{t('exerciseDetail.breadcrumbHome')}</Link>
            <span className="ed-breadcrumb-sep">&gt;</span>
            <Link to="/exercises">{t('exerciseDetail.breadcrumbExercises')}</Link>
            <span className="ed-breadcrumb-sep">&gt;</span>
            <Link to={`/exercises?muscle=${encodeURIComponent(primaryMuscle)}`}>
              {muscleLabel(primaryMuscle)}
            </Link>
            <span className="ed-breadcrumb-sep">&gt;</span>
            <span>{exercise.name}</span>
          </nav>

          {/* Hero: H1 + chips */}
          <div className="ed-hero">
            <h1 className="font-display">{exercise.name}</h1>
            <div className="ed-chips">
              <span className="ed-chip">{muscleLabel(exercise.bodyFocus)}</span>
              <span className="ed-chip">{equipmentLabel(exercise.equipment)}</span>
              <span className={`ed-chip ed-chip--${exercise.diff}`}>
                {difficultyLabel(exercise.diff)}
              </span>
            </div>
          </div>

          {/* Video player (full width) */}
          <div className="ed-demo">
              {mainSrc ? (
                <>
                  <video
                    ref={videoRef}
                    src={mainSrc}
                    poster={(exerciseThumb(exercise) ?? exerciseThumb(videoSource)) ?? undefined}
                    muted={muted}
                    loop
                    playsInline
                    autoPlay
                    preload="metadata"
                    onError={() => {
                      // Fallback chain: localized (lang+voice) → en+voice →
                      // en+onyx. The plain English clip is guaranteed to
                      // exist for any recorded exercise, including the 6
                      // slugs in voiceover_excluded.json that have no
                      // voiceover variants at all.
                      //
                      // When showingAlt is true the same chain applies to
                      // the alt clip, falling back to the bare side-view URL
                      // (no suffix) which is the canonical we always upload.
                      if (!exercise || !videoRef.current) return;
                      if (showingAlt) {
                        const base = publicVideoUrlAltBase(exercise);
                        if (base && videoRef.current.src !== base) {
                          videoRef.current.src = base;
                          videoRef.current.load();
                        }
                        return;
                      }
                      let nextUrl: string | undefined;
                      while (fallbackStepRef.current < 2 && !nextUrl) {
                        fallbackStepRef.current += 1;
                        if (fallbackStepRef.current === 1 && lang !== 'en') {
                          nextUrl = publicVideoUrl(exercise, voice, 'en');
                        } else if (fallbackStepRef.current === 2 && voice !== 'male') {
                          nextUrl = publicVideoUrl(exercise, 'male', 'en');
                        }
                        if (nextUrl === videoRef.current.src) nextUrl = undefined;
                      }
                      if (nextUrl) {
                        videoRef.current.src = nextUrl;
                        videoRef.current.load();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="ed-demo-mute"
                    onClick={toggleMuted}
                    aria-label={
                      muted
                        ? t('exerciseDetail.unmute', { defaultValue: 'Unmute' })
                        : t('exerciseDetail.mute', { defaultValue: 'Mute' })
                    }
                  >
                    {muted ? (
                      <VolumeX strokeWidth={ICON_STROKE} />
                    ) : (
                      <Volume2 strokeWidth={ICON_STROKE} />
                    )}
                  </button>
                  <button
                    type="button"
                    className="ed-demo-fullscreen"
                    onClick={toggleFullscreen}
                    aria-label={
                      isFullscreen
                        ? t('exerciseDetail.exitFullscreen', { defaultValue: 'Exit fullscreen' })
                        : t('exerciseDetail.fullscreen', { defaultValue: 'Enter fullscreen' })
                    }
                  >
                    {isFullscreen ? (
                      <Minimize2 strokeWidth={ICON_STROKE} />
                    ) : (
                      <Maximize2 strokeWidth={ICON_STROKE} />
                    )}
                  </button>
                  <button
                    type="button"
                    className="ed-demo-voice"
                    onClick={toggleVoice}
                    aria-label={t('exerciseDetail.toggleVoice', {
                      defaultValue:
                        voice === 'male' ? 'Switch to female voice' : 'Switch to male voice',
                    })}
                    title={
                      voice === 'male'
                        ? t('exerciseDetail.voiceMaleHint')
                        : t('exerciseDetail.voiceFemaleHint')
                    }
                  >
                    <span aria-hidden>{voice === 'male' ? '♂' : '♀'}</span>
                  </button>
                  {pipSrc && (
                    <button
                      type="button"
                      className="ed-demo-pip"
                      onClick={swapView}
                      aria-label={t('exerciseDetail.switchView', {
                        defaultValue: 'Switch camera angle',
                      })}
                    >
                      <video
                        ref={pipVideoRef}
                        src={pipSrc}
                        muted
                        loop
                        playsInline
                        autoPlay
                        preload="metadata"
                        onError={() => {
                          // Per-(lang, voice) side-view variants may be
                          // missing for some exercises (TTS mp3 wasn't
                          // produced for that locale yet). Fall back to the
                          // bare alt URL — guaranteed to exist on R2.
                          if (!exercise || !pipVideoRef.current) return;
                          if (showingAlt) return; // PiP shows primary in this case; primary's own chain handles it
                          const base = publicVideoUrlAltBase(exercise);
                          if (base && pipVideoRef.current.src !== base) {
                            pipVideoRef.current.src = base;
                            pipVideoRef.current.load();
                            pipVideoRef.current.play().catch(() => {});
                          }
                        }}
                      />
                      <span className="ed-demo-pip-label">
                        {showingAlt
                          ? t('exerciseDetail.viewFront', { defaultValue: 'FRONT' })
                          : t('exerciseDetail.viewSide', { defaultValue: 'SIDE' })}
                      </span>
                    </button>
                  )}
                </>
              ) : (
                <MuscleTile muscle={exercise.bodyFocus} size="lg" />
              )}
            </div>

          {/* Info cards */}
          <div className="ed-info-row">
            <div className="ed-info-card">
              <Target className="ed-info-icon" strokeWidth={ICON_STROKE} aria-hidden />
              <span className="ed-info-label">{t('exerciseDetail.muscleGroup')}</span>
              <span className="ed-info-value">{muscleLabel(exercise.bodyFocus)}</span>
            </div>
            <div className="ed-info-card">
              <Dumbbell className="ed-info-icon" strokeWidth={ICON_STROKE} aria-hidden />
              <span className="ed-info-label">{t('exerciseDetail.equipment')}</span>
              <span className="ed-info-value">{equipmentLabel(exercise.equipment)}</span>
            </div>
            <div className="ed-info-card">
              <Zap className="ed-info-icon" strokeWidth={ICON_STROKE} aria-hidden />
              <span className="ed-info-label">{t('exerciseDetail.difficulty')}</span>
              <span className={`ed-info-value ed-diff-tag ${exercise.diff}`}>
                {difficultyLabel(exercise.diff)}
              </span>
            </div>
          </div>

          {/* Target muscle anatomy (front + back) */}
          <AnatomyDiagram bodyFocus={exercise.bodyFocus} className="ed-anatomy" />

          {/* Main + Sidebar layout */}
          <div className="ed-layout">
            <div>
              {instructions.length > 0 && (
                <div className="ed-block">
                  <h2 className="ed-section-title">{t('exerciseDetail.instructions')}</h2>
                  <ol className="ed-steps">
                    {instructions.map((step, i) => (
                      <li key={i} className="ed-step">
                        <span className="ed-step-num">{i + 1}</span>
                        <span className="ed-step-text">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {tips.length > 0 && (
                <div className="ed-block">
                  <h2 className="ed-section-title">{t('exerciseDetail.tips')}</h2>
                  <ul className="ed-bullets">
                    {tips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {breathingCue && (
                <div className="ed-block">
                  <h2 className="ed-section-title">{t('exerciseDetail.breathing')}</h2>
                  <p className="ed-step-text" style={{ paddingTop: 0 }}>{breathingCue}</p>
                </div>
              )}

              {mistakes.length > 0 && (
                <div className="ed-block">
                  <h2 className="ed-section-title">{t('exerciseDetail.commonMistakes')}</h2>
                  <ul className="ed-bullets ed-bullets--warn">
                    {mistakes.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="ed-sidebar">
              <div className="ed-facts">
                <div className="ed-facts-title">{t('exerciseDetail.quickFacts')}</div>
                <div className="ed-fact">
                  <span className="ed-fact-label">{t('exerciseDetail.equipment')}</span>
                  <span className="ed-fact-value">{equipmentLabel(exercise.equipment)}</span>
                </div>
                <div className="ed-fact">
                  <span className="ed-fact-label">{t('exerciseDetail.machineRequired')}</span>
                  <span className="ed-fact-value">
                    {exercise.machineRequired ? t('exerciseDetail.yes') : t('exerciseDetail.no')}
                  </span>
                </div>
                <div className="ed-fact">
                  <span className="ed-fact-label">{t('exerciseDetail.category')}</span>
                  <span className="ed-fact-value">{capitalize(exercise.cat)}</span>
                </div>
                {exercise.variation && (
                  <div className="ed-fact">
                    <span className="ed-fact-label">{t('exerciseDetail.variation')}</span>
                    <span className="ed-fact-value">{exercise.variation}</span>
                  </div>
                )}
                <div className="ed-fact">
                  <span className="ed-fact-label">{t('exerciseDetail.difficulty')}</span>
                  <span className={`ed-fact-value ed-diff-tag ${exercise.diff}`}>
                    {difficultyLabel(exercise.diff)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <AlternativesGrid
            current={exercise}
            allExercises={exercises}
            limit={4}
            equipmentLabel={equipmentLabel}
            difficultyLabel={difficultyLabel}
          />

          <MuscleGroupStrip activeMuscle={primaryMuscle} />

          <RelatedArticles muscleGroup={primaryMuscle} exerciseId={exercise.id} />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
