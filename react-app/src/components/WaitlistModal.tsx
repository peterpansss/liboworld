import { useEffect, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useWaitlistSubmit } from '../hooks/useWaitlistSubmit';
import type { WaitlistSource } from '../hooks/useWaitlistSubmit';
import './WaitlistModal.css';

type Props = {
  open: boolean;
  onClose: () => void;
  variant?: 'generic' | 'challenge';
};

export default function WaitlistModal({ open, onClose, variant = 'generic' }: Props) {
  const { t } = useTranslation();
  const ns = variant === 'challenge' ? 'challengeWaitlist' : 'waitlist';
  const source: WaitlistSource =
    variant === 'challenge' ? 'challenge_waitlist' : 'homepage_waitlist';
  const { email, setEmail, status, errorMessage, submit, reset } = useWaitlistSubmit(source);
  const headingId = useId();

  const handleClose = () => {
    reset();
    onClose();
  };

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const showForm = status === 'idle' || status === 'submitting' || status === 'error';

  const backdropClasses = ['waitlist-modal-backdrop'];
  if (variant === 'challenge') backdropClasses.push('waitlist-modal--challenge');

  return (
    <div
      className={backdropClasses.join(' ')}
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="waitlist-modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="waitlist-modal-close"
          aria-label="Close"
          onClick={handleClose}
        >
          ×
        </button>

        {showForm && (
          <>
            <h2 id={headingId} className="font-display waitlist-modal-heading">
              {t(`${ns}.modalHeading`)}
            </h2>
            <p className="waitlist-modal-subhead">{t(`${ns}.modalSubhead`)}</p>
            <form onSubmit={submit} className="waitlist-modal-form">
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t(`${ns}.emailPlaceholder`)}
                className="waitlist-modal-input"
                disabled={status === 'submitting'}
              />
              <button
                type="submit"
                className="waitlist-modal-submit"
                disabled={status === 'submitting'}
              >
                {status === 'submitting' ? '…' : t(`${ns}.submitLabel`)}
              </button>
              {status === 'error' && (
                <div className="waitlist-modal-error" role="alert">
                  {errorMessage}
                </div>
              )}
            </form>
            <p className="waitlist-modal-disclosure">{t(`${ns}.disclosure`)}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <h2 id={headingId} className="font-display waitlist-modal-heading">
              {t(`${ns}.successHeading`)}
            </h2>
            <p className="waitlist-modal-success-body">{t(`${ns}.successBody`)}</p>
          </>
        )}

        {status === 'duplicate' && (
          <>
            <h2 id={headingId} className="font-display waitlist-modal-heading">
              {t(`${ns}.modalHeading`)}
            </h2>
            <p className="waitlist-modal-success-body">{t(`${ns}.duplicateMessage`)}</p>
          </>
        )}
      </div>
    </div>
  );
}
