import { useState, useRef, useCallback, useEffect, type FormEvent } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
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
const SECTION_LABELS = ['My Profile', 'Activity', 'Lifestyle', 'Your Plan'];

const GOAL_HEADINGS: Record<string, string> = {
  'lose-weight': 'Lose weight fast!',
  'build-muscle': 'Build muscle fast!',
  'improve-mobility': 'Move better every day!',
  'stay-active': 'Stay active and strong!',
  'reduce-stress': 'Feel calmer and stronger!',
};

const GOAL_BODY: Record<string, string> = {
  'lose-weight': 'Libo will help you <strong>burn fat and get leaner with bodyweight training</strong>. We\u2019ll <strong>tailor the plan to your body and goal</strong> to ensure constant progress.',
  'build-muscle': 'Libo will help you <strong>build lean muscle with bodyweight training</strong>. We\u2019ll <strong>tailor the plan to your body and goal</strong> to ensure constant progress.',
  'improve-mobility': 'Libo will help you <strong>improve flexibility and movement quality</strong>. We\u2019ll <strong>tailor the plan to your body and goal</strong> to ensure constant progress.',
  'stay-active': 'Libo will help you <strong>maintain an active and healthy lifestyle</strong>. We\u2019ll <strong>tailor the plan to your body and goal</strong> to ensure constant progress.',
  'reduce-stress': 'Libo will help you <strong>relax, recover, and feel your best</strong>. We\u2019ll <strong>tailor the plan to your body and goal</strong> to ensure constant progress.',
};

const GOAL_LABELS: Record<string, string> = {
  'lose-weight': 'losing weight',
  'build-muscle': 'building muscle',
  'improve-mobility': 'improving mobility',
  'stay-active': 'staying active',
  'reduce-stress': 'reducing stress',
};

// ── Types ──

type StepMode = 'single' | 'multi';

interface Option {
  value: string;
  title: string;
  desc?: string;
  icon?: string;
}

interface QuizStep {
  type: 'question';
  section: string;
  heading: string;
  key: string;
  mode: StepMode;
  options: Option[];
  grid?: boolean;
}

