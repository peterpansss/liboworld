import { useState, useRef, useCallback, useEffect, useMemo, type FormEvent } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import './Onboarding.css';

// ── Constants ──

const TOTAL_STEPS = 20;
const INTERSTITIAL_STEPS = [2, 9, 16, 19];
const SECTION_MAP: Record<number, number> = {
  1: 1, 2: 1, 3: 1, 4: 1, 5: 1,
  6: 2, 7: 2, 8: 2, 9: 2, 10: 2,
  11: 3, 12: 3, 13: 3, 14: 3, 15: 3,
  16: 4, 17: 4, 18: 4, 19: 4, 20: 4,
};

// Map between stored answer values ("lose-weight") and i18n keys ("loseWeight")
const GOAL_KEY_MAP: Record<string, string> = {
  'lose-weight': 'loseWeight',
  'build-muscle': 'buildMuscle',
  'improve-mobility': 'improveMobility',
  'stay-active': 'stayActive',
  'reduce-stress': 'reduceStress',
};

// ── Types ──

type StepMode = 'single' | 'multi';

interface Option {
  value: string;
  titleKey: string;
  descKey?: string;
  icon?: string;
}

interface QuizStep {
  type: 'question';
  sectionKey: string;
  headingKey: string;
  key: string;
  mode: StepMode;
  options: Option[];
  grid?: boolean;
}

interface InterstitialStep {
  type: 'interstitial';
  headingKey?: string;
  bodyKey?: string;
  image?: string;
  dynamic?: 'goal'; // heading/body change based on goal answer
}

interface LoadingStep {
  type: 'loading';
}

interface EmailStep {
  type: 'email';
}

type Step = QuizStep | InterstitialStep | LoadingStep | EmailStep;

// ── Step Definitions ──
// Translation keys — resolved at render time via t()

