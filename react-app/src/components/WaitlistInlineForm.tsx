import { useTranslation } from 'react-i18next';
import { useWaitlistSubmit } from '../hooks/useWaitlistSubmit';
import type { WaitlistSource } from '../hooks/useWaitlistSubmit';
import './WaitlistInlineForm.css';

type Props = {
  className?: string;
  variant?: 'generic' | 'challenge';
};

export default function WaitlistInlineForm({ className, variant = 'generic' }: Props) {
  const { t } = useTranslation();
  const ns = variant === 'challenge' ? 'challengeWaitlist' : 'waitlist';
  const source: WaitlistSource =
    variant === 'challenge' ? 'challenge_waitlist' : 'homepage_waitlist';
  const { email, setEmail, status, errorMessage, submit } = useWaitlistSubmit(source);

  const classes = ['waitlist-inline'];
  if (variant === 'challenge') classes.push('waitlist-inline--challenge');
  if (className) classes.push(className);

  if (status === 'success') {
    return (
      <div className={classes.join(' ')}>
        <h3 className="font-display waitlist-inline-success-heading">
          {t(`${ns}.successHeading`)}
        </h3>
        <p className="waitlist-inline-success-body">{t(`${ns}.successBody`)}</p>
      </div>
    );
  }

  if (status === 'duplicate') {
    return (
      <div className={classes.join(' ')}>
        <p className="waitlist-inline-success-body">{t(`${ns}.duplicateMessage`)}</p>
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
          placeholder={t(`${ns}.emailPlaceholder`)}
          className="waitlist-inline-input"
          disabled={status === 'submitting'}
        />
        <button
          type="submit"
          className="waitlist-inline-submit"
          disabled={status === 'submitting'}
        >
          {status === 'submitting' ? '…' : t(`${ns}.submitLabel`)}
        </button>
      </form>
      {status === 'error' && (
        <div className="waitlist-inline-error" role="alert">
          {errorMessage}
        </div>
      )}
      <p className="waitlist-inline-disclosure">{t(`${ns}.disclosure`)}</p>
    </div>
  );
}
