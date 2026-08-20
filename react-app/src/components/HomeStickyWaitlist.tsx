import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useWaitlistSubmit } from '../hooks/useWaitlistSubmit';
import './HomeStickyWaitlist.css';

/**
 * Mobile-only sticky waitlist bar for the home page (PRELAUNCH-WAITLIST).
 *
 * The hero capture scrolls out of view within one swipe, and the bottom block
 * is ~10 sections down — on a phone the free ask was effectively unreachable
 * for the whole middle of the page. Same free ask, same `homepage_waitlist`
 * source: it must never open payment.
 *
 * Its own instance of the hook, so it has its own `status`: once this bar has
 * been used it hides itself rather than re-asking someone who just joined.
 */
export default function HomeStickyWaitlist() {
  const { t } = useTranslation();
  const { email, setEmail, status, errorMessage, submit } = useWaitlistSubmit('homepage_waitlist');
  const [scrolled, setScrolled] = useState(false);
  const rafRef = useRef<number | null>(null);
  const inputId = useId();

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        setScrolled(window.scrollY > 400);
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const joined = status === 'success' || status === 'duplicate';
  if (joined) return null;

  const visible = scrolled;

  return (
    <div
      className={`home-sticky-wl ${visible ? 'is-visible' : ''}`}
      aria-hidden={!visible}
    >
      <form className="home-sticky-wl__form" onSubmit={submit as (e: FormEvent) => void}>
        <label className="home-sticky-wl__label" htmlFor={inputId}>
          {t('relaunchHome.waitlist.label', { defaultValue: 'Email address' })}
        </label>
        <input
          id={inputId}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('relaunchHome.waitlist.placeholder', { defaultValue: 'Your email' })}
          className="home-sticky-wl__input"
          disabled={status === 'submitting' || !visible}
          tabIndex={visible ? undefined : -1}
          autoComplete="email"
        />
        <button
          type="submit"
          className="home-sticky-wl__btn"
          disabled={status === 'submitting' || !visible}
          tabIndex={visible ? undefined : -1}
        >
          {status === 'submitting'
            ? t('relaunchHome.waitlist.buttonBusy', { defaultValue: 'Sending…' })
            : t('relaunchHome.waitlist.stickyButton', { defaultValue: 'Join' })}
        </button>
      </form>
      {status === 'error' && (
        <p className="home-sticky-wl__error" role="alert">{errorMessage}</p>
      )}
    </div>
  );
}