const STEPS: Step[] = [
  // Step 1: Main Goal
  {
    type: 'question', sectionKey: 'onboarding.sections.myProfile', headingKey: 'onboarding.step1.heading',
    key: 'goal', mode: 'single', options: [
      { value: 'lose-weight', titleKey: 'onboarding.step1.options.loseWeight' },
      { value: 'build-muscle', titleKey: 'onboarding.step1.options.buildMuscle' },
      { value: 'improve-mobility', titleKey: 'onboarding.step1.options.improveMobility' },
      { value: 'stay-active', titleKey: 'onboarding.step1.options.stayActive' },
      { value: 'reduce-stress', titleKey: 'onboarding.step1.options.reduceStress' },
    ],
  },
  // Step 2: Motivational interstitial (dynamic based on goal)
  {
    type: 'interstitial', dynamic: 'goal',
    image: '/ReferenceImagesReal/935abbc2c7027fa606dba7152c73c59e.jpg',
  },
  // Step 3: Secondary Goals
  {
    type: 'question', sectionKey: 'onboarding.sections.myProfile', headingKey: 'onboarding.step3.heading',
    key: 'secondary_goals', mode: 'multi', options: [
      { value: 'lose-fat', titleKey: 'onboarding.step3.options.loseFat' },
      { value: 'increase-stamina', titleKey: 'onboarding.step3.options.increaseStamina' },
      { value: 'improve-posture', titleKey: 'onboarding.step3.options.improvePosture' },
      { value: 'build-confidence', titleKey: 'onboarding.step3.options.buildConfidence' },
      { value: 'none', titleKey: 'onboarding.step3.options.none' },
    ],
  },
  // Step 4: Fitness Level
  {
    type: 'question', sectionKey: 'onboarding.sections.myProfile', headingKey: 'onboarding.step4.heading',
    key: 'level', mode: 'single', options: [
      { value: 'beginner', titleKey: 'onboarding.step4.options.beginnerTitle', descKey: 'onboarding.step4.options.beginnerDesc' },
      { value: 'intermediate', titleKey: 'onboarding.step4.options.intermediateTitle', descKey: 'onboarding.step4.options.intermediateDesc' },
      { value: 'advanced', titleKey: 'onboarding.step4.options.advancedTitle', descKey: 'onboarding.step4.options.advancedDesc' },
    ],
  },
  // Step 5: Best Shape
  {
    type: 'question', sectionKey: 'onboarding.sections.myProfile', headingKey: 'onboarding.step5.heading',
    key: 'best_shape', mode: 'single', options: [
      { value: 'less-than-year', titleKey: 'onboarding.step5.options.lessThanYear' },
      { value: '1-2-years', titleKey: 'onboarding.step5.options.oneToTwoYears' },
      { value: 'more-than-3-years', titleKey: 'onboarding.step5.options.moreThanThreeYears' },
      { value: 'never', titleKey: 'onboarding.step5.options.never' },
    ],
  },
  // Step 6: Push-ups
  {
    type: 'question', sectionKey: 'onboarding.sections.activity', headingKey: 'onboarding.step6.heading',
    key: 'pushups', mode: 'single', options: [
      { value: '0', titleKey: 'onboarding.step6.options.none' },
      { value: '1-10', titleKey: 'onboarding.step6.options.oneToTen' },
      { value: '11-20', titleKey: 'onboarding.step6.options.elevenToTwenty' },
      { value: '20+', titleKey: 'onboarding.step6.options.twentyPlus' },
    ],
  },
  // Step 7: Flexibility
  {
    type: 'question', sectionKey: 'onboarding.sections.activity', headingKey: 'onboarding.step7.heading',
    key: 'flexibility', mode: 'single', options: [
      { value: 'very', titleKey: 'onboarding.step7.options.very' },
      { value: 'pretty', titleKey: 'onboarding.step7.options.pretty' },
      { value: 'not-good', titleKey: 'onboarding.step7.options.notGood' },
      { value: 'not-sure', titleKey: 'onboarding.step7.options.notSure' },
    ],
  },
  // Step 8: Workout Frequency
  {
    type: 'question', sectionKey: 'onboarding.sections.activity', headingKey: 'onboarding.step8.heading',
    key: 'recent_activity', mode: 'single', options: [
      { value: 'daily', titleKey: 'onboarding.step8.options.daily' },
      { value: 'weekly', titleKey: 'onboarding.step8.options.weekly' },
      { value: 'monthly', titleKey: 'onboarding.step8.options.monthly' },
      { value: 'none', titleKey: 'onboarding.step8.options.none' },
    ],
  },
  // Step 9: Motivational Interstitial
  {
    type: 'interstitial',
    headingKey: 'onboarding.step9.heading',
    bodyKey: 'onboarding.step9.body',
    image: '/ReferenceImagesReal/1933bd503955db5451058dd0bcae5740.jpg',
  },
  // Step 10: Target Zones (grid)
  {
    type: 'question', sectionKey: 'onboarding.sections.activity', headingKey: 'onboarding.step10.heading',
    key: 'target_zones', mode: 'multi', grid: true, options: [
      { value: 'chest', titleKey: 'onboarding.step10.options.chest', icon: '\uD83E\uDEC1' },
      { value: 'arms', titleKey: 'onboarding.step10.options.arms', icon: '\uD83D\uDCAA' },
      { value: 'core', titleKey: 'onboarding.step10.options.core', icon: '\uD83D\uDD25' },
      { value: 'legs', titleKey: 'onboarding.step10.options.legs', icon: '\uD83E\uDDB5' },
      { value: 'back', titleKey: 'onboarding.step10.options.back', icon: '\uD83D\uDD19' },
      { value: 'full-body', titleKey: 'onboarding.step10.options.fullBody', icon: '\uD83C\uDFCB\uFE0F' },
    ],
  },
  // Step 11: Training Frequency
  {
    type: 'question', sectionKey: 'onboarding.sections.lifestyle', headingKey: 'onboarding.step11.heading',
    key: 'train_freq', mode: 'single', options: [
      { value: '1-2', titleKey: 'onboarding.step11.options.oneToTwo' },
      { value: '3-4', titleKey: 'onboarding.step11.options.threeToFour' },
      { value: '5+', titleKey: 'onboarding.step11.options.fivePlus' },
    ],
  },
  // Step 12: Workout Duration
  {
    type: 'question', sectionKey: 'onboarding.sections.lifestyle', headingKey: 'onboarding.step12.heading',
    key: 'duration', mode: 'single', options: [
      { value: '10-15', titleKey: 'onboarding.step12.options.tenToFifteen' },
      { value: '15-20', titleKey: 'onboarding.step12.options.fifteenToTwenty' },
      { value: '20-30', titleKey: 'onboarding.step12.options.twentyToThirty' },
      { value: '30+', titleKey: 'onboarding.step12.options.thirtyPlus' },
      { value: 'unsure', titleKey: 'onboarding.step12.options.unsure' },
    ],
  },
  // Step 13: Work Schedule
  {
    type: 'question', sectionKey: 'onboarding.sections.lifestyle', headingKey: 'onboarding.step13.heading',
    key: 'schedule', mode: 'single', options: [
      { value: '9-5', titleKey: 'onboarding.step13.options.nineToFive', icon: '\uD83D\uDDA5' },
      { value: 'night', titleKey: 'onboarding.step13.options.night', icon: '\uD83C\uDF19' },
      { value: 'flexible', titleKey: 'onboarding.step13.options.flexible', icon: '\uD83D\uDD04' },
      { value: 'retired', titleKey: 'onboarding.step13.options.retired', icon: '\uD83C\uDFE0' },
    ],
  },
  // Step 14: Energy Levels
  {
    type: 'question', sectionKey: 'onboarding.sections.lifestyle', headingKey: 'onboarding.step14.heading',
    key: 'energy', mode: 'single', options: [
      { value: 'low', titleKey: 'onboarding.step14.options.low', icon: '\uD83D\uDD0B' },
      { value: 'steady', titleKey: 'onboarding.step14.options.steady', icon: '\uD83D\uDD32' },
      { value: 'fluctuate', titleKey: 'onboarding.step14.options.fluctuate', icon: '\uD83D\uDCCA' },
      { value: 'high', titleKey: 'onboarding.step14.options.high', icon: '\u26A1' },
    ],
  },
  // Step 15: Sleep
  {
    type: 'question', sectionKey: 'onboarding.sections.lifestyle', headingKey: 'onboarding.step15.heading',
    key: 'sleep', mode: 'single', options: [
      { value: 'less-5', titleKey: 'onboarding.step15.options.lessThanFive' },
      { value: '5-6', titleKey: 'onboarding.step15.options.fiveToSix' },
      { value: '7-8', titleKey: 'onboarding.step15.options.sevenToEight' },
      { value: 'more-8', titleKey: 'onboarding.step15.options.moreThanEight' },
    ],
  },
  // Step 16: Motivational Interstitial
  {
    type: 'interstitial',
    headingKey: 'onboarding.step16.heading',
    bodyKey: 'onboarding.step16.body',
  },
  // Step 17: Equipment
  {
    type: 'question', sectionKey: 'onboarding.sections.yourPlan', headingKey: 'onboarding.step17.heading',
    key: 'equipment', mode: 'multi', options: [
      { value: 'none', titleKey: 'onboarding.step17.options.none' },
      { value: 'dumbbells', titleKey: 'onboarding.step17.options.dumbbells' },
      { value: 'resistance-bands', titleKey: 'onboarding.step17.options.resistanceBands' },
      { value: 'pull-up-bar', titleKey: 'onboarding.step17.options.pullUpBar' },
      { value: 'full-gym', titleKey: 'onboarding.step17.options.fullGym' },
      { value: 'kettlebell', titleKey: 'onboarding.step17.options.kettlebell' },
    ],
  },
  // Step 18: Obstacles
  {
    type: 'question', sectionKey: 'onboarding.sections.yourPlan', headingKey: 'onboarding.step18.heading',
    key: 'obstacles', mode: 'multi', options: [
      { value: 'motivation', titleKey: 'onboarding.step18.options.motivation' },
      { value: 'no-plan', titleKey: 'onboarding.step18.options.noPlan' },
      { value: 'time', titleKey: 'onboarding.step18.options.time' },
      { value: 'injuries', titleKey: 'onboarding.step18.options.injuries' },
      { value: 'none', titleKey: 'onboarding.step18.options.none' },
    ],
  },
  // Step 19: Loading
  { type: 'loading' },
  // Step 20: Email
  { type: 'email' },
];

