import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SeoHead } from '../components/SeoHead';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import StoreBadges from '../components/StoreBadges';
import { PhoneShot } from '../components/earn/EarnKit';
import { ThumbPicture } from '../components/ThumbPicture';
import { DifficultyBars } from '../components/DifficultyBars';
import { getWorkouts, getExercises, type Exercise, type Workout } from '../data/exercises';
import { buildPlayableExerciseNames, filterPlayableWorkouts } from '../lib/playableWorkouts';
import { buildNameToSlug, workoutHeroThumbSet } from '../utils/thumbnails';
import { localizedWorkoutName } from '../utils/workoutLocale';
import { buildPlan, matchWorkouts, type PlanAnswers } from '../data/findPlan';
import '../components/earn/Earn.css';
import '../components/CoverCard.css';
import './ProgramLibrary.css';
import './FindPlan.css';

/**
 * /find-your-plan (Noah, 18 Nov 2026): a short web version of the app's plan
 * questions, after Ladder's "Find your plan". Six questions, then the plan the
 * app builds from the same answers (logic in data/findPlan.ts) and three free
 * workouts from the library that fit. No email, nothing stored.
 */

type QKey = keyof PlanAnswers;
const QUESTIONS: { key: QKey; options: string[] }[] = [
  { key: 'goal', options: ['lose_weight', 'build_muscle', 'improve_mobility', 'stay_active', 'reduce_stress'] },
  { key: 'location', options: ['gym', 'home', 'outdoors', 'anywhere'] },
  { key: 'experience', options: ['beginner', 'intermediate', 'advanced'] },
  { key: 'recentTraining', options: ['regular', 'onAndOff', 'comingBack', 'startingFresh'] },
  { key: 'days', options: ['2', '3', '4', '5', '6'] },
  { key: 'minutes', options: ['20', '45', '60', '75'] },
];
const NUMERIC: QKey[] = ['days', 'minutes'];

