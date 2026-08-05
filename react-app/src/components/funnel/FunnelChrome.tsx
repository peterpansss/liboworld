import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LiboLogo from '../LiboLogo';
import './FunnelChrome.css';

/**
 * Chrome shared by every funnel page (/join, /cash-challenges/:tier,
 * /creator-program*). Deliberately different from the brand chrome:
 *
 * - lime context bar instead of the dismissible announcement bar
 * - centred logo that is NOT a link — funnels have one exit, the CTA
 * - minimal footer: legal only, no nav columns, no email capture
 *
 * See MASTER-HANDOFF §15/§16 and HANDOFF-V2-COMPLEMENT §B2/§B7.
 */

export function FunnelContextBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="funnel-context-bar">
      <span className="funnel-context-bar__spark" aria-hidden="true">⚡</span>
      <span className="funnel-context-bar__text">{children}</span>
      <span className="funnel-context-bar__spark" aria-hidden="true">⚡</span>
    </div>
  );
}

/**
 * Logo-only nav. The logo is intentionally unlinked (HANDOFF-V2 §B7). An
 * optional back link returns to the brand site — the only way out other than
 * converting.
 */
export function FunnelLogoNav({ backTo, backLabel }: { backTo?: string; backLabel?: string }) {
  return (
    <div className="funnel-nav">
      {backTo && (
        <Link to={backTo} className="funnel-nav__back">
          {/* nowrap so "← Back to program" can't wrap onto two lines */}
          <span className="funnel-nav__back-inner">← {backLabel}</span>
        </Link>
      )}
      <div className="funnel-nav__logo" aria-label="Libo">
        <LiboLogo />
      </div>
    </div>
  );
}

/** Legal-only footer. Never the brand footer, never an email capture. */
export function FunnelMinimalFooter({ note }: { note?: string }) {
  const { t } = useTranslation();
  return (
    <footer className="funnel-footer">
      <div className="funnel-footer__inner">
        <span className="funnel-footer__copy">
          {t('footer.copyrightTrainingClub', { defaultValue: '© 2026 Libo World · Training Club' })}
        </span>
        <div className="funnel-footer__legal">
          {/* Existing live legal routes — no new legal copy is created here. */}
          <Link to="/terms">{t('footer.termsAndConditions')}</Link>
          <Link to="/privacy">{t('footer.privacy')}</Link>
          {note && <span className="funnel-footer__note">{note}</span>}
        </div>
      </div>
    </footer>
  );
}

/**
 * Sticky bottom CTA, mobile only (hidden ≥768px in CSS). Rendered last so it
 * paints above page content without a z-index arms race.
 */
export function FunnelStickyCta({
  label,
  onClick,
  href,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
}) {
  return (
    <div className="funnel-sticky">
      {href ? (
        <a className="funnel-sticky__btn" href={href} onClick={onClick}>{label}</a>
      ) : (
        <button type="button" className="funnel-sticky__btn" onClick={onClick}>{label}</button>
      )}
    </div>
  );
}
