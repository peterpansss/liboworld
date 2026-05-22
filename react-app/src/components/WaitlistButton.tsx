import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import WaitlistModal from './WaitlistModal';
import './WaitlistButton.css';

type Props = {
  variant?: 'hero' | 'inline';
  className?: string;
};

export default function WaitlistButton({ variant = 'hero', className }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const classes = ['waitlist-button', `waitlist-button--${variant}`];
  if (className) classes.push(className);

  return (
    <>
      <button
        type="button"
        className={classes.join(' ')}
        onClick={() => setOpen(true)}
      >
        {t('waitlist.buttonLabel')} →
      </button>
      {createPortal(
        <WaitlistModal open={open} onClose={() => setOpen(false)} />,
        document.body,
      )}
    </>
  );
}
