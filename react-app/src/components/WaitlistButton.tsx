import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import WaitlistModal from './WaitlistModal';
import './WaitlistButton.css';

type Props = {
  size?: 'hero' | 'inline';
  variant?: 'generic' | 'challenge';
  className?: string;
};

export default function WaitlistButton({
  size = 'hero',
  variant = 'generic',
  className,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const labelKey =
    variant === 'challenge' ? 'challengeWaitlist.buttonLabel' : 'waitlist.buttonLabel';

  const classes = ['waitlist-button', `waitlist-button--${size}`];
  if (variant === 'challenge') classes.push('waitlist-button--challenge');
  if (className) classes.push(className);

  return (
    <>
      <button
        type="button"
        className={classes.join(' ')}
        onClick={() => setOpen(true)}
      >
        {t(labelKey)} →
      </button>
      {createPortal(
        <WaitlistModal open={open} onClose={() => setOpen(false)} variant={variant} />,
        document.body,
      )}
    </>
  );
}