// ── Logo path ──
const LOGO_SRC = '/brand/logo_options/option_A_wordmark_ascending_dots_transparent.png';

// ── Component ──

export default function Onboarding() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>(() => {
    const goalParam = searchParams.get('goal');
    return goalParam ? { goal: goalParam } : ({} as Record<string, string | string[]>);
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [formState, setFormState] = useState<'idle' | 'submitting' | 'success' | 'duplicate' | 'error'>('idle');
  const [formMsg, setFormMsg] = useState('');

  // Loading screen state
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [loadingReady, setLoadingReady] = useState(false);
  const [testimonialVisible, setTestimonialVisible] = useState(false);
  const ringRef = useRef<SVGCircleElement>(null);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Step transition refs
  const stepRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [activeClass, setActiveClass] = useState<Record<number, string>>({ 1: 'active visible' });

  const section = SECTION_MAP[currentStep] || 1;
  const isInterstitial = INTERSTITIAL_STEPS.includes(currentStep);
  const showBack = currentStep > 1 && !isInterstitial;

  // Get goal for dynamic content
  const goalKey = (answers.goal as string) || 'build-muscle';
  const goalI18nKey = GOAL_KEY_MAP[goalKey] || GOAL_KEY_MAP['build-muscle'];

  const SECTION_LABELS = useMemo(() => [
    t('onboarding.sections.myProfile'),
    t('onboarding.sections.activity'),
    t('onboarding.sections.lifestyle'),
    t('onboarding.sections.yourPlan'),
  ], [t]);

  const goTo = useCallback((step: number, dir: 'forward' | 'back') => {
    if (step < 1 || step > TOTAL_STEPS) return;

    const oldStep = currentStep;

    // Slide out old step
    setActiveClass(prev => ({
      ...prev,
      [oldStep]: `active exiting ${dir === 'forward' ? 'slide-out-left' : 'slide-out-right'}`,
    }));

    // After animation, remove old step
    setTimeout(() => {
      setActiveClass(prev => {
        const next = { ...prev };
        delete next[oldStep];
        return next;
      });
    }, 300);

    // Set new step
    setCurrentStep(step);
    window.scrollTo(0, 0);

    // Initially position new step off-screen, then animate in
    setActiveClass(prev => ({
      ...prev,
      [step]: 'active',
    }));

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setActiveClass(prev => ({
          ...prev,
          [step]: 'active visible',
        }));
      });
    });

    // Loading screen animation
    if (step === 19) {
      runLoadingScreen(step);
    }
  }, [currentStep]);

  const runLoadingScreen = useCallback((_step: number) => {
    setLoadingPercent(0);
    setLoadingReady(false);
    setTestimonialVisible(false);

    // Animate ring
    if (ringRef.current) {
      ringRef.current.classList.remove('animate');
      requestAnimationFrame(() => {
        ringRef.current?.classList.add('animate');
      });
    }

    // Animate percentage
    const duration = 2500;
    const start = performance.now();
    function animatePercent(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      setLoadingPercent(Math.round(progress * 100));
      if (progress < 1) requestAnimationFrame(animatePercent);
    }
    requestAnimationFrame(animatePercent);

    // Show ready state
    loadingTimerRef.current = setTimeout(() => {
      setLoadingReady(true);
      setTestimonialVisible(true);
    }, 2600);

    // Auto-advance to email step
    setTimeout(() => {
      // Use the step parameter to verify we're still on loading
      setCurrentStep(prev => {
        if (prev === 19) {
          setActiveClass(p => {
            const next = { ...p };
            delete next[19];
            return { ...next, 20: 'active' };
          });
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setActiveClass(p => ({ ...p, 20: 'active visible' }));
            });
          });
          return 20;
        }
        return prev;
      });
    }, 3500);
  }, []);

  // Cleanup loading timer
  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    };
  }, []);

  // Init first step
  useEffect(() => {
    setActiveClass({ 1: 'active visible' });
  }, []);

  // Keyboard support (1-6 to select options)
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (isInterstitial || currentStep === 19 || currentStep === 20) return;
      const stepDef = STEPS[currentStep - 1];
      if (stepDef.type !== 'question') return;
      const num = parseInt(e.key);
      if (num >= 1 && num <= Math.min(stepDef.options.length, 6)) {
        const opt = stepDef.options[num - 1];
        handleOptionClick(stepDef, opt.value);
      }
    }
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [currentStep, isInterstitial, answers]);

  const handleOptionClick = useCallback((stepDef: QuizStep, value: string) => {
    if (stepDef.mode === 'single') {
      setAnswers(prev => ({ ...prev, [stepDef.key]: value }));
      setTimeout(() => {
        goTo(currentStep + 1, 'forward');
      }, 400);
    } else {
      // Multi-select
      setAnswers(prev => {
        const current = (prev[stepDef.key] as string[]) || [];
        if (value === 'none') {
          // Toggle "none", deselect others
          return { ...prev, [stepDef.key]: current.includes('none') ? [] : ['none'] };
        } else {
          // Remove "none" if picking another option
          const withoutNone = current.filter(v => v !== 'none');
          const toggled = withoutNone.includes(value)
            ? withoutNone.filter(v => v !== value)
            : [...withoutNone, value];
          return { ...prev, [stepDef.key]: toggled };
        }
      });
    }
  }, [currentStep, goTo]);

  const handleMultiContinue = useCallback((key: string) => {
    const val = answers[key];
    if (Array.isArray(val) && val.length > 0) {
      goTo(currentStep + 1, 'forward');
    }
  }, [answers, currentStep, goTo]);

  const handleEmailSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setFormState('submitting');
    setFormMsg('');

    try {
      const { error } = await supabase
        .from('waitlist')
        .insert({
          email: email.trim(),
          source: 'onboarding',
          onboarding_answers: JSON.stringify(answers),
        });

      if (!error) {
        setFormState('success');
        setFormMsg(t('onboarding.email.successMessage'));
      } else if (error.code === '23505') {
        setFormState('duplicate');
        setFormMsg(t('onboarding.email.duplicateMessage'));
      } else {
        setFormState('error');
        setFormMsg(t('onboarding.email.errorMessage'));
      }
    } catch {
      setFormState('error');
      setFormMsg(t('onboarding.email.connectionError'));
    }
  }, [email, answers, t]);

  // ── Render helpers ──

  const renderQuestionStep = (step: QuizStep, _stepIdx: number) => {
    const selected = answers[step.key];
    const isSelected = (val: string) =>
      step.mode === 'single'
        ? selected === val
        : Array.isArray(selected) && selected.includes(val);

    return (
      <>
        <div className="ob-section-tag">{t(step.sectionKey)}</div>
        <h1 className="ob-step-heading">{t(step.headingKey)}</h1>
        <div className={`ob-options${step.grid ? ' grid-2' : ''}`}>
          {step.options.map(opt => (
            <div
              key={opt.value}
              className={`ob-option-card${isSelected(opt.value) ? ' selected' : ''}`}
              onClick={() => handleOptionClick(step, opt.value)}
            >
              <div className="ob-card-content">
                {opt.icon && <span className="ob-card-icon">{opt.icon}</span>}
                <div className="ob-card-text">
                  <div className="ob-card-title">{t(opt.titleKey)}</div>
                  {opt.descKey && <div className="ob-card-desc">{t(opt.descKey)}</div>}
                </div>
              </div>
              {step.mode === 'single' ? (
                <span className="ob-radio-circle" />
              ) : (
                <span className="ob-check-square" />
              )}
            </div>
          ))}
        </div>
        {step.mode === 'multi' && (
          <button
            className="ob-continue-btn"
            disabled={!Array.isArray(answers[step.key]) || (answers[step.key] as string[]).length === 0}
            onClick={() => handleMultiContinue(step.key)}
          >
            {t('onboarding.buttons.nextStep')}
          </button>
        )}
      </>
    );
  };

  const renderInterstitialStep = (step: InterstitialStep) => {
    const heading = step.dynamic === 'goal'
      ? t(`onboarding.goalHeadings.${goalI18nKey}`)
      : step.headingKey ? t(step.headingKey) : '';
    const body = step.dynamic === 'goal'
      ? t(`onboarding.goalBody.${goalI18nKey}`)
      : step.bodyKey ? t(step.bodyKey) : '';

    return (
      <div className="ob-interstitial-card">
        {step.image ? (
          <div className="ob-interstitial-top">
            <div className="ob-interstitial-heading">{heading}</div>
            <img className="ob-interstitial-img" src={step.image} alt="" />
          </div>
        ) : (
          <div className="ob-interstitial-heading" style={{ marginBottom: 16 }}>{heading}</div>
        )}
        <p className="ob-interstitial-body" dangerouslySetInnerHTML={{ __html: body }} />
        <button
          className="ob-continue-btn"
          onClick={() => goTo(currentStep + 1, 'forward')}
        >
          {t('onboarding.buttons.continue')}
        </button>
      </div>
    );
  };

  const renderLoadingStep = () => (
    <div className="ob-loading-screen">
      <div className="ob-loading-logo">
        <img src={LOGO_SRC} style={{ height: 28 }} alt="Libo" />
      </div>
      <div className="ob-progress-ring-wrap">
        <svg viewBox="0 0 160 160">
          <circle className="ob-progress-ring-bg" cx="80" cy="80" r="70" />
          <circle
            className="ob-progress-ring-fill"
            ref={ringRef}
            cx="80"
            cy="80"
            r="70"
          />
        </svg>
        <div className="ob-progress-percent">{loadingPercent}%</div>
      </div>
      <p className="ob-loading-ready">
        {loadingReady ? t('onboarding.loading.ready') : t('onboarding.loading.preparing')}
      </p>
      {loadingReady && (
        <p className="ob-loading-social">
          {t('onboarding.loading.social', { goal: t(`onboarding.goalLabels.${goalI18nKey}`) })}
        </p>
      )}
      <div className="ob-testimonial-card" style={{ opacity: testimonialVisible ? 1 : 0 }}>
        <div className="ob-testimonial-stars">{'\u2605\u2605\u2605\u2605\u2605'}</div>
        <p className="ob-testimonial-text">
          {t('onboarding.loading.testimonialQuote')}
        </p>
        <p className="ob-testimonial-author">{t('onboarding.loading.testimonialAuthor')}</p>
      </div>
    </div>
  );

  const renderEmailStep = () => {
    const label = t(`onboarding.goalLabels.${goalI18nKey}`);
    const isDone = formState === 'success' || formState === 'duplicate';

    return (
      <div>
        <h1 className="ob-step-heading">
          {t('onboarding.email.headingPrefix')}{' '}
          <strong>{t('onboarding.email.trainingPlan')}</strong>{' '}
          {t('onboarding.email.headingMiddle')}{' '}
          <span className="ob-goal-highlight">{label}</span>{t('onboarding.email.headingSuffix')}
        </h1>
        <form onSubmit={handleEmailSubmit}>
          <input
            type="email"
            className="ob-email-input"
            placeholder={t('onboarding.email.placeholder')}
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={isDone}
          />
          <p className="ob-privacy-note">
            {t('onboarding.email.privacyNote')}
          </p>
          <button
            type="submit"
            className="ob-continue-btn"
            disabled={formState === 'submitting' || isDone}
            style={isDone ? { background: 'var(--accent)', color: '#000' } : undefined}
          >
            {formState === 'submitting' ? t('onboarding.buttons.joining')
              : isDone ? t('onboarding.buttons.onTheList')
              : t('onboarding.buttons.joinWaitlist')}
          </button>
        </form>
        {formMsg && (
          <p
            className="ob-form-msg"
            style={{
              color: formState === 'success' ? 'var(--accent)'
                : formState === 'duplicate' ? 'rgba(255,255,255,0.6)'
                : '#ff4444',
            }}
          >
            {formMsg}
          </p>
        )}
      </div>
    );
  };

  const renderStepContent = (stepIdx: number) => {
    const step = STEPS[stepIdx];
    switch (step.type) {
      case 'question': return renderQuestionStep(step, stepIdx);
      case 'interstitial': return renderInterstitialStep(step);
      case 'loading': return renderLoadingStep();
      case 'email': return renderEmailStep();
    }
  };

  return (
    <>
      {/* Top Bar */}
      <div className="ob-top-bar">
        <div className="ob-top-bar-inner">
          <button
            className={`ob-back-btn${showBack ? '' : ' hidden'}`}
            onClick={() => goTo(currentStep - 1, 'back')}
            aria-label={t('onboarding.topBar.goBack')}
          >
            &larr;
          </button>
          <Link to="/" className="ob-logo-center">
            <img src={LOGO_SRC} style={{ height: 24 }} alt="Libo" />
          </Link>
          <button
            className="ob-hamburger"
            onClick={() => setMenuOpen(true)}
            aria-label={t('onboarding.topBar.menu')}
          >
            <span /><span /><span />
          </button>
        </div>
        <div className="ob-section-labels">
          {SECTION_LABELS.map((label, i) => (
            <span
              key={label}
              className={`ob-section-label${i + 1 <= section ? ' active' : ''}`}
            >
              {label}
            </span>
          ))}
        </div>
        <div className="ob-progress-bar-wrap">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className={`ob-progress-segment${i <= section ? ' filled' : ''}`}
            />
          ))}
        </div>
      </div>

      {/* Menu Drawer */}
      <div
        className={`ob-menu-overlay${menuOpen ? ' open' : ''}`}
        onClick={e => { if (e.target === e.currentTarget) setMenuOpen(false); }}
      >
        <div className="ob-menu-drawer">
          <button
            className="ob-menu-close"
            onClick={() => setMenuOpen(false)}
            aria-label={t('onboarding.topBar.closeMenu')}
          >
            &times;
          </button>
          <a href="/" onClick={() => setMenuOpen(false)}>{t('onboarding.menu.home')}</a>
          <a href="/#features" onClick={() => setMenuOpen(false)}>{t('onboarding.menu.features')}</a>
          <a href="/#rewards" onClick={() => setMenuOpen(false)}>{t('onboarding.menu.rewards')}</a>
          <a href="/#workouts" onClick={() => setMenuOpen(false)}>{t('onboarding.menu.workouts')}</a>
          <a href="/#goals" onClick={() => setMenuOpen(false)}>{t('onboarding.menu.goals')}</a>
          <a href="/#cta" onClick={() => setMenuOpen(false)}>{t('onboarding.menu.getEarlyAccess')}</a>
        </div>
      </div>

      {/* Quiz Container */}
      <div className="ob-quiz-container">
        {STEPS.map((_, idx) => {
          const stepNum = idx + 1;
          const classes = activeClass[stepNum];
          if (!classes) return null;

          return (
            <div
              key={stepNum}
              ref={el => { stepRefs.current[stepNum] = el; }}
              className={`ob-step ${classes}`}
              style={
                classes === 'active'
                  ? { transform: stepNum > currentStep ? 'translateX(60px)' : 'translateX(-60px)' }
                  : undefined
              }
            >
              {renderStepContent(idx)}
            </div>
          );
        })}
      </div>
    </>
  );
}
