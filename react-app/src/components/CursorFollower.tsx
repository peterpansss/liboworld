import { useEffect, useRef } from 'react';
import './CursorFollower.css';

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/**
 * The "libo dot" — a small lime dot that trails the cursor with easing and
 * grows over interactive elements. Ported verbatim (behaviour + easing) from
 * the original landing page so the relaunch keeps the same signature feel,
 * mounted globally so it works on every route. Disabled on touch devices and
 * when the user prefers reduced motion.
 */
export default function CursorFollower() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isDesktop =
      typeof window !== 'undefined' &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isDesktop || prefersReducedMotion) return;

    const cursor = cursorRef.current;
    if (!cursor) return;

    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;
    let visible = false;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!visible) {
        visible = true;
        cursor.classList.add('visible');
      }
    };
    const onLeave = () => {
      visible = false;
      cursor.classList.remove('visible');
    };

    const hoverables = 'a, button, input, textarea, select, label, [role="button"]';
    const onOver = (e: MouseEvent) => {
      if ((e.target as Element)?.closest?.(hoverables)) cursor.classList.add('hover');
    };
    const onOut = (e: MouseEvent) => {
      if ((e.target as Element)?.closest?.(hoverables)) cursor.classList.remove('hover');
    };

    const update = () => {
      cursorX = lerp(cursorX, mouseX, 0.15);
      cursorY = lerp(cursorY, mouseY, 0.15);
      cursor.style.left = `${cursorX}px`;
      cursor.style.top = `${cursorY}px`;
      raf = requestAnimationFrame(update);
    };

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

  return <div className="cursor-follower" ref={cursorRef} aria-hidden="true" />;
}
