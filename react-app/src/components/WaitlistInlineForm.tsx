import { useTranslation } from 'react-i18next';
import { useWaitlistSubmit } from '../hooks/useWaitlistSubmit';
import './WaitlistInlineForm.css';

type Props = {
  className?: string;
};

export default function WaitlistInlineForm({ className }: Props) {
  const { t } = useTranslation();
  const { email, setEmail, status, errorMessage, submit } = useWaitlistSubmit();

  const classes = ['waitlist-inline'];
  if (className) classes.push(className);

  if (status === 'success') {
    return (
      <div className={classes.join(' ')}>
        <h3 className="font-display waitlist-inline-success-heading">
          {t('waitlist.successHeading')}
        </h3>
        <p className="waitlist-inline-success-body">{t('waitlist.successBody')}</p>
      </div>
    );
  }

  if (status === 'duplicate') {
    return (
      <div className={classes.join(' ')}>
        <p className="waitlist-inline-success-body">{t('waitlist.duplicateMessage')}</p>
      </div>
    );
  }

  return (
    <div className={classes.join(' ')}>
      <form onSubmit={submit} className="waitlist-inline-form">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('waitlist.emailPlaceholder')}
          className="waitlist-inline-input"
          disabled={status === 'submitting'}
        />
        <button
          type="submit"
          className="waitlist-inline-submit"
          disabled={status === 'submitting'}
        >
          {status === 'submitting' ? '…' : t('waitlist.submitLabel')}
        </button>
      </form>
      {status === 'error' && (
        <div className="waitlist-inline-error" role="alert">
          {errorMessage}
        </div>
      )}
      <p className="waitlist-inline-disclosure">{t('waitlist.disclosure')}</p>
    </div>
  );
}
