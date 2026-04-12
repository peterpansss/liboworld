import { useEffect, useRef, useState, useCallback, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { blogArticles } from '../data/blog';
import SiteFooter from '../components/SiteFooter';
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

// ── Data ──
const MARQUEE_ITEMS = [
  'Bodyweight', 'Gym Training', 'Mobility', 'Breathing',
  'Morning Routines', 'Programs', 'Progress Tracking', 'Custom Workouts',
];

const FEATURES = [
  { num: '01', icon: '\uD83D\uDCDA', name: 'Exercise Library', desc: '718 exercises \u2014 411 gym, 258 home, 49 mobility. Every one with equipment notes, muscle targeting, and form cues.' },
  { num: '02', icon: '\uD83C\uDFCB\uFE0F', name: 'Workout Library', desc: '140 pre-built sessions \u2014 gym, home, cardio, stretching, morning routines, and challenge programs. 5 to 60 minutes.' },
  { num: '03', icon: '\uD83D\uDCC5', name: 'Programs', desc: 'Multi-week structured plans designed to get you real, measurable results. Follow the plan, trust the process.' },
  { num: '04', icon: '\uD83D\uDCCA', name: 'Progress Tracking', desc: 'Log every set, rep, and weight. Libo remembers your history and shows exactly how much you\'ve grown.' },
  { num: '05', icon: '\u270F\uFE0F', name: 'Custom Builder', desc: 'Build your own workout from the full exercise library. Set your sequence, sets, rest time \u2014 save and reuse.' },
  { num: '06', icon: '\uD83C\uDFC6', name: 'Money Challenges', desc: 'Join 30-day challenges, hit your daily reps, share to stories \u2014 and win real cash. 50 pushups a day for 30 days? That\u2019s \u20AC15 in your pocket.' },
];

const CATEGORIES = [
  { name: 'Home Workouts', desc: 'Bodyweight \u00B7 No equipment needed', img: 'ReferenceImagesReal/3888964e334eac66760016434935572e.jpg' },
  { name: 'Gym Training', desc: 'Machines \u00B7 Free weights \u00B7 Full sessions', img: 'ReferenceImagesReal/8ee1370056b3d2132deac27ce992a93d.jpg' },
  { name: 'Mobility & Stretch', desc: 'Flexibility \u00B7 Joint health \u00B7 Recovery', img: 'ReferenceImagesReal/e64b6bf3121062bba39727d191b390cc.jpg' },
  { name: 'Functional Fitness', desc: 'Real-world movement patterns', img: 'ReferenceImagesReal/4d2d6f35aaa3192a75bb1d865a1ec584.jpg' },
  { name: 'Morning Routines', desc: 'Energise \u00B7 Activate \u00B7 Set your focus', img: 'ReferenceImagesReal/7f2a6692e0dccd63b0cc05e0e7197d38.jpg' },
  { name: 'Evening Wind-Down', desc: 'Relax \u00B7 Recover \u00B7 Sleep better', img: 'ReferenceImagesReal/2df174c21bbc8db6cd5ce2d0b96b810e.jpg' },
];

const GOALS = [
  { icon: '\uD83D\uDD25', title: 'Lose Weight', desc: 'Burn calories, stay consistent, see results', goalParam: 'lose-weight' },
  { icon: '\uD83D\uDCAA', title: 'Build Muscle', desc: 'Progressive overload, structured volume', goalParam: 'build-muscle' },
  { icon: '\uD83E\uDDD8', title: 'Improve Mobility', desc: 'Move better, feel better, prevent injury', goalParam: 'improve-mobility' },
  { icon: '\u26A1', title: 'Stay Active', desc: 'Build healthy habits that actually stick', goalParam: 'stay-active' },
  { icon: '\uD83E\uDEC1', title: 'Reduce Stress', desc: 'Breathing, movement, mindful routines', goalParam: 'reduce-stress' },
];

const TESTIMONIALS = [
  {
    quote: '"I did the 50 pushups challenge and actually got paid. The daily recording keeps you honest \u2014 no way to cheat it. Best motivation I\'ve ever had."',
    name: 'Marco T.',
    meta: 'Challenge completed \u00B7 Berlin',
    avatar: '\uD83D\uDC68',
  },
  {
    quote: '"The morning routines are a game changer. 15 minutes before work and I feel completely different for the whole day."',
    name: 'Sophie K.',
    meta: 'Morning routines \u00B7 London',
    avatar: '\uD83D\uDC69',
  },
  {
    quote: '"The 8-week program is exactly what I needed. Seeing my logged weights go up every week keeps me going like nothing else."',
    name: 'Lucas R.',
    meta: 'Following a program \u00B7 S\u00E3o Paulo',
    avatar: '\uD83E\uDDD1',
  },
];

const FAQ_ITEMS = [
  { q: 'Is Libo free?', a: 'Libo offers a free tier with access to workouts, exercises, and basic tracking. Pro unlocks premium programs, advanced analytics, and money challenges.' },
  { q: 'What equipment do I need?', a: 'None — or everything. Libo has 258 bodyweight exercises for home, 411 gym exercises, and 49 mobility moves. Filter by what you have available.' },
  { q: 'How do the money challenges work?', a: 'Join a 30-day challenge (e.g., 50 pushups daily), record yourself completing the reps each day, share to your stories, and cash out real money when you finish. Limited spots per challenge.' },
  { q: 'Can I build my own workouts?', a: 'Yes. The Custom Builder lets you pick from 718 exercises, set your own sets, reps, and rest times, then save and reuse your workouts anytime.' },
  { q: 'Is Libo available on Android?', a: 'Libo is launching on iOS first. Android is on the roadmap — join the waitlist and we\'ll notify you when it\'s available.' },
  { q: 'How is Libo different from other fitness apps?', a: 'Libo combines a massive exercise library, structured programs, progress tracking, and real cash challenges in one app — with a premium dark UI that stays out of your way. No ads, no clutter.' },
  { q: 'Can I follow structured programs?', a: 'Yes. Libo includes multi-week programs designed for specific goals — muscle building, fat loss, mobility, and more. Follow the plan, log your progress, and see real results.' },
  { q: 'Does Libo track my progress?', a: 'Every set, rep, and weight is logged. Libo tracks your workout history, personal records, streaks, and shows your progress over time with clear charts.' },
];

const TRUST_STATS = [
  { num: '718', label: 'Exercises', sub: 'Gym, home & mobility' },
  { num: '140', label: 'Workouts', sub: 'Ready to follow' },
  { num: '4.9', label: 'Beta Rating', sub: 'From early testers' },
  { num: '50+', label: 'Beta Testers', sub: 'And counting' },
];

const NAV_SECTIONS = ['features', 'rewards', 'workouts', 'goals'] as const;

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
  const [formMsg, setFormMsg] = useState('No spam. Only when Libo launches.');
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
  const heroExercises = useCountUp(718, heroBottomView.inView);
  const heroWorkouts = useCountUp(140, heroBottomView.inView);
  const statExercises = useCountUp(718, statsView.inView);
  const statWorkouts = useCountUp(140, statsView.inView);
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
        setFormMsg("Welcome! We'll notify you when Libo launches.");
      } else if (error.code === '23505') {
        setFormSuccess(true);
        setEmail('');
        setFormMsg("You're already on the waitlist! We'll be in touch.");
      } else {
        setFormError(true);
        setFormMsg('Something went wrong. Please try again.');
      }
    } catch {
      setFormError(true);
      setFormMsg('Connection error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [email]);

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
        aria-label="Navigation menu"
      >
        <button
          className="mobile-menu-close"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close menu"
        >
          &#10005;
        </button>
        <a href="#features" onClick={(e) => handleNavClick(e, 'features')}>Features</a>
        <a href="#rewards" onClick={(e) => handleNavClick(e, 'rewards')}>Rewards</a>
        <a href="#workouts" onClick={(e) => handleNavClick(e, 'workouts')}>Workouts</a>
        <a href="#goals" onClick={(e) => handleNavClick(e, 'goals')}>Goals</a>
        <Link to="/exercises" onClick={() => setMobileMenuOpen(false)}>Exercise Library</Link>
        <Link to="/workouts" onClick={() => setMobileMenuOpen(false)}>Workouts</Link>
        <Link to="/blog" onClick={() => setMobileMenuOpen(false)}>Blog</Link>
        <Link to="/onboarding" onClick={() => setMobileMenuOpen(false)}>Get Early Access</Link>
      </div>

      {/* ── NAV ── */}
      <nav className={`landing-nav${navScrolled ? ' scrolled' : ''}`} aria-label="Main navigation">
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
                  {id.charAt(0).toUpperCase() + id.slice(1)}
                </a>
              </li>
            ))}
            <li className="nav-sep" aria-hidden="true" role="separator" />
            <li><Link to="/exercises" className={`load-stagger${loaded ? ' loaded' : ''}`} style={{ transitionDelay: '0.3s' }}>Exercises</Link></li>
            <li><Link to="/workouts" className={`load-stagger${loaded ? ' loaded' : ''}`} style={{ transitionDelay: '0.35s' }}>Workouts</Link></li>
            <li><Link to="/blog" className={`load-stagger${loaded ? ' loaded' : ''}`} style={{ transitionDelay: '0.4s' }}>Blog</Link></li>
            <li aria-hidden="true" style={{ position: 'absolute' }}>
              <div className="nav-indicator" ref={navIndicatorRef} />
            </li>
          </ul>
          <div className="nav-right">
            <Link
              to="/onboarding"
              className="btn-nav"
            >
              Get Started
            </Link>
            <button
              className="nav-hamburger"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Toggle menu"
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
              <span className="label">Coming Soon &mdash; Join the Waitlist</span>
            </div>
            <h1 className="hero-headline display display-xl">
              <span className={`line-1 clip-reveal${heroRevealed ? ' revealed' : ''}`} style={{ transitionDelay: '0.2s' }}>Train</span>
              <span className={`line-2 clip-reveal${heroRevealed ? ' revealed' : ''}`} style={{ transitionDelay: '0.35s' }}>Anywhere.</span>
              <span className={`line-3 clip-reveal${heroRevealed ? ' revealed' : ''}`} style={{ transitionDelay: '0.5s' }}>Anytime.</span>
            </h1>
            <a
              href="#cta"
              className={`hero-cta-btn${ctaVisible ? ' cta-pulse' : ''}`}
              style={{ opacity: ctaVisible ? 1 : 0, transition: 'opacity 0.4s ease' }}
              onClick={(e) => handleNavClick(e, 'cta')}
            >
              Join the Waitlist &rarr;
            </a>
          </div>
          <div className={`hero-phones hero-image-reveal${heroRevealed ? ' revealed' : ''}`}>
            <div className="hero-phone hero-phone--left">
              <div className="hero-phone__frame">
                <div className="hero-phone__screen">
                  <img src="/mockups/explore.png" alt="Libo Explore tab showing 140 workouts" loading="eager" />
                </div>
              </div>
            </div>
            <div className="hero-phone hero-phone--center">
              <div className="hero-phone__frame">
                <div className="hero-phone__screen">
                  <img src="/mockups/home.png" alt="Libo Home tab with today's workout" loading="eager" />
                </div>
              </div>
            </div>
            <div className="hero-phone hero-phone--right">
              <div className="hero-phone__frame">
                <div className="hero-phone__screen">
                  <img src="/mockups/player.png" alt="Libo workout player mid-session" loading="eager" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-bottom" ref={heroBottomView.ref} style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="hero-bottom-cell">
            <div className="hero-bottom-num">{heroExercises}</div>
            <div className="hero-bottom-lbl">Exercises</div>
          </div>
          <div className="hero-bottom-cell">
            <div className="hero-bottom-num">{heroWorkouts}</div>
            <div className="hero-bottom-lbl">Workouts</div>
          </div>
        </div>

        <div className={`scroll-indicator${scrollIndicatorVisible ? ' visible' : ''}`}>
          <span>Scroll to explore</span>
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
            <div className="stats-strip-label">Exercises</div>
          </div>
          <div data-reveal="fade-up" data-delay="0.1">
            <div className="stats-strip-num">{statWorkouts}</div>
            <div className="stats-strip-label">Workouts</div>
          </div>
          <div data-reveal="fade-up" data-delay="0.2">
            <div className="stats-strip-num">{statFormats}</div>
            <div className="stats-strip-label">Training Formats</div>
          </div>
          <div data-reveal="fade-up" data-delay="0.3" className="stats-hide-mobile">
            <div className="stats-strip-num">0 kg</div>
            <div className="stats-strip-label">Equipment Required</div>
          </div>
        </div>
      </div>

      {/* ── STATEMENT ── */}
      <div className="statement-wrapper">
        <div className="statement">
          <p className="statement-text">
            <span className="dim" data-reveal="fade-up" data-delay="0">One club.</span><br />
            <span className="bright" data-reveal="fade-up" data-delay="0.15" style={{ display: 'inline-block' }}>Every format.</span><br />
            <span className="dim" data-reveal="fade-up" data-delay="0.3" style={{ display: 'inline-block' }}>Every location.</span><br />
            <span className="accent highlight-swipe" data-reveal="fade-up" data-delay="0.45" style={{ display: 'inline-block' }}>Every goal.</span>
          </p>
          <p className="body-lg statement-body" data-reveal="fade-up" data-delay="0.6">
            Libo is the training club built for real life &mdash; home, gym, office, or anywhere in between. No excuses. Just results.
          </p>
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section className="features-section" id="features">
        <div className="features-header reveal">
          <div>
            <div className="label label-spaced">What&#39;s Inside</div>
            <h2 className="display display-md font-display">Everything<br />you need.</h2>
          </div>
          <p className="body-md text-narrow">
            718 exercises &middot; 140 workouts &middot; 4 challenge programs. Every training format, from barbell strength to breathing and morning routines.
          </p>
        </div>
        <div className="features-grid" ref={featuresGridRef}>
          {FEATURES.map((f, i) => (
            <div
              key={f.num}
              className={`feature-item reveal${i % 3 === 1 ? ' reveal-delay-1' : i % 3 === 2 ? ' reveal-delay-2' : ''}`}
            >
              <div className="feature-num">{f.num}</div>
              <span className="feature-icon">{f.icon}</span>
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
          src="/ReferenceImagesReal/1933bd503955db5451058dd0bcae5740.jpg"
          alt="Strength training"
          loading="lazy"
          style={{ objectPosition: 'center 30%' }}
        />
        <div
          className="photo-break-overlay"
          style={{
            background: 'linear-gradient(to right,rgba(0,0,0,0.72) 0%,rgba(0,0,0,0.2) 50%,transparent 100%)',
          }}
        >
          <div>
            <div className="label label-spaced" style={{ color: 'var(--accent)' }}>718 Exercises</div>
            <h2 className="display display-md font-display text-narrow">
              Every movement.<br />Every muscle.<br /><span style={{ color: 'var(--accent)' }}>One app.</span>
            </h2>
          </div>
        </div>
      </div>

      {/* ── REWARDS ── */}
      <section className="rewards-section" id="rewards">
        <div className="rewards-inner">
          <div className="rewards-left reveal">
            <div className="label label-spaced">Money Challenges</div>
            <h2 className="display display-md font-display">
              Your reps<br />pay <span className="accent-text">real cash.</span>
            </h2>
            <p className="body-md text-narrow" style={{ marginTop: 28, lineHeight: 1.7 }}>
              30 days. Daily reps. Post the proof. Cash out. No points, no gift cards -- just money in your pocket.
            </p>
            <div className="rewards-chips">
              <span className="rewards-chip">Real Cash Payouts</span>
              <span className="rewards-chip">30-Day Streaks</span>
              <span className="rewards-chip">Limited Spots</span>
            </div>
          </div>
          <div className="rewards-right reveal reveal-delay-1">
            <div className="rewards-gradient-card">
              <div className="rewards-glass-badge">30-Day Challenge</div>
              <div className="rewards-big-stat" ref={rewardsStatView.ref}>
                &euro;{rewardsStat}
              </div>
              <div className="rewards-challenge-name font-display">50 Pushups x 30 Days</div>
              <div className="rewards-challenge-sub">Complete daily reps, record yourself, share to stories</div>
              <div className="rewards-flow">
                <div className="rewards-flow-step">
                  <div className="rewards-flow-icon">{'\uD83D\uDCAA'}</div>
                  <div className="rewards-flow-label">Do Reps</div>
                </div>
                <div className="rewards-flow-arrow">&rarr;</div>
                <div className="rewards-flow-step">
                  <div className="rewards-flow-icon">{'\uD83D\uDCF9'}</div>
                  <div className="rewards-flow-label">Record</div>
                </div>
                <div className="rewards-flow-arrow">&rarr;</div>
                <div className="rewards-flow-step">
                  <div className="rewards-flow-icon">{'\uD83D\uDCF2'}</div>
                  <div className="rewards-flow-label">Share</div>
                </div>
                <div className="rewards-flow-arrow">&rarr;</div>
                <div className="rewards-flow-step">
                  <div className="rewards-flow-icon accent-glow">{'\uD83D\uDCB0'}</div>
                  <div className="rewards-flow-label accent-label">Cash Out</div>
                </div>
              </div>
              <div className="rewards-spots">
                <span className="rewards-spots-dot" />
                37 of 50 spots taken
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
              <div className="label label-spaced">Training Formats</div>
              <h2 className="display display-md font-display">Built for<br />every moment.</h2>
            </div>
            <p className="body-md text-narrow">
              Every format, every location, every time of day &mdash; covered.
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
            <div className="label">Personalised For You</div>
            <h2 className="display display-md font-display">
              One app. Every <span className="accent-text">goal.</span>
            </h2>
            <p className="goals-body">
              Tell Libo what you want. We build a plan around your goal, your fitness level, and your available equipment.
            </p>
          </div>
          <div className="goal-list reveal reveal-delay-1">
            {GOALS.map((goal) => (
              <Link key={goal.title} to={`/onboarding?goal=${goal.goalParam}`} className="goal-row">
                <span className="goal-row-icon">{goal.icon}</span>
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
      <div className="photo-break" style={{ height: 500 }}>
        <img
          src="/ReferenceImagesReal/b346e6c8398a7ce928f973f0948c5c17.jpg"
          alt="Active training"
          loading="lazy"
          style={{ objectPosition: 'center 40%' }}
        />
        <div className="photo-break-overlay-bottom">
          <p className="display display-sm font-display text-narrow">
            No excuses. Just results.
          </p>
        </div>
      </div>

      {/* ── SOCIAL PROOF ── */}
      <div className="proof-wrapper">
        <section className="proof-section" id="proof">
          <div className="reveal">
            <div className="label label-spaced">Early Feedback</div>
            <h2 className="display display-md font-display">People love<br />training with Libo.</h2>
          </div>
          <div className="proof-grid">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={t.name}
                className="proof-card reveal-card"
                data-reveal="fade-up"
                data-delay={String(i * 0.15)}
              >
                <div className="proof-stars">
                  {[...Array(5)].map((_, j) => (
                    <span key={j} className="star-animate">{'\u2605'}</span>
                  ))}
                </div>
                <p className="proof-quote">{t.quote}</p>
                <div className="proof-author">
                  <div className="proof-avatar">{t.avatar}</div>
                  <div>
                    <div className="proof-name">{t.name}</div>
                    <div className="proof-meta">{t.meta}</div>
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
            <div className="label label-spaced">Trusted by Athletes</div>
            <h2 className="display display-sm font-display">The numbers speak.</h2>
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
              <span>Available on iOS</span>
            </div>
            <div className="trust-badge">
              <span className="trust-badge-stars">{'★★★★★'}</span>
              <span>4.9 from beta testers</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="faq-section" id="faq">
        <div className="faq-inner">
          <div className="faq-header reveal">
            <div>
              <div className="label label-spaced">FAQ</div>
              <h2 className="display display-md font-display">Frequently<br />asked.</h2>
            </div>
            <p className="body-md text-narrow">
              Everything you need to know about Libo before you join.
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
              <div className="label label-spaced">From the Blog</div>
              <h2 className="display display-sm font-display">Guides &amp; insights.</h2>
            </div>
            <Link to="/blog" className="blog-preview-link">
              See all posts &rarr;
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
                <div className="blog-preview-emoji" aria-hidden="true">{article.heroEmoji}</div>
                <div className="blog-preview-cat">{article.category}</div>
                <h3 className="blog-preview-title">{article.title}</h3>
                <p className="blog-preview-excerpt">{article.excerpt}</p>
                <div className="blog-preview-meta">{article.readTime} min read</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section" id="cta">
        <div className="reveal">
          <div className="label cta-label">Join the Waitlist</div>
          <h2 className="display display-lg font-display">Be first.<br />Train better.</h2>
          <p className="cta-sub">
            Libo is coming soon. Join the waitlist and get early access plus an exclusive launch offer.
          </p>
          <form className="email-form" onSubmit={handleSubmit}>
            <label htmlFor="emailInput" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
              Email address
            </label>
            <input
              className="email-input"
              type="email"
              id="emailInput"
              placeholder="Enter your email address"
              required
              aria-label="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              className="btn-cta"
              type="submit"
              disabled={submitting || formSuccess}
              style={formSuccess ? { background: '#1a1a1a' } : undefined}
            >
              {submitting ? 'Joining...' : formSuccess ? (
                <>
                  <svg width="16" height="12" viewBox="0 0 16 12" fill="none" style={{ verticalAlign: 'middle', marginRight: 6 }}>
                    <path d="M1 6L6 11L15 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 22, strokeDashoffset: 0, animation: 'checkDraw 0.4s ease forwards' }} />
                  </svg>
                  You&#39;re on the list!
                </>
              ) : 'Join \u2192'}
            </button>
          </form>
          <p className={`form-msg${formError ? ' error' : ''}`}>{formMsg}</p>
        </div>
        <div className="store-row reveal">
          <a href="https://apps.apple.com" className="store-btn" aria-label="Download on App Store">
            <svg width="20" height="24" viewBox="0 0 20 24" fill="none" style={{ flexShrink: 0 }}>
              <path d="M16.47 12.2c-.03-3.1 2.53-4.59 2.64-4.66-1.44-2.1-3.68-2.39-4.47-2.42-1.9-.19-3.72 1.12-4.69 1.12-.97 0-2.46-1.1-4.05-1.07-2.08.03-4 1.21-5.08 3.08-2.17 3.76-.55 9.33 1.56 12.38 1.03 1.5 2.27 3.17 3.89 3.11 1.56-.06 2.15-1.01 4.03-1.01 1.88 0 2.42 1.01 4.07.98 1.68-.03 2.74-1.52 3.76-3.03 1.19-1.74 1.68-3.42 1.71-3.51-.04-.02-3.28-1.26-3.31-4.97h-.06z" fill="white" />
              <path d="M13.4 3.27C14.24 2.24 14.82.87 14.67-.5c-1.17.05-2.6.78-3.44 1.77-.75.87-1.42 2.27-1.24 3.61 1.31.1 2.65-.67 3.41-1.61z" fill="white" />
            </svg>
            <div><small>Coming Soon on</small><strong>App Store</strong></div>
          </a>
        </div>
      </section>

      </main>
      <SiteFooter />
    </>
  );
}