interface InterstitialStep {
  type: 'interstitial';
  heading: string;
  body: string;
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

const STEPS: Step[] = [
  // Step 1: Main Goal
  {
    type: 'question', section: 'My Profile', heading: "What's your main goal?",
    key: 'goal', mode: 'single', options: [
      { value: 'lose-weight', title: 'Lose weight' },
      { value: 'build-muscle', title: 'Build muscle' },
      { value: 'improve-mobility', title: 'Improve mobility' },
      { value: 'stay-active', title: 'Stay active' },
      { value: 'reduce-stress', title: 'Reduce stress' },
    ],
  },
  // Step 2: Motivational interstitial (dynamic based on goal)
  {
    type: 'interstitial', dynamic: 'goal',
    heading: 'Build muscle fast!',
    body: '',
    image: '/ReferenceImagesReal/935abbc2c7027fa606dba7152c73c59e.jpg',
  },
  // Step 3: Secondary Goals
  {
    type: 'question', section: 'My Profile', heading: 'What else do you hope to achieve?',
    key: 'secondary_goals', mode: 'multi', options: [
      { value: 'lose-fat', title: 'Lose stubborn fat' },
      { value: 'increase-stamina', title: 'Increase stamina and endurance' },
      { value: 'improve-posture', title: 'Improve posture and flexibility' },
      { value: 'build-confidence', title: 'Build confidence' },
      { value: 'none', title: 'None of the above' },
    ],
  },
  // Step 4: Fitness Level
  {
    type: 'question', section: 'My Profile', heading: 'How would you describe your fitness level?',
    key: 'level', mode: 'single', options: [
      { value: 'beginner', title: 'Beginner', desc: 'Just getting started' },
      { value: 'intermediate', title: 'Intermediate', desc: 'I work out sometimes' },
      { value: 'advanced', title: 'Advanced', desc: 'I train regularly' },
    ],
  },
  // Step 5: Best Shape
  {
    type: 'question', section: 'My Profile', heading: 'How long ago were you in the best shape of your life?',
    key: 'best_shape', mode: 'single', options: [
      { value: 'less-than-year', title: 'Less than a year ago' },
      { value: '1-2-years', title: '1 to 2 years ago' },
      { value: 'more-than-3-years', title: 'More than 3 years ago' },
      { value: 'never', title: 'Never' },
    ],
  },
  // Step 6: Push-ups
  {
    type: 'question', section: 'Activity', heading: 'How many push-ups can you do in a row?',
    key: 'pushups', mode: 'single', options: [
      { value: '0', title: "I can't do push-ups" },
      { value: '1-10', title: '1-10 push-ups' },
      { value: '11-20', title: '11-20 push-ups' },
      { value: '20+', title: '20+ push-ups' },
    ],
  },
  // Step 7: Flexibility
  {
    type: 'question', section: 'Activity', heading: 'How flexible are you?',
    key: 'flexibility', mode: 'single', options: [
      { value: 'very', title: 'Very flexible' },
      { value: 'pretty', title: 'Pretty flexible' },
      { value: 'not-good', title: 'Not that good' },
      { value: 'not-sure', title: "I'm not sure" },
    ],
  },
  // Step 8: Workout Frequency
  {
    type: 'question', section: 'Activity', heading: 'How many times have you worked out in the last 3 months?',
    key: 'recent_activity', mode: 'single', options: [
      { value: 'daily', title: 'Almost every day' },
      { value: 'weekly', title: 'Several times a week' },
      { value: 'monthly', title: 'Several times a month' },
      { value: 'none', title: "I don't work out" },
    ],
  },
  // Step 9: Motivational Interstitial
  {
    type: 'interstitial',
    heading: 'Achieve greater results with Libo',
    body: 'Our workouts are simple, fun, and fit into the busiest schedule. We\u2019ll consider your fitness level to help you <strong>reach your goal faster</strong>.',
    image: '/ReferenceImagesReal/1933bd503955db5451058dd0bcae5740.jpg',
  },
  // Step 10: Target Zones (grid)
  {
    type: 'question', section: 'Activity', heading: 'What are your target zones?',
    key: 'target_zones', mode: 'multi', grid: true, options: [
      { value: 'chest', title: 'Chest', icon: '\uD83E\uDEC1' },
      { value: 'arms', title: 'Arms', icon: '\uD83D\uDCAA' },
      { value: 'core', title: 'Core', icon: '\uD83D\uDD25' },
      { value: 'legs', title: 'Legs', icon: '\uD83E\uDDB5' },
      { value: 'back', title: 'Back', icon: '\uD83D\uDD19' },
      { value: 'full-body', title: 'Full body', icon: '\uD83C\uDFCB\uFE0F' },
    ],
  },
  // Step 11: Training Frequency
  {
    type: 'question', section: 'Lifestyle', heading: 'How many times per week would you like to train?',
    key: 'train_freq', mode: 'single', options: [
      { value: '1-2', title: '1-2 times' },
      { value: '3-4', title: '3-4 times' },
      { value: '5+', title: '5+ times' },
    ],
  },
  // Step 12: Workout Duration
  {
    type: 'question', section: 'Lifestyle', heading: 'How long do you want your workouts to be?',
    key: 'duration', mode: 'single', options: [
      { value: '10-15', title: '10-15 min' },
      { value: '15-20', title: '15-20 min' },
      { value: '20-30', title: '20-30 min' },
      { value: '30+', title: '30+ min' },
      { value: 'unsure', title: "I don't know" },
    ],
  },
  // Step 13: Work Schedule
  {
    type: 'question', section: 'Lifestyle', heading: "What's your work schedule like?",
    key: 'schedule', mode: 'single', options: [
      { value: '9-5', title: '9 to 5', icon: '\uD83D\uDDA5' },
      { value: 'night', title: 'Night shifts', icon: '\uD83C\uDF19' },
      { value: 'flexible', title: 'My hours are flexible', icon: '\uD83D\uDD04' },
      { value: 'retired', title: "I'm retired / not working", icon: '\uD83C\uDFE0' },
    ],
  },
  // Step 14: Energy Levels
  {
    type: 'question', section: 'Lifestyle', heading: 'How are your energy levels during the day?',
    key: 'energy', mode: 'single', options: [
      { value: 'low', title: 'Low and inconsistent', icon: '\uD83D\uDD0B' },
      { value: 'steady', title: 'Remain steady', icon: '\uD83D\uDD32' },
      { value: 'fluctuate', title: 'Fluctuate throughout the day', icon: '\uD83D\uDCCA' },
      { value: 'high', title: 'Stay high all day', icon: '\u26A1' },
    ],
  },
  // Step 15: Sleep
  {
    type: 'question', section: 'Lifestyle', heading: 'How much sleep do you usually get?',
    key: 'sleep', mode: 'single', options: [
      { value: 'less-5', title: 'Less than 5 hours' },
      { value: '5-6', title: '5-6 hours' },
      { value: '7-8', title: '7-8 hours' },
      { value: 'more-8', title: 'More than 8 hours' },
    ],
  },
  // Step 16: Motivational Interstitial
  {
    type: 'interstitial',
    heading: 'Libo will help you feel more energized',
    body: 'Our workouts will help you improve your stamina and endurance. You\u2019ll have <strong>more energy and strength</strong> to keep up with your daily activities.',
  },
  // Step 17: Equipment
  {
    type: 'question', section: 'Your Plan', heading: 'What equipment do you have access to?',
    key: 'equipment', mode: 'multi', options: [
      { value: 'none', title: 'None (Bodyweight only)' },
      { value: 'dumbbells', title: 'Dumbbells' },
      { value: 'resistance-bands', title: 'Resistance Bands' },
      { value: 'pull-up-bar', title: 'Pull-up Bar' },
      { value: 'full-gym', title: 'Full Gym' },
      { value: 'kettlebell', title: 'Kettlebell' },
    ],
  },
  // Step 18: Obstacles
  {
    type: 'question', section: 'Your Plan', heading: 'What has stopped you from reaching your goals before?',
    key: 'obstacles', mode: 'multi', options: [
      { value: 'motivation', title: 'Lack of motivation' },
      { value: 'no-plan', title: "Didn't have a clear plan" },
      { value: 'time', title: 'Lack of time' },
      { value: 'injuries', title: 'Injuries or pain' },
      { value: 'none', title: 'None of the above' },
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
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>(() => {
    const goalParam = searchParams.get('goal');
    return goalParam ? { goal: goalParam } : {};
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
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Step transition refs
  const stepRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [activeClass, setActiveClass] = useState<Record<number, string>>({ 1: 'active visible' });

  const section = SECTION_MAP[currentStep] || 1;
  const isInterstitial = INTERSTITIAL_STEPS.includes(currentStep);
  const showBack = currentStep > 1 && !isInterstitial;

  // Get goal for dynamic content
  const goalKey = (answers.goal as string) || 'build-muscle';

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

  const runLoadingScreen = useCallback((step: number) => {
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
        setFormMsg('Welcome! We\u2019ll notify you when Libo launches.');
      } else if (error.code === '23505') {
        setFormState('duplicate');
        setFormMsg('You\u2019re already on the waitlist! We\u2019ll be in touch.');
      } else {
        setFormState('error');
        setFormMsg('Something went wrong. Please try again.');
      }
    } catch {
      setFormState('error');
      setFormMsg('Connection error. Please try again.');
    }
  }, [email, answers]);

  // ── Render helpers ──

  const renderQuestionStep = (step: QuizStep, stepIdx: number) => {
    const selected = answers[step.key];
    const isSelected = (val: string) =>
      step.mode === 'single'
        ? selected === val
        : Array.isArray(selected) && selected.includes(val);

    return (
      <>
        <div className="ob-section-tag">{step.section}</div>
        <h1 className="ob-step-heading">{step.heading}</h1>
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
                  <div className="ob-card-title">{opt.title}</div>
                  {opt.desc && <div className="ob-card-desc">{opt.desc}</div>}
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
            NEXT STEP
          </button>
        )}
      </>
    );
  };

  const renderInterstitialStep = (step: InterstitialStep) => {
    const heading = step.dynamic === 'goal'
      ? GOAL_HEADINGS[goalKey] || GOAL_HEADINGS['build-muscle']
      : step.heading;
    const body = step.dynamic === 'goal'
      ? GOAL_BODY[goalKey] || GOAL_BODY['build-muscle']
      : step.body;

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
          CONTINUE
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
        {loadingReady ? 'Your personalised Libo Training Plan is ready!' : 'Preparing your plan...'}
      </p>
      {loadingReady && (
        <p className="ob-loading-social">
          10,000+ people have chosen Libo to help with {GOAL_LABELS[goalKey] || 'building muscle'}
        </p>
      )}
      <div className="ob-testimonial-card" style={{ opacity: testimonialVisible ? 1 : 0 }}>
        <div className="ob-testimonial-stars">{'\u2605\u2605\u2605\u2605\u2605'}</div>
        <p className="ob-testimonial-text">
          &ldquo;Libo changed my routine completely. The workouts are quick, effective, and I actually look forward to them now.&rdquo;
        </p>
        <p className="ob-testimonial-author">- Marco T., verified user</p>
      </div>
    </div>
  );

  const renderEmailStep = () => {
    const label = GOAL_LABELS[goalKey] || 'building muscle';
    const isDone = formState === 'success' || formState === 'duplicate';

    return (
      <div>
        <h1 className="ob-step-heading">
          Join the Libo waitlist for early access to your personalised{' '}
          <strong>Training Plan</strong> for{' '}
          <span className="ob-goal-highlight">{label}</span>!
        </h1>
        <form onSubmit={handleEmailSubmit}>
          <input
            type="email"
            className="ob-email-input"
            placeholder="Enter your email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={isDone}
          />
          <p className="ob-privacy-note">
            By continuing, you agree to receive emails from Libo. We respect your privacy and will never share your data.
          </p>
          <button
            type="submit"
            className="ob-continue-btn"
            disabled={formState === 'submitting' || isDone}
            style={isDone ? { background: 'var(--accent)', color: '#000' } : undefined}
          >
            {formState === 'submitting' ? 'JOINING...'
              : isDone ? '\u2713 YOU\u2019RE ON THE LIST!'
              : 'JOIN WAITLIST'}
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
            aria-label="Go back"
          >
            &larr;
          </button>
          <Link to="/" className="ob-logo-center">
            <img src={LOGO_SRC} style={{ height: 24 }} alt="Libo" />
          </Link>
          <button
            className="ob-hamburger"
            onClick={() => setMenuOpen(true)}
            aria-label="Menu"
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
            aria-label="Close menu"
          >
            &times;
          </button>
          <a href="/" onClick={() => setMenuOpen(false)}>Home</a>
          <a href="/#features" onClick={() => setMenuOpen(false)}>Features</a>
          <a href="/#rewards" onClick={() => setMenuOpen(false)}>Rewards</a>
          <a href="/#workouts" onClick={() => setMenuOpen(false)}>Workouts</a>
          <a href="/#goals" onClick={() => setMenuOpen(false)}>Goals</a>
          <a href="/#cta" onClick={() => setMenuOpen(false)}>Get Early Access</a>
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
