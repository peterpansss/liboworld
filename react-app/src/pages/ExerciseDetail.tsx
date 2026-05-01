import { useEffect, useRef, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getExercises, loadExerciseContent, type Exercise, type ExerciseContent } from '../data/exercises';
import {
  exerciseThumb,
  publicVideoUrl,
  publicVideoUrlAlt,
  type VoicePreference,
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

  const { id } = useParams<{ id: string }>();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiContent, setAiContent] = useState<Record<string, ExerciseContent>>({});
  const videoRef = useRef<HTMLVideoElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
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

  const toggleMuted = () => {
    const v = videoRef.current;
    if (!v) return;
    const next = !muted;
    v.muted = next;
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
    () => exercises.find((e) => e.id === id) || null,
    [exercises, id],
  );

  const instructions = useMemo(
    () => (exercise ? getInstructions(exercise) : []),
    [exercise],
  );

  // Prefer AI-authored content from the sidecar; fall back to heuristics.
  const aiEntry = exercise ? aiContent[exercise.id] : undefined;
  const tips = useMemo(() => {
    if (!exercise) return [];
    if (aiEntry?.tips?.length) return aiEntry.tips;
    return getTips(exercise);
  }, [exercise, aiEntry]);
  const mistakes = useMemo(() => {
    if (!exercise) return [];
    if (aiEntry?.commonMistakes?.length) return aiEntry.commonMistakes;
    return getCommonMistakes(exercise);
  }, [exercise, aiEntry]);
  const breathingCue = aiEntry?.breathingCue ?? null;

  const primaryMuscle = useMemo(
    () => (exercise ? getPrimaryMuscleGroup(exercise.bodyFocus) : ''),
    [exercise],
  );

  // Resolve video sources at top level so [mainSrc]/[pipSrc] effects can
  // imperatively .load() the same <video> element when voice toggles or the
  // user swaps angles — no React `key` change → no remount → no flicker.
  const primarySrc = exercise ? publicVideoUrl(exercise, voice) : undefined;
  const altSrc = exercise ? publicVideoUrlAlt(exercise, voice) : undefined;
  const mainSrc = showingAlt && altSrc ? altSrc : primarySrc;
  const pipSrc = showingAlt && altSrc ? primarySrc : altSrc;

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !mainSrc) return;
    v.load();
    v.play().catch(() => {});
  }, [mainSrc]);

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
    const thumb = exerciseThumb(exercise);
    return {
      title: `${exercise.name} — How to Perform | Libo`,
      description,
      canonical: exerciseCanonicalUrl(exercise),
      ogImage: thumb ? `https://liboworld.com${thumb}` : undefined,
      jsonLd: buildExerciseGraph(exercise, primaryMuscle),
    };
  }, [exercise, primaryMuscle]);

  if (loading) {
    return (
      <>
        <SiteNav />
        <main className="ed-loading">{t('exerciseDetail.loading')}</main>
        <SiteFooter />
      </>
    );
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
                    poster={exerciseThumb(exercise) ?? undefined}
                    muted={muted}
                    loop
                    playsInline
                    autoPlay
                    preload="metadata"
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
                        ? 'Male voice (tap for female)'
                        : 'Female voice (tap for male)'
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
                  <h2 className="ed-section-title">Instructions</h2>
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
                  <h2 className="ed-section-title">Tips</h2>
                  <ul className="ed-bullets">
                    {tips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {breathingCue && (
                <div className="ed-block">
                  <h2 className="ed-section-title">Breathing</h2>
                  <p className="ed-step-text" style={{ paddingTop: 0 }}>{breathingCue}</p>
                </div>
              )}

              {mistakes.length > 0 && (
                <div className="ed-block">
                  <h2 className="ed-section-title">Common Mistakes</h2>
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
