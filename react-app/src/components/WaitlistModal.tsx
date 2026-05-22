import { useEffect, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useWaitlistSubmit } from '../hooks/useWaitlistSubmit';
import './WaitlistModal.css';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function WaitlistModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const { email, setEmail, status, errorMessage, submit, reset } = useWaitlistSubmit();
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

  return (
    <div
      className="waitlist-modal-backdrop"
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
              {t('waitlist.modalHeading')}
            </h2>
            <p className="waitlist-modal-subhead">{t('waitlist.modalSubhead')}</p>
            <form onSubmit={submit} className="waitlist-modal-form">
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('waitlist.emailPlaceholder')}
                className="waitlist-modal-input"
                disabled={status === 'submitting'}
              />
              <button
                type="submit"
                className="waitlist-modal-submit"
                disabled={status === 'submitting'}
              >
                {status === 'submitting' ? '…' : t('waitlist.submitLabel')}
              </button>
              {status === 'error' && (
                <div className="waitlist-modal-error" role="alert">
                  {errorMessage}
                </div>
              )}
            </form>
            <p className="waitlist-modal-disclosure">{t('waitlist.disclosure')}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <h2 id={headingId} className="font-display waitlist-modal-heading">
              {t('waitlist.successHeading')}
            </h2>
            <p className="waitlist-modal-success-body">{t('waitlist.successBody')}</p>
          </>
        )}

        {status === 'duplicate' && (
          <>
            <h2 id={headingId} className="font-display waitlist-modal-heading">
              {t('waitlist.modalHeading')}
            </h2>
            <p className="waitlist-modal-success-body">{t('waitlist.duplicateMessage')}</p>
          </>
        )}
      </div>
    </div>
  );
}
