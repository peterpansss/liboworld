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
