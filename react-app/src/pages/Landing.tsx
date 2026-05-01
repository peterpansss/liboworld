import { useEffect, useRef, useState, useCallback, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { blogArticles } from '../data/blog';
import SiteFooter from '../components/SiteFooter';
import LanguageSwitcher from '../components/LanguageSwitcher';
import PricingSection from '../components/PricingSection';
import { EmojiIcon } from '../components/EmojiIcon';
import { Star } from '../utils/icons';
import './Landing.css';

// ── Helpers ──
function easeOutExpo(t: number) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// ── Static config ──
const CATEGORY_IMAGES = [
  'ReferenceImagesReal/3888964e334eac66760016434935572e.jpg',
  'ReferenceImagesReal/8ee1370056b3d2132deac27ce992a93d.jpg',
  'ReferenceImagesReal/e64b6bf3121062bba39727d191b390cc.jpg',
  'ReferenceImagesReal/4d2d6f35aaa3192a75bb1d865a1ec584.jpg',
  'ReferenceImagesReal/7f2a6692e0dccd63b0cc05e0e7197d38.jpg',
  'ReferenceImagesReal/2df174c21bbc8db6cd5ce2d0b96b810e.jpg',
];

const GOAL_PARAMS = ['lose-weight', 'build-muscle', 'improve-mobility', 'stay-active', 'reduce-stress'];
const GOAL_ICONS = ['\uD83D\uDD25', '\uD83D\uDCAA', '\uD83E\uDDD8', '\u26A1', '\uD83E\uDEC1'];
const GOAL_KEYS = ['loseWeight', 'buildMuscle', 'improveMobility', 'stayActive', 'reduceStress'] as const;

const FEATURE_ICONS = ['\uD83D\uDCDA', '\uD83C\uDFCB\uFE0F', '\uD83D\uDCC5', '\uD83D\uDCCA', '\u270F\uFE0F', '\uD83C\uDFC6'];
const FEATURE_KEYS = ['exerciseLibrary', 'workoutLibrary', 'programs', 'progressTracking', 'customBuilder', 'moneyChallenges'] as const;

const CATEGORY_KEYS = ['homeWorkouts', 'gymTraining', 'mobilityStretch', 'functional', 'morningRoutines', 'eveningWindDown'] as const;

const TESTIMONIAL_AVATARS = ['\uD83D\uDC68', '\uD83D\uDC69', '\uD83E\uDDD1'];

const NAV_SECTIONS = ['features', 'rewards', 'goals'] as const;

// ── Smooth scroll to anchor ──
function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const startY = window.scrollY;
  const targetY = el.getBoundingClientRect().top + startY - 64;
  const distance = targetY - startY;
  const duration = Math.min(600, Math.max(250, Math.abs(distance) * 0.2));
  const startTime = performance.now();

  function step(now: number) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    window.scrollTo(0, startY + distance * easeInOutCubic(progress));
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ── CountUp hook ──
function useCountUp(target: number, trigger: boolean, duration = 1500) {
  const [value, setValue] = useState(0);
  const counted = useRef(false);

  useEffect(() => {
    if (!trigger || counted.current) return;
    counted.current = true;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      setValue(Math.round(easeOutExpo(progress) * target));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [trigger, target, duration]);

  return value;
}

// ── IntersectionObserver hook ──
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.unobserve(el);
      }
    }, { threshold });
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