export default function FindPlan() {
  const { t, i18n } = useTranslation();
  // -1 = intro, 0..5 = questions, 6 = result
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState<Partial<PlanAnswers>>({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const advanceTimer = useRef<number | undefined>(undefined);

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);

  const done = step >= QUESTIONS.length;

  // Workout data only once the result is near: it is the heavy part.
  useEffect(() => {
    if (step < QUESTIONS.length - 1 || workouts.length) return;
    let cancelled = false;
    Promise.all([getWorkouts(), getExercises(i18n.language)])
      .then(([w, e]) => {
        if (cancelled) return;
        setWorkouts(filterPlayableWorkouts(w, buildPlayableExerciseNames(e)));
        setExercises(e);
      })
      .catch(() => { /* the result still renders without the workout picks */ });
    return () => { cancelled = true; };
  }, [step, workouts.length, i18n.language]);

  useEffect(() => () => window.clearTimeout(advanceTimer.current), []);

  // Every step change: back to the top, focus the new heading.
  useEffect(() => {
    if (step === -1) return;
    window.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const plan = useMemo(() => (done ? buildPlan(answers as PlanAnswers) : null), [done, answers]);
  const picks = useMemo(
    () => (done && workouts.length ? matchWorkouts(workouts, answers as PlanAnswers) : []),
    [done, workouts, answers],
  );
  const nameToSlug = useMemo(() => buildNameToSlug(exercises), [exercises]);

  const choose = (key: QKey, value: string) => {
    const v = NUMERIC.includes(key) ? Number(value) : value;
    setAnswers((a) => ({ ...a, [key]: v }));
    window.clearTimeout(advanceTimer.current);
    // A short beat so the tap registers visually before the next question.
    advanceTimer.current = window.setTimeout(() => setStep((s) => s + 1), 180);
  };

  const restart = () => { setAnswers({}); setStep(0); };

  const diffLabel = (diff: string) => {
    const d = (diff || 'beginner').toLowerCase();
    return t(`programLibrary.difficulty.${d.startsWith('adv') ? 'advanced' : d.startsWith('int') ? 'intermediate' : 'beginner'}`);
  };
  const diffLevel = (diff: string) => {
    const d = (diff || 'beginner').toLowerCase();
    return d.startsWith('adv') ? 'advanced' : d.startsWith('int') ? 'intermediate' : 'beginner';
  };

  return (
    <>
      <SeoHead title={t('findPlan.seo.title')} description={t('findPlan.seo.description')} canonical="/find-your-plan" />
      <SiteNav />
      <main id="main-content" className="earn-page fp-page">
        {step === -1 && (
          <section className="fp-intro">
            <div className="fp-intro__copy">
              <p className="earn-eyebrow">{t('findPlan.intro.eyebrow')}</p>
              <h1 className="fp-title">
                <span>{t('findPlan.intro.title1')}</span>
                <span className="fp-title--accent">{t('findPlan.intro.title2')}</span>
              </h1>
              <p className="fp-sub">{t('findPlan.intro.sub')}</p>
              <button type="button" className="btn-primary btn-primary--lg" onClick={() => setStep(0)}>
                {t('findPlan.intro.start')} <span aria-hidden="true">→</span>
              </button>
              <p className="fp-note">{t('findPlan.intro.note')}</p>
            </div>
            <div className="fp-intro__phones" aria-hidden="true">
              <PhoneShot src="generator" alt="" className="fp-intro__phone fp-intro__phone--back" />
              <PhoneShot src="plan" alt="" className="fp-intro__phone fp-intro__phone--front" />
            </div>
          </section>
        )}

        {step >= 0 && !done && (() => {
          const q = QUESTIONS[step];
          const base = `findPlan.questions.${q.key}`;
          const current = answers[q.key] !== undefined ? String(answers[q.key]) : undefined;
          const sub = t(`${base}.subtitle`, { defaultValue: '' });
          return (
            <section className="fp-quiz" aria-live="polite">
              <div className="fp-quiz__top">
                <button type="button" className="fp-back" onClick={() => setStep((s) => s - 1)}>
                  <span aria-hidden="true">←</span> {t('findPlan.back')}
                </button>
                <span className="fp-count">{t('findPlan.progress', { n: step + 1, total: QUESTIONS.length })}</span>
              </div>
              <div className="fp-bar" aria-hidden="true">
                <span style={{ transform: `scaleX(${(step + 1) / QUESTIONS.length})` }} />
              </div>
              <p className="earn-eyebrow">{t(`${base}.section`)}</p>
              <h1 className="fp-q" ref={headingRef} tabIndex={-1}>{t(`${base}.title`)}</h1>
              {sub && <p className="fp-sub">{sub}</p>}
              <ul className="fp-options">
                {q.options.map((o) => (
                  <li key={o}>
                    <button
                      type="button"
                      className={`fp-option${current === o ? ' fp-option--on' : ''}`}
                      aria-pressed={current === o}
                      onClick={() => choose(q.key, o)}
                    >
                      <span className="fp-option__label">{t(`${base}.options.${o}.label`)}</span>
                      <span className="fp-option__sub">{t(`${base}.options.${o}.sub`)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })()}

        {done && plan && (
          <>
            <section className="fp-result">
              <p className="earn-eyebrow">{t('findPlan.result.eyebrow')}</p>
              <h1 className="fp-title fp-title--accent" ref={headingRef} tabIndex={-1}>{t(`findPlan.theme.${plan.goal}.name`)}</h1>
              <p className="fp-sub">{t(`findPlan.theme.${plan.goal}.blurb`)}</p>
              <ul className="fp-stats">
                <li>{t('findPlan.result.days', { count: plan.days })}</li>
                <li>{t('findPlan.result.weeks', { count: plan.weeks })}</li>
                <li>{t(`findPlan.result.split.${plan.split}`)}</li>
                <li>{t(`findPlan.questions.minutes.options.${plan.minutes}.label`)}</li>
                <li>{t(`findPlan.result.level.${plan.level}`)}</li>
              </ul>
              {plan.daysRamped && <p className="fp-note">{t('findPlan.result.ramped', { count: plan.days })}</p>}
              <p className="fp-phases">
                <span className="fp-phases__dot" aria-hidden="true" />
                {t('findPlan.result.phases')}
              </p>

              <div className="fp-app band-lime">
                <div className="fp-app__copy">
                  <h2 className="fp-h2">{t('findPlan.result.appTitle')}</h2>
                  <p>{t('findPlan.result.appText')}</p>
                  <StoreBadges className="fp-app__badges" />
                </div>
                <PhoneShot src="plan-editor" alt="" className="fp-app__phone" />
              </div>
            </section>

            {picks.length > 0 && (
              <section className="fp-try">
                <h2 className="fp-h2">{t('findPlan.result.tryTitle')}</h2>
                <p className="fp-sub">{t('findPlan.result.trySub')}</p>
                <div className="wk-group-grid fp-try__grid">
                  {picks.map((w) => (
                    <Link key={w.id} to={`/workouts/${w.id}`} className="el-card wk-cover">
                      <div className="wk-cover-media">
                        <ThumbPicture
                          thumb={workoutHeroThumbSet(w, nameToSlug, exercises)}
                          loading="lazy"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                          className="wk-cover-img"
                        />
                        <div className="wk-cover-shade" aria-hidden="true" />
                        <div className="wk-cover-text">
                          <span className="wk-cover-name font-display">{localizedWorkoutName(w, i18n.language)}</span>
                          <span className="wk-cover-meta">
                            <DifficultyBars level={diffLevel(w.diff)} label={diffLabel(w.diff)} />
                            <span>{t('programLibrary.card.minutes', { count: w.dur })}</span>
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                <Link to="/workouts" className="fp-link">{t('findPlan.result.tryAll')} <span aria-hidden="true">→</span></Link>
              </section>
            )}

            <div className="fp-restart">
              <button type="button" className="fp-back" onClick={restart}>{t('findPlan.result.restart')}</button>
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
