import { useEffect, useRef, useState } from 'react';

/**
 * Trigger when an element scrolls into view (one-shot).
 * Used to fire animations like count-up only once per visit.
 */
export function useInView<T extends HTMLElement = HTMLElement>(threshold = 0.3) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.unobserve(el);
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, inView };
}

/**
 * Count from 0 to target with ease-out, fired by `trigger`.
 * Returns the current rounded integer value.
 */
export function useCountUp(target: number, trigger: boolean, duration = 1600) {
  const [value, setValue] = useState(0);
  const counted = useRef(false);

  useEffect(() => {
    if (!trigger || counted.current) return;
    counted.current = true;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic — fast start, gentle land
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [trigger, target, duration]);

  return value;
}

/**
 * Scroll-triggered reveal hook for elements marked with `data-reveal`.
 * Adds the `revealed` class when the element enters the viewport.
 *
 * Mount this once per page in a useEffect; it auto-attaches to all
 * `[data-reveal]:not(.revealed)` descendants of the document.
 */
export function useRevealOnScroll() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const delay = parseFloat(el.dataset.revealDelay || '0');
            if (delay > 0) {
              el.style.transitionDelay = `${delay}s`;
            }
            el.classList.add('revealed');
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
    );

    document.querySelectorAll<HTMLElement>('[data-reveal]:not(.revealed)').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Run `cb` whenever the page jumps to an in-page anchor.
 *
 * Both reveal effects below are driven by approach — scroll position, or an
 * intersection callback. An anchor jump is a teleport: the user presses a CTA
 * and lands mid-page having never scrolled toward the destination, so
 * "reveal as it comes into view" has nothing to react to and the destination
 * can sit in its hidden pre-reveal state. This is what made the Founding
 * Member card invisible after pressing "Become a Founding Member".
 *
 * Fires on hashchange, and again once the scroll settles — a smooth jump is
 * still animating when hashchange fires, so measuring immediately reads the
 * old position. `scrollend` where supported, a short timeout otherwise.
 */
function onAnchorJump(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  let timer: ReturnType<typeof setTimeout> | undefined;

  const settle = () => {
    cb();
    if ('onscrollend' in window) {
      window.addEventListener('scrollend', cb, { once: true });
    } else {
      clearTimeout(timer);
      timer = setTimeout(cb, 400);
    }
  };

  window.addEventListener('hashchange', settle);
  return () => {
    window.removeEventListener('hashchange', settle);
    window.removeEventListener('scrollend', cb);
    clearTimeout(timer);
  };
}

/**
 * Continuous 0→1 scroll progress for an element, derived from its position
 * rather than accumulated from events — so scrolling back up walks the value
 * backwards for free. This is what `useInView` above cannot do: it calls
 * `unobserve` after the first intersection, which kills reversibility.
 *
 * `start`/`end` are viewport-height fractions. Defaults follow the reveal SPEC:
 * progress is 0 while the element's top sits at 85% of the viewport, 1 by 40%.
 *
 * Returns `enabled: false` under prefers-reduced-motion, and never attaches a
 * listener in that case — callers should render their static state.
 */
export function useScrollProgress<T extends HTMLElement = HTMLElement>(
  { start = 0.85, end = 0.4 }: { start?: number; end?: number } = {},
) {
  const ref = useRef<T>(null);
  const [progress, setProgress] = useState(0);
  const [enabled] = useState(() => !prefersReducedMotion());

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const vh = window.innerHeight || 1;
      const top = el.getBoundingClientRect().top / vh;
      // Above `start` → 0; below `end` → 1; linear in between.
      const raw = (start - top) / (start - end);
      setProgress(Math.min(1, Math.max(0, raw)));
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    // A CTA that jumps to an anchor produces no approach to measure.
    const stopAnchor = onAnchorJump(onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      stopAnchor();
    };
  }, [enabled, start, end]);

  return { ref, progress, enabled };
}

/**
 * Pop-in cards: adds `.popped` while the element is in view and removes it when
 * it leaves, so the effect replays in BOTH scroll directions (unlike
 * `useRevealOnScroll`, which is one-shot). `stagger` spaces siblings out by
 * index; the handoff calls for 110ms.
 *
 * Mount once per page. Under prefers-reduced-motion nothing is observed and
 * every target is marked popped immediately, so cards render in their final
 * state.
 */
export function usePopIn(selector = '[data-popin]', stagger = 110) {
  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>(selector));
    if (!targets.length) return;

    // No IntersectionObserver (jsdom, prerender, very old browsers) or reduced
    // motion → show everything in its final state. The animation is decoration;
    // the content must never depend on it.
    if (typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) {
      targets.forEach((el) => el.classList.add('popped'));
      return;
    }

    // Stagger is per-group, so cards in one row cascade but a later section
    // doesn't inherit a huge delay from its position in the document.
    const groups = new Map<Element | null, HTMLElement[]>();
    targets.forEach((el) => {
      const parent = el.parentElement;
      const list = groups.get(parent) || [];
      list.push(el);
      groups.set(parent, list);
    });
    groups.forEach((list) => {
      list.forEach((el, i) => {
        el.style.transitionDelay = `${(i * stagger) / 1000}s`;
      });
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle('popped', entry.isIntersecting);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    );
    targets.forEach((el) => observer.observe(el));

    // On an anchor jump, pop everything from the top of the document down to
    // the bottom of the destination outright. The observer alone isn't enough:
    // the stagger delay would drip the destination card in after the user is
    // already looking at it, and anything skipped over stays hidden if they
    // then scroll UP from the landing point.
    const stopAnchor = onAnchorJump(() => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      const cutoff = target.getBoundingClientRect().bottom + window.scrollY;
      targets.forEach((el) => {
        if (el.getBoundingClientRect().top + window.scrollY <= cutoff) {
          el.style.transitionDelay = '0s';
          el.classList.add('popped');
        }
      });
    });

    return () => {
      observer.disconnect();
      stopAnchor();
    };
  }, [selector, stagger]);
}