// ═══════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════
export default function Landing() {
  const { t } = useTranslation();

  // ── Derive data from translations ──
  const MARQUEE_ITEMS = [
    t('marquee.bodyweight'),
    t('marquee.gymTraining'),
    t('marquee.mobility'),
    t('marquee.breathing'),
    t('marquee.morningRoutines'),
    t('marquee.programs'),
    t('marquee.progressTracking'),
    t('marquee.customWorkouts'),
  ];

  const FEATURES = FEATURE_KEYS.map((key, i) => ({
    num: String(i + 1).padStart(2, '0'),
    icon: FEATURE_ICONS[i],
    name: t(`features.${key}`),
    desc: t(`features.${key}Desc`),
  }));

  const CATEGORIES = CATEGORY_KEYS.map((key, i) => ({
    name: t(`categories.${key}`),
    desc: t(`categories.${key}Desc`),
    img: CATEGORY_IMAGES[i],
  }));

  const GOALS = GOAL_KEYS.map((key, i) => ({
    icon: GOAL_ICONS[i],
    title: t(`goals.${key}`),
    desc: t(`goals.${key}Desc`),
    goalParam: GOAL_PARAMS[i],
  }));

  const TESTIMONIALS = [1, 2, 3].map((n, i) => ({
    quote: t(`proof.card${n}Quote`),
    name: t(`proof.card${n}Author`),
    meta: t(`proof.card${n}Meta`),
    avatar: TESTIMONIAL_AVATARS[i],
  }));

  const FAQ_ITEMS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
    q: t(`faq.q${n}`),
    a: t(`faq.a${n}`),
  }));

  const TRUST_STATS = [1, 2, 3, 4].map((n) => ({
    num: t(`trust.stat${n}Num`),
    label: t(`trust.stat${n}Label`),
    sub: t(`trust.stat${n}Sub`),
  }));

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [scrollIndicatorVisible, setScrollIndicatorVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeNavIdx, setActiveNavIdx] = useState(-1);
  const [loaded, setLoaded] = useState(false);
  const [heroRevealed, setHeroRevealed] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formMsg, setFormMsg] = useState(t('cta.formMessage'));
  const [formError, setFormError] = useState(false);

  // Refs
  const navLinksRef = useRef<HTMLUListElement>(null);
  const navIndicatorRef = useRef<HTMLDivElement>(null);
  const featuresGridRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  // Feature dots state
  const [activeDot, setActiveDot] = useState(0);

  // FAQ state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Blog preview — first 3 articles
  const blogPreview = blogArticles.slice(0, 3);

  // InView triggers
  const heroBottomView = useInView(0.3);
  const statsView = useInView(0.3);
  const rewardsStatView = useInView(0.5);

  // CountUp values
  const heroExercises = useCountUp(634, heroBottomView.inView);
  const heroWorkouts = useCountUp(136, heroBottomView.inView);
  const statExercises = useCountUp(634, statsView.inView);
  const statWorkouts = useCountUp(136, statsView.inView);
  const statFormats = useCountUp(6, statsView.inView);
  const rewardsStat = useCountUp(15, rewardsStatView.inView, 1200);

  // ── Feature detection ──
  const isDesktop = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches
  );
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  // ── Scroll handler ──
  useEffect(() => {
    function onScroll() {
      const sy = window.scrollY;

      // Nav
      setNavScrolled(sy > 40);

      // Scroll progress
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0) setScrollProgress(sy / max);

      // Scroll indicator
      if (sy > 100) setScrollIndicatorVisible(false);

      // Active section
      const midY = window.innerHeight / 2;
      let idx = -1;
      NAV_SECTIONS.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top < midY && rect.bottom > midY) idx = i;
        }
      });
      setActiveNavIdx(idx);

      // Parallax (desktop only)
      if (isDesktop.current && !prefersReducedMotion.current) {
        const heroPhones = document.querySelector('.hero-phones') as HTMLElement | null;
        if (heroPhones && sy < window.innerHeight) {
          heroPhones.style.transform = `translateY(${sy * 0.08}px)`;
        }
        document.querySelectorAll<HTMLElement>('.photo-break img').forEach((img) => {
          const rect = img.parentElement!.getBoundingClientRect();
          if (rect.top < window.innerHeight && rect.bottom > 0) {
            const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
            img.style.transform = `translateY(${(progress - 0.5) * 60}px) scale(1.1)`;
          }
        });
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Nav indicator position ──
  useEffect(() => {
    const ul = navLinksRef.current;
    const indicator = navIndicatorRef.current;
    if (!ul || !indicator) return;

    const links = ul.querySelectorAll('a');
    if (activeNavIdx >= 0 && links[activeNavIdx]) {
      const link = links[activeNavIdx];
      const rect = link.getBoundingClientRect();
      const parentRect = ul.getBoundingClientRect();
      indicator.style.width = `${rect.width}px`;
      indicator.style.transform = `translateX(${rect.left - parentRect.left}px)`;
    } else {
      indicator.style.width = '0';
    }
  }, [activeNavIdx]);

  // ── Page load orchestration ──
  useEffect(() => {
    if (prefersReducedMotion.current) {
      setLoaded(true);
      setHeroRevealed(true);
      setCtaVisible(true);
      setScrollIndicatorVisible(true);
      return;
    }

    // Stagger the load sequence
    requestAnimationFrame(() => setLoaded(true));
    setTimeout(() => setHeroRevealed(true), 200);
    setTimeout(() => setCtaVisible(true), 1000);
    setTimeout(() => setScrollIndicatorVisible(true), 1400);
  }, []);

  // ── Feature carousel dots (mobile) ──
  useEffect(() => {
    const grid = featuresGridRef.current;
    if (!grid) return;
    function onGridScroll() {
      if (!grid) return;
      const scrollLeft = grid.scrollLeft;
      const first = grid.firstElementChild as HTMLElement | null;
      if (!first) return;
      const cardWidth = first.offsetWidth + 14;
      setActiveDot(Math.round(scrollLeft / cardWidth));
    }
    grid.addEventListener('scroll', onGridScroll, { passive: true });
    return () => grid.removeEventListener('scroll', onGridScroll);
  }, []);

  // ── Cursor follower (desktop) ──
  useEffect(() => {
    if (!isDesktop.current || prefersReducedMotion.current) return;
    const cursor = cursorRef.current;
    if (!cursor) return;

    let mouseX = 0, mouseY = 0, cursorX = 0, cursorY = 0;
    let visible = false;
    let raf: number;

    function onMove(e: MouseEvent) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!visible) {
        visible = true;
        cursor!.classList.add('visible');
      }
    }
    function onLeave() {
      visible = false;
      cursor!.classList.remove('visible');
    }

    const hoverables = 'a, button, .feature-item, .cat-item, .goal-row, .proof-card, .store-btn, input';
    function onOver(e: MouseEvent) {
      if ((e.target as Element).closest(hoverables)) cursor!.classList.add('hover');
    }
    function onOut(e: MouseEvent) {
      if ((e.target as Element).closest(hoverables)) cursor!.classList.remove('hover');
    }

    function update() {
      cursorX = lerp(cursorX, mouseX, 0.15);
      cursorY = lerp(cursorY, mouseY, 0.15);
      cursor!.style.left = `${cursorX}px`;
      cursor!.style.top = `${cursorY}px`;
      raf = requestAnimationFrame(update);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseout', onOut);
    raf = requestAnimationFrame(update);

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
      cancelAnimationFrame(raf);
    };
  }, []);

  // ── Reveal observer for data-reveal elements ──
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const el = e.target as HTMLElement;
            const delay = parseFloat(el.dataset.delay || '0') * 1000;
            setTimeout(() => {
              el.classList.add('revealed');
              // Star bounce
              el.querySelectorAll<HTMLElement>('.star-animate').forEach((star, i) => {
                setTimeout(() => star.classList.add('bounced'), i * 100);
              });
              // Icon bounce
              const icon = el.querySelector('.feature-icon');
              if (icon) setTimeout(() => icon.classList.add('icon-bounce'), 200);
            }, delay);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -5% 0px' }
    );

    document.querySelectorAll('[data-reveal]').forEach((el) => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.dataset.delay) {
        htmlEl.style.transitionDelay = `${htmlEl.dataset.delay}s`;
      }
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // ── Reveal observer for .reveal elements ──
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            e.target.classList.add('up');
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );

    document.querySelectorAll('.reveal, .reveal-card').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // ── Feature card 3D tilt (desktop) ──
  useEffect(() => {
    if (!isDesktop.current || prefersReducedMotion.current) return;

    const cards = document.querySelectorAll<HTMLElement>('.feature-item');
    const handlers = new Map<HTMLElement, { move: (e: MouseEvent) => void; leave: () => void }>();

    cards.forEach((card) => {
      const move = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(800px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg) translateY(-3px) scale(1.01)`;
        card.style.setProperty('--spot-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
        card.style.setProperty('--spot-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
      };
      const leave = () => { card.style.transform = ''; };
      card.addEventListener('mousemove', move);
      card.addEventListener('mouseleave', leave);
      handlers.set(card, { move, leave });
    });

    return () => {
      handlers.forEach(({ move, leave }, card) => {
        card.removeEventListener('mousemove', move);
        card.removeEventListener('mouseleave', leave);
      });
    };
  }, []);

  // ── Escape key closes mobile menu ──
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) setMobileMenuOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileMenuOpen]);

  // ── Body scroll lock when mobile menu is open ──
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  // ── Nav click handler ──
  const handleNavClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    scrollToId(id);
    setMobileMenuOpen(false);
  }, []);

  // ── Form submit ──
  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setFormError(false);
    setFormMsg('');

    try {
      const { error } = await supabase
        .from('waitlist')
        .insert({ email: trimmed, source: 'landing_page' });

      if (!error) {
        setFormSuccess(true);
        setEmail('');
        setFormMsg(t('cta.successNotification'));
      } else if (error.code === '23505') {
        setFormSuccess(true);
        setEmail('');
        setFormMsg(t('cta.duplicateNotification'));
      } else {
        setFormError(true);
        setFormMsg(t('cta.errorMessage'));
      }
    } catch {
      setFormError(true);
      setFormMsg(t('cta.connectionError'));
    } finally {
      setSubmitting(false);
    }
  }, [email, t]);

  // ── Render helpers ──
  function renderMarqueeItems(items: string[]) {
    // Double for seamless loop
    return [...items, ...items].map((item, i) => (
      <span key={i}>
        <span className="marquee-item">{item}</span>
        <span className="marquee-item marquee-sep">&middot;</span>
      </span>
    ));
  }

  return (
    <>
    <main className="landing" id="main-content">
      {/* Scroll progress bar */}
      <div
        className="scroll-progress"
        style={{ transform: `scaleX(${scrollProgress})` }}
      />

      {/* Cursor follower (desktop only) */}
      <div className="cursor-follower" ref={cursorRef} />

      {/* ── MOBILE MENU ── */}
      <div
        className={`mobile-menu${mobileMenuOpen ? ' open' : ''}`}
        role="dialog"
        aria-modal={mobileMenuOpen}
        aria-label={t('nav.navigationMenu')}
      >
        <button
          className="mobile-menu-close"
          onClick={() => setMobileMenuOpen(false)}
          aria-label={t('nav.closeMenu')}
        >
          &#10005;
        </button>
        <a href="#features" onClick={(e) => handleNavClick(e, 'features')}>{t('nav.features')}</a>
        <a href="#rewards" onClick={(e) => handleNavClick(e, 'rewards')}>{t('nav.rewards')}</a>
        <a href="#workouts" onClick={(e) => handleNavClick(e, 'workouts')}>{t('nav.workouts')}</a>
        <a href="#goals" onClick={(e) => handleNavClick(e, 'goals')}>{t('nav.goals')}</a>
        <Link to="/exercises" onClick={() => setMobileMenuOpen(false)}>{t('mobileMenu.exerciseLibrary')}</Link>
        <Link to="/workouts" onClick={() => setMobileMenuOpen(false)}>{t('mobileMenu.workouts')}</Link>
        <Link to="/blog" onClick={() => setMobileMenuOpen(false)}>{t('mobileMenu.blog')}</Link>
        <Link to="/onboarding" onClick={() => setMobileMenuOpen(false)}>{t('mobileMenu.getEarlyAccess')}</Link>
        <div style={{ marginTop: 24 }}>
          <LanguageSwitcher variant="drawer" />
        </div>
      </div>

      {/* ── NAV ── */}
      <nav className={`landing-nav${navScrolled ? ' scrolled' : ''}`} aria-label={t('nav.mainNavigation')}>
        <div className="landing-nav-inner">
          <a href="#" className={`nav-logo${loaded ? ' load-fade loaded' : ' load-fade'}`} onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <img src="/brand/logo_options/option_A_wordmark_ascending_dots_transparent.png" alt="Libo" />
          </a>
          <ul className="nav-links" ref={navLinksRef}>
            {NAV_SECTIONS.map((id, i) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className={`load-stagger${loaded ? ' loaded' : ''}`}
                  style={{ transitionDelay: `${0.05 + i * 0.05}s` }}
                  onClick={(e) => handleNavClick(e, id)}
                >
                  {t(`nav.${id}`)}
                </a>
              </li>
            ))}
            <li className="nav-sep" aria-hidden="true" role="separator" />
            <li><Link to="/exercises" className={`load-stagger${loaded ? ' loaded' : ''}`} style={{ transitionDelay: '0.3s' }}>{t('nav.exercises')}</Link></li>
            <li><Link to="/workouts" className={`load-stagger${loaded ? ' loaded' : ''}`} style={{ transitionDelay: '0.35s' }}>{t('nav.workouts')}</Link></li>
            <li><Link to="/blog" className={`load-stagger${loaded ? ' loaded' : ''}`} style={{ transitionDelay: '0.4s' }}>{t('nav.blog')}</Link></li>
            <li aria-hidden="true" style={{ position: 'absolute' }}>
              <div className="nav-indicator" ref={navIndicatorRef} />
            </li>
          </ul>
          <div className="nav-right">
            <LanguageSwitcher />
            <Link
              to="/onboarding"
              className="btn-nav"
            >
              {t('nav.getStarted')}
            </Link>
            <button
              className="nav-hamburger"
              onClick={() => setMobileMenuOpen(true)}
              aria-label={t('nav.openMenu')}
              aria-expanded={mobileMenuOpen}
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-text">
            <div className="hero-eyebrow">
              <div className="hero-eyebrow-dot" />
              <span className="label">{t('hero.eyebrow')}</span>
            </div>
            <h1 className="hero-headline display display-xl">
              <span className={`line-1 clip-reveal${heroRevealed ? ' revealed' : ''}`} style={{ transitionDelay: '0.2s' }}>{t('hero.headline1')}</span>
              <span className={`line-2 clip-reveal${heroRevealed ? ' revealed' : ''}`} style={{ transitionDelay: '0.35s' }}>{t('hero.headline2')}</span>
              <span className={`line-3 clip-reveal${heroRevealed ? ' revealed' : ''}`} style={{ transitionDelay: '0.5s' }}>{t('hero.headline3')}</span>
            </h1>
            <a
              href="#cta"
              className={`hero-cta-btn${ctaVisible ? ' cta-pulse' : ''}`}
              style={{ opacity: ctaVisible ? 1 : 0, transition: 'opacity 0.4s ease' }}
              onClick={(e) => handleNavClick(e, 'cta')}
            >
              {t('hero.cta')}
            </a>
          </div>
          <div className={`hero-phones hero-image-reveal${heroRevealed ? ' revealed' : ''}`}>
            <div className="hero-phone hero-phone--left">
              <div className="hero-phone__frame">
                <div className="hero-phone__screen">
                  <img src="/mockups/hero-left.png" alt="Libo Explore tab showing 140 exercises across workouts, exercises, and programs" loading="eager" />
                </div>
              </div>
            </div>
            <div className="hero-phone hero-phone--center">
              <div className="hero-phone__frame">
                <div className="hero-phone__screen">
                  <img src="/mockups/hero-center.png" alt="Libo Home tab with today's Upper/Lower Superset workout and progress stats" loading="eager" />
                </div>
              </div>
            </div>
            <div className="hero-phone hero-phone--right">
              <div className="hero-phone__frame">
                <div className="hero-phone__screen">
                  <img src="/mockups/hero-right.png" alt="Libo workout player mid-session showing a bodyweight squat" loading="eager" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-bottom" ref={heroBottomView.ref} style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="hero-bottom-cell">
            <div className="hero-bottom-num">{heroExercises}</div>
            <div className="hero-bottom-lbl">{t('hero.stat1Label')}</div>
          </div>
          <div className="hero-bottom-cell">
            <div className="hero-bottom-num">{heroWorkouts}</div>
            <div className="hero-bottom-lbl">{t('hero.stat2Label')}</div>
          </div>
        </div>

        <div className={`scroll-indicator${scrollIndicatorVisible ? ' visible' : ''}`}>
          <span>{t('hero.scrollIndicator')}</span>
          <div className="chevron" />
        </div>
      </section>

      <hr className="rule" />

      {/* ── MARQUEE ── */}
      <div className="marquee-wrap">
        <div className="marquee-track">
          {renderMarqueeItems(MARQUEE_ITEMS)}
        </div>
      </div>

      {/* ── STATS STRIP ── */}
      <div className="stats-strip" ref={statsView.ref}>
        <div className="stats-strip-grid">
          <div data-reveal="fade-up" data-delay="0">
            <div className="stats-strip-num">{statExercises}</div>
            <div className="stats-strip-label">{t('statsStrip.exercises')}</div>
          </div>
          <div data-reveal="fade-up" data-delay="0.1">
            <div className="stats-strip-num">{statWorkouts}</div>
            <div className="stats-strip-label">{t('statsStrip.workouts')}</div>
          </div>
          <div data-reveal="fade-up" data-delay="0.2">
            <div className="stats-strip-num">{statFormats}</div>
            <div className="stats-strip-label">{t('statsStrip.trainingFormats')}</div>
          </div>
          <div data-reveal="fade-up" data-delay="0.3" className="stats-hide-mobile">
            <div className="stats-strip-num">{t('hero.stat3Value')}</div>
            <div className="stats-strip-label">{t('statsStrip.equipmentRequired')}</div>
          </div>
        </div>
      </div>

      {/* ── STATEMENT ── */}
      <div className="statement-wrapper">
        <div className="statement">
          <p className="statement-text">
            <span className="dim" data-reveal="fade-up" data-delay="0">{t('statement.line1')}</span><br />
            <span className="bright" data-reveal="fade-up" data-delay="0.15" style={{ display: 'inline-block' }}>{t('statement.line2')}</span><br />
            <span className="dim" data-reveal="fade-up" data-delay="0.3" style={{ display: 'inline-block' }}>{t('statement.line3')}</span><br />
            <span className="accent highlight-swipe" data-reveal="fade-up" data-delay="0.45" style={{ display: 'inline-block' }}>{t('statement.line4')}</span>
          </p>
          <p className="body-lg statement-body" data-reveal="fade-up" data-delay="0.6">
            {t('statement.description')}
          </p>
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section className="features-section" id="features">
        <div className="features-header reveal">
          <div>
            <div className="label label-spaced">{t('features.eyebrow')}</div>
            <h2 className="display display-md font-display" style={{ whiteSpace: 'pre-line' }}>{t('features.headline')}</h2>
          </div>
          <p className="body-md text-narrow">
            {t('features.description')}
          </p>
        </div>
        <div className="features-grid" ref={featuresGridRef}>
          {FEATURES.map((f, i) => (
            <div
              key={f.num}
              className={`feature-item reveal${i % 3 === 1 ? ' reveal-delay-1' : i % 3 === 2 ? ' reveal-delay-2' : ''}`}
            >
              <div className="feature-num">{f.num}</div>
              <span className="feature-icon">
                <EmojiIcon emoji={f.icon} size={32} />
              </span>
              <div className="feature-name font-display">{f.name}</div>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
        <div className="features-dots">
          {FEATURES.map((_, i) => (
            <div key={i} className={`dot${i === activeDot ? ' active' : ''}`} />
          ))}
        </div>
      </section>

      {/* ── FULL-BLEED PHOTO BREAK ── */}
      <div className="photo-break" style={{ height: 480 }}>
        <img
          src="/ReferenceImagesReal/935abbc2c7027fa606dba7152c73c59e.jpg"
          alt="Strength training"
          loading="lazy"
          style={{ objectPosition: 'center 62%' }}
        />
        <div
          className="photo-break-overlay"
          style={{
            background: 'linear-gradient(to right,rgba(0,0,0,0.72) 0%,rgba(0,0,0,0.2) 50%,transparent 100%)',
          }}
        >
          <div>
            <div className="label label-spaced" style={{ color: 'var(--accent)' }}>{t('photoBreak1.eyebrow')}</div>
            <h2 className="display display-md font-display text-narrow">
              {(() => {
                const lines = t('photoBreak1.headline').split('\n');
                return lines.map((line, idx) => (
                  <span key={idx}>
                    {idx === lines.length - 1 ? <span style={{ color: 'var(--accent)' }}>{line}</span> : line}
                    {idx < lines.length - 1 && <br />}
                  </span>
                ));
              })()}
            </h2>
          </div>
        </div>
      </div>

      {/* ── REWARDS ── */}
      <section className="rewards-section" id="rewards">
        <div className="rewards-inner">
          <div className="rewards-left reveal">
            <div className="label label-spaced">{t('rewards.eyebrow')}</div>
            <h2 className="display display-md font-display" style={{ whiteSpace: 'pre-line' }}>
              {t('rewards.headline')}
            </h2>
            <p className="body-md text-narrow" style={{ marginTop: 28, lineHeight: 1.7 }}>
              {t('rewards.description')}
            </p>
            <div className="rewards-chips">
              <span className="rewards-chip">{t('rewards.chip1')}</span>
              <span className="rewards-chip">{t('rewards.chip2')}</span>
              <span className="rewards-chip">{t('rewards.chip3')}</span>
            </div>
          </div>
          <div className="rewards-right reveal reveal-delay-1">
            <div className="rewards-gradient-card">
              <div className="rewards-glass-badge">{t('rewards.badge')}</div>
              <div className="rewards-big-stat" ref={rewardsStatView.ref}>
                &euro;{rewardsStat}
              </div>
              <div className="rewards-challenge-name font-display">{t('rewards.challengeName')}</div>
              <div className="rewards-challenge-sub">{t('rewards.challengeSubtitle')}</div>
              <div className="rewards-flow">
                <div className="rewards-flow-step">
                  <div className="rewards-flow-icon"><EmojiIcon emoji={'\uD83D\uDCAA'} size={24} /></div>
                  <div className="rewards-flow-label">{t('rewards.flowStep1')}</div>
                </div>
                <div className="rewards-flow-arrow">&rarr;</div>
                <div className="rewards-flow-step">
                  <div className="rewards-flow-icon"><EmojiIcon emoji={'\uD83D\uDCF9'} size={24} /></div>
                  <div className="rewards-flow-label">{t('rewards.flowStep2')}</div>
                </div>
                <div className="rewards-flow-arrow">&rarr;</div>
                <div className="rewards-flow-step">
                  <div className="rewards-flow-icon"><EmojiIcon emoji={'\uD83D\uDCF2'} size={24} /></div>
                  <div className="rewards-flow-label">{t('rewards.flowStep3')}</div>
                </div>
                <div className="rewards-flow-arrow">&rarr;</div>
                <div className="rewards-flow-step">
                  <div className="rewards-flow-icon accent-glow"><EmojiIcon emoji={'\uD83D\uDCB0'} size={24} color="#CAFF00" /></div>
                  <div className="rewards-flow-label accent-label">{t('rewards.flowStep4')}</div>
                </div>
              </div>
              <div className="rewards-spots">
                <span className="rewards-spots-dot" />
                {t('rewards.spots')}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WORKOUT CATEGORIES ── */}
      <section id="workouts">
        <div className="categories-section">
          <div className="categories-header reveal">
            <div>
              <div className="label label-spaced">{t('categories.eyebrow')}</div>
              <h2 className="display display-md font-display" style={{ whiteSpace: 'pre-line' }}>{t('categories.headline')}</h2>
            </div>
            <p className="body-md text-narrow">
              {t('categories.description')}
            </p>
          </div>
          <div className="categories-grid">
            {CATEGORIES.map((cat, i) => (
              <Link
                key={cat.name}
                to="/onboarding"
                className={`cat-item reveal${i % 4 === 1 ? ' reveal-delay-1' : i % 4 === 2 ? ' reveal-delay-2' : i % 4 === 3 ? ' reveal-delay-3' : ''}`}
              >
                <div className="cat-img">
                  <img src={`/${cat.img}`} alt={cat.name} loading="lazy" />
                </div>
                <div className="cat-name font-display">{cat.name}</div>
                <p className="cat-desc">{cat.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── GOALS ── */}
      <section className="goals-section" id="goals">
        <div className="goals-inner">
          <div className="goals-header reveal">
            <div className="label">{t('goals.eyebrow')}</div>
            <h2 className="display display-md font-display" style={{ whiteSpace: 'pre-line' }}>
              {t('goals.headline')}
            </h2>
            <p className="goals-body">
              {t('goals.description')}
            </p>
          </div>
          <div className="goal-list reveal reveal-delay-1">
            {GOALS.map((goal) => (
              <Link key={goal.title} to={`/onboarding?goal=${goal.goalParam}`} className="goal-row">
                <span className="goal-row-icon">
                  <EmojiIcon emoji={goal.icon} size={28} />
                </span>
                <div className="goal-row-text">
                  <h4>{goal.title}</h4>
                  <p>{goal.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── PHOTO BREAK 2 ── */}
      <div
        className="photo-break-minimal"
        style={{
          height: 360,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #111 50%, #0a0a0a 100%)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <p className="display display-lg font-display" style={{ textAlign: 'center', letterSpacing: '-1px' }}>
          {t('photoBreak2Full.line1')}<br /><span style={{ color: 'var(--accent)' }}>{t('photoBreak2Full.line2')}</span>
        </p>
      </div>

      {/* ── SOCIAL PROOF ── */}
      <div className="proof-wrapper">
        <section className="proof-section" id="proof">
          <div className="reveal">
            <div className="label label-spaced">{t('proof.eyebrow')}</div>
            <h2 className="display display-md font-display" style={{ whiteSpace: 'pre-line' }}>{t('proof.headline')}</h2>
          </div>
          <div className="proof-grid">
            {TESTIMONIALS.map((testimonial, i) => (
              <div
                key={testimonial.name}
                className="proof-card reveal-card"
                data-reveal="fade-up"
                data-delay={String(i * 0.15)}
              >
                <div className="proof-stars">
                  {[...Array(5)].map((_, j) => (
                    <span key={j} className="star-animate">
                      <EmojiIcon icon={Star} size={14} color="#CAFF00" />
                    </span>
                  ))}
                </div>
                <p className="proof-quote">{testimonial.quote}</p>
                <div className="proof-author">
                  <div className="proof-avatar">
                    <EmojiIcon emoji={testimonial.avatar} size={28} />
                  </div>
                  <div>
                    <div className="proof-name">{testimonial.name}</div>
                    <div className="proof-meta">{testimonial.meta}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── TRUST BADGES ── */}
      <section className="trust-section">
        <div className="trust-inner">
          <div className="trust-header reveal">
            <div className="label label-spaced">{t('trust.eyebrow')}</div>
            <h2 className="display display-sm font-display">{t('trust.headline')}</h2>
          </div>
          <div className="trust-grid">
            {TRUST_STATS.map((s, i) => (
              <div
                key={s.label}
                className="trust-card"
                data-reveal="fade-up"
                data-delay={String(i * 0.1)}
              >
                <div className="trust-num font-display">{s.num}</div>
                <div className="trust-label">{s.label}</div>
                <div className="trust-sub">{s.sub}</div>
              </div>
            ))}
          </div>
          <div className="trust-badges reveal">
            <div className="trust-badge">
              <svg width="18" height="22" viewBox="0 0 20 24" fill="none" aria-hidden="true">
                <path d="M16.47 12.2c-.03-3.1 2.53-4.59 2.64-4.66-1.44-2.1-3.68-2.39-4.47-2.42-1.9-.19-3.72 1.12-4.69 1.12-.97 0-2.46-1.1-4.05-1.07-2.08.03-4 1.21-5.08 3.08-2.17 3.76-.55 9.33 1.56 12.38 1.03 1.5 2.27 3.17 3.89 3.11 1.56-.06 2.15-1.01 4.03-1.01 1.88 0 2.42 1.01 4.07.98 1.68-.03 2.74-1.52 3.76-3.03 1.19-1.74 1.68-3.42 1.71-3.51-.04-.02-3.28-1.26-3.31-4.97h-.06z" fill="currentColor"/><path d="M13.4 3.27C14.24 2.24 14.82.87 14.67-.5c-1.17.05-2.6.78-3.44 1.77-.75.87-1.42 2.27-1.24 3.61 1.31.1 2.65-.67 3.41-1.61z" fill="currentColor"/>
              </svg>
              <span>{t('trust.availableIos')}</span>
            </div>
            <div className="trust-badge">
              <span className="trust-badge-stars" style={{ display: 'inline-flex', gap: 2 }}>
                {[...Array(5)].map((_, k) => (
                  <EmojiIcon key={k} icon={Star} size={14} color="#CAFF00" />
                ))}
              </span>
              <span>{t('trust.betaRating')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <PricingSection />

      {/* ── FAQ ── */}
      <section className="faq-section" id="faq">
        <div className="faq-inner">
          <div className="faq-header reveal">
            <div>
              <div className="label label-spaced">{t('faq.eyebrow')}</div>
              <h2 className="display display-md font-display" style={{ whiteSpace: 'pre-line' }}>{t('faq.headline')}</h2>
            </div>
            <p className="body-md text-narrow">
              {t('faq.description')}
            </p>
          </div>
          <div className="faq-list">
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={i}
                className={`faq-item${openFaq === i ? ' open' : ''}`}
              >
                <button
                  className="faq-question"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  <span>{item.q}</span>
                  <span className="faq-icon" aria-hidden="true">{openFaq === i ? '\u2212' : '+'}</span>
                </button>
                <div className="faq-answer">
                  <p>{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BLOG PREVIEW ── */}
      <section className="blog-preview-section">
        <div className="blog-preview-inner">
          <div className="blog-preview-header reveal">
            <div>
              <div className="label label-spaced">{t('blogPreview.eyebrow')}</div>
              <h2 className="display display-sm font-display">{t('blogPreview.headline')}</h2>
            </div>
            <Link to="/blog" className="blog-preview-link">
              {t('blogPreview.seeAll')}
            </Link>
          </div>
          <div className="blog-preview-grid">
            {blogPreview.map((article, i) => (
              <Link
                key={article.slug}
                to={`/blog/${article.slug}`}
                className="blog-preview-card"
                data-reveal="fade-up"
                data-delay={String(i * 0.12)}
              >
                {article.heroImage ? (
                  <div className="blog-preview-img">
                    <img src={article.heroImage} alt={article.title} loading="lazy" />
                  </div>
                ) : (
                  <div className="blog-preview-emoji" aria-hidden="true">
                    <EmojiIcon emoji={article.heroEmoji} size={40} />
                  </div>
                )}
                <div className="blog-preview-cat">{article.category}</div>
                <h3 className="blog-preview-title">{article.title}</h3>
                <p className="blog-preview-excerpt">{article.excerpt}</p>
                <div className="blog-preview-meta">{article.readTime} {t('blogPreview.minRead')}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section" id="cta">
        <div className="reveal">
          <div className="label cta-label">{t('cta.eyebrow')}</div>
          <h2 className="display display-lg font-display" style={{ whiteSpace: 'pre-line' }}>{t('cta.headline')}</h2>
          <p className="cta-sub">
            {t('cta.description')}
          </p>
          <form className="email-form" onSubmit={handleSubmit}>
            <label htmlFor="emailInput" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
              {t('cta.emailLabel')}
            </label>
            <input
              className="email-input"
              type="email"
              id="emailInput"
              placeholder={t('cta.emailPlaceholder')}
              required
              aria-label={t('cta.emailLabel')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              className="btn-cta"
              type="submit"
              disabled={submitting || formSuccess}
              style={formSuccess ? { background: '#1a1a1a' } : undefined}
            >
              {submitting ? t('cta.joining') : formSuccess ? (
                <>
                  <svg width="16" height="12" viewBox="0 0 16 12" fill="none" style={{ verticalAlign: 'middle', marginRight: 6 }}>
                    <path d="M1 6L6 11L15 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 22, strokeDashoffset: 0, animation: 'checkDraw 0.4s ease forwards' }} />
                  </svg>
                  {t('cta.successMessage')}
                </>
              ) : t('cta.submitButton')}
            </button>
          </form>
          <p className={`form-msg${formError ? ' error' : ''}`}>{formMsg}</p>
        </div>
        <div className="store-row reveal">
          <a href="https://apps.apple.com" className="store-btn" aria-label={t('store.downloadAppStore')}>
            <svg width="20" height="24" viewBox="0 0 20 24" fill="none" style={{ flexShrink: 0 }}>
              <path d="M16.47 12.2c-.03-3.1 2.53-4.59 2.64-4.66-1.44-2.1-3.68-2.39-4.47-2.42-1.9-.19-3.72 1.12-4.69 1.12-.97 0-2.46-1.1-4.05-1.07-2.08.03-4 1.21-5.08 3.08-2.17 3.76-.55 9.33 1.56 12.38 1.03 1.5 2.27 3.17 3.89 3.11 1.56-.06 2.15-1.01 4.03-1.01 1.88 0 2.42 1.01 4.07.98 1.68-.03 2.74-1.52 3.76-3.03 1.19-1.74 1.68-3.42 1.71-3.51-.04-.02-3.28-1.26-3.31-4.97h-.06z" fill="white" />
              <path d="M13.4 3.27C14.24 2.24 14.82.87 14.67-.5c-1.17.05-2.6.78-3.44 1.77-.75.87-1.42 2.27-1.24 3.61 1.31.1 2.65-.67 3.41-1.61z" fill="white" />
            </svg>
            <div><small>{t('store.comingSoonOn')}</small><strong>{t('store.appStore')}</strong></div>
          </a>
        </div>
      </section>

      </main>
      <SiteFooter />
    </>
  );
}
