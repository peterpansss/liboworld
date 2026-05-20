import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppStoreBadge from './AppStoreBadge';
import { Dumbbell } from '../utils/icons';
import './WorkoutsAppCTA.css';

export default function WorkoutsAppCTA() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        setVisible(window.scrollY > 400);
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

  return (
    <div
      className={`workouts-app-cta ${visible ? 'is-visible' : ''}`}
      aria-hidden={!visible}
    >
      <span className="workouts-app-cta__icon" aria-hidden="true">
        <Dumbbell size={18} strokeWidth={2.25} />
      </span>
      <span className="workouts-app-cta__text">
        {t('workouts.appCta', { count: 140, defaultValue: 'Track all {{count}} workouts in the Libo app' })}
      </span>
      <AppStoreBadge className="workouts-app-cta__badge" />
    </div>
  );
}
