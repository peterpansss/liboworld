import { useId } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWaitlistSubmit } from '../hooks/useWaitlistSubmit';

/**
 * The site's email capture (MASTER-HANDOFF §14, HANDOFF-V2 "Funnel vs.
 * waitlist split"). Submitting is a FREE ask and always ends in a plain inline
 * confirmation — it must NEVER open payment. The Founding Member funnel is a
 * separate, explicitly-labelled link rendered below the confirmed state.
 *
 * `duplicate` is treated as success: the address is on the list either way and
 * telling someone "you already signed up" is a worse outcome than confirming.
 *
 * Lifted out of Landing.tsx for PRELAUNCH-WAITLIST: the home page now renders
 * it twice (hero + bottom block), so the input id has to be generated per
 * instance instead of hardcoded, or the two labels point at the same field.
 */
export default function WaitlistCapture({
  variant = 'final',
  className,
}: {
  variant?: 'hero' | 'final';
  className?: string;
}) {
  const { t } = useTranslation();
  const { email, setEmail, status, errorMessage, submit } = useWaitlistSubmit('homepage_waitlist');
  const joined = status === 'success' || status === 'duplicate';
  const inputId = useId();

  const rootClass = [
    'rh-wl',
    variant === 'hero' ? 'rh-hero-capture' : 'rh-wl--final',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (joined) {
    return (
      <div className={rootClass}>
        <div className="rh-wl-joined">
          <p className="rh-wl-confirm">
            {t('relaunchHome.waitlist.confirm', { defaultValue: "You're on the list ✓" })}
          </p>
          <p className="rh-wl-note">
            {t('relaunchHome.waitlist.confirmNote', { defaultValue: 'We email you at launch. No spam.' })}
          </p>
          <p className="rh-wl-footnote">
            <Link to="/join" viewTransition className="rh-accent-link">
              {t('relaunchHome.waitlist.fmFootnote', {
                defaultValue: 'Want in before launch? Become a Founding Member →',
              })}
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={rootClass}>
      <form className="rh-wl-form" onSubmit={submit as (e: FormEvent) => void}>
        <label className="rh-wl-label" htmlFor={inputId}>
          {t('relaunchHome.waitlist.label', { defaultValue: 'Email address' })}
        </label>
        <input
          id={inputId}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('relaunchHome.waitlist.placeholder', { defaultValue: 'Your email' })}
          className="rh-wl-input"
          disabled={status === 'submitting'}
          autoComplete="email"
        />
        <button type="submit" className="rh-wl-button" disabled={status === 'submitting'}>
          {status === 'submitting'
            ? t('relaunchHome.waitlist.buttonBusy', { defaultValue: 'Sending…' })
            : t('relaunchHome.waitlist.button', { defaultValue: 'Join the waitlist' })}
        </button>
      </form>
      {status === 'error' && (
        <p className="rh-wl-error" role="alert">{errorMessage}</p>
      )}
      {/* One line, not two — the target merges the note and the FM pointer,
          with the link inline and underlined. */}
      <p className="rh-wl-note">
        {t('relaunchHome.waitlist.noteMerged', {
          defaultValue: "No spam. One email at launch, that's it. Want in first? ",
        })}
        <Link to="/join" viewTransition className="rh-wl-inline-link">
          {t('relaunchHome.waitlist.fmInline', { defaultValue: 'Become a Founding Member →' })}
        </Link>
      </p>
      {/* The waitlist ask says nothing about the money. This is the one route
          from "give us your email" to the mechanic that earns it. */}
      <p className="rh-wl-challenge">
        <Link to="/cash-challenges" viewTransition className="rh-wl-inline-link">
          {t('relaunchHome.waitlist.challengeLink', {
            defaultValue: 'See how the cash challenge works →',
          })}
        </Link>
      </p>
    </div>
  );
}
