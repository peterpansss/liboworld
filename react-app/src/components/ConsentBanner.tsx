import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ACCEPT_ALL,
  DENY_ALL,
  getConsent,
  setConsent,
  onConsentChange,
  type ConsentState,
} from '../lib/consent';
import './ConsentBanner.css';

/**
 * Cookie consent modal — the first thing a visitor deals with.
 *
 * Why a centred modal with a scrim and not a dismissible strip: until this
 * decision is made, nothing that tracks the visitor is allowed to run (see
 * lib/consent.ts), so the decision is the page's first job, not a footnote.
 *
 * Rules baked into the markup, all of them load-bearing:
 *   - "Reject all" and "Accept all" are the same size, the same typography and
 *     sit in the same row. A de-emphasised reject is the specific dark pattern
 *     regulators fine, and it is not how this brand talks to people either.
 *   - "Manage preferences" is deliberately quieter — it is an extra, not the
 *     escape hatch from a rigged pair of buttons.
 *   - No box is ticked for you. The per-category switches start off, every
 *     time, including after the modal is re-opened from the footer.
 *   - Escape closes the dialog and consents to NOTHING: no record is written,
 *     nothing loads, and the next page load (or the footer's "Cookie settings")
 *     asks again.
 */
export default function ConsentBanner() {
  const { t } = useTranslation();
  const [stored, setStored] = useState<ConsentState | null>(() => getConsent());
  // Escape-dismissed for this mount only. Never persisted: silence is not
  // consent, and it must not harden into one.
  const [dismissed, setDismissed] = useState(false);
  const [managing, setManaging] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(
    () =>
      onConsentChange((next) => {
        setStored(next);
        if (next === null) {
          // Re-opened from the footer: back to a blank slate, nothing pre-ticked.
          setDismissed(false);
          setManaging(false);
          setAnalytics(false);
          setMarketing(false);
        }
      }),
    [],
  );

  const open = stored === null && !dismissed;

  const choose = useCallback((state: ConsentState) => {
    setConsent(state);
  }, []);

  // Scroll lock + Escape + focus trap, for as long as the dialog is up.
  useEffect(() => {
    if (!open) return;

    const node = dialogRef.current;
    node?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setDismissed(true);
        return;
      }
      if (e.key !== 'Tab' || !node) return;
      // Everything inside the dialog is conditionally rendered rather than
      // hidden, so "present in the DOM" is the same as "reachable" here.
      const focusable = Array.from(
        node.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) {
        e.preventDefault();
        node.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (activeEl === first || activeEl === node)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="consent-scrim" role="presentation" data-testid="consent-scrim">
      <div
        className="consent-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        ref={dialogRef}
        tabIndex={-1}
      >
        <h2 id={titleId} className="consent-modal__title font-display">
          {t('consent.title', { defaultValue: 'Your call on cookies' })}
        </h2>
        <p id={descId} className="consent-modal__intro">
          {t('consent.intro', {
            defaultValue:
              "Nothing that tracks you runs until you say so. Pick what you're ok with — you can change it whenever.",
          })}
        </p>

        <ul className="consent-modal__categories">
          <li className="consent-modal__category">
            <div className="consent-modal__categoryHead">
              <span className="consent-modal__categoryName">
                {t('consent.necessaryLabel', { defaultValue: 'Necessary' })}
              </span>
              <span className="consent-modal__always">
                {t('consent.necessaryAlways', { defaultValue: 'Always on' })}
              </span>
            </div>
            <p className="consent-modal__categoryBody">
              {t('consent.necessaryBody', {
                defaultValue:
                  'Keeps the site working and remembers this choice. No tracking, no third parties.',
              })}
            </p>
          </li>

          <li className="consent-modal__category">
            <div className="consent-modal__categoryHead">
              <span className="consent-modal__categoryName">
                {t('consent.analyticsLabel', { defaultValue: 'Analytics' })}
              </span>
              {managing && (
                <input
                  type="checkbox"
                  className="consent-modal__switch"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  aria-label={t('consent.analyticsLabel', { defaultValue: 'Analytics' })}
                />
              )}
            </div>
            <p className="consent-modal__categoryBody">
              {t('consent.analyticsBody', {
                defaultValue:
                  'Google Analytics 4 (Google). Counts which pages get visited and on what kind of device, and sets cookies to do it.',
              })}
            </p>
          </li>

          <li className="consent-modal__category">
            <div className="consent-modal__categoryHead">
              <span className="consent-modal__categoryName">
                {t('consent.marketingLabel', { defaultValue: 'Marketing' })}
              </span>
              {managing && (
                <input
                  type="checkbox"
                  className="consent-modal__switch"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                  aria-label={t('consent.marketingLabel', { defaultValue: 'Marketing' })}
                />
              )}
            </div>
            <p className="consent-modal__categoryBody">
              {t('consent.marketingBody', {
                defaultValue:
                  'Meta Pixel (Meta). Tells us which ads actually lead to sign-ups, sets cookies, and shares your visit with Meta.',
              })}
            </p>
          </li>
        </ul>

        {/* Equal size, equal weight, same row — see the component comment. */}
        <div className="consent-modal__actions">
          <button
            type="button"
            className="consent-modal__btn consent-modal__btn--reject"
            onClick={() => choose(DENY_ALL)}
          >
            {t('consent.reject', { defaultValue: 'Reject all' })}
          </button>
          <button
            type="button"
            className="consent-modal__btn consent-modal__btn--accept"
            onClick={() => choose(ACCEPT_ALL)}
          >
            {t('consent.accept', { defaultValue: 'Accept all' })}
          </button>
        </div>

        {managing ? (
          <button
            type="button"
            className="consent-modal__secondary"
            onClick={() => choose({ analytics, marketing })}
          >
            {t('consent.save', { defaultValue: 'Save my choices' })}
          </button>
        ) : (
          <button
            type="button"
            className="consent-modal__manage"
            onClick={() => setManaging(true)}
            aria-expanded={managing}
          >
            {t('consent.manage', { defaultValue: 'Manage preferences' })}
          </button>
        )}

        <p className="consent-modal__note">
          {t('consent.note', {
            defaultValue:
              'Nothing is ticked for you. Change your mind any time with "Cookie settings" in the footer.',
          })}{' '}
          <Link to="/privacy" className="consent-modal__link">
            {t('consent.privacyLink', { defaultValue: 'How we handle your data' })}
          </Link>
        </p>
      </div>
    </div>
  );
}
