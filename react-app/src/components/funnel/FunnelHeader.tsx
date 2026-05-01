import { Link } from 'react-router-dom';

/**
 * Minimal header for funnel pages — just the Libo logo, no menu.
 *
 * Funnel conversion principle: remove all exit paths. We keep ONLY
 * the brand mark (linked to /) so cold ad traffic recognizes who
 * they're buying from, but we don't list other site sections that
 * would tempt them to bounce. The Libo Logo is the one allowed escape.
 */
export default function FunnelHeader() {
  return (
    <header
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Link
        to="/"
        aria-label="Libo home"
        style={{ display: 'inline-flex', textDecoration: 'none' }}
      >
        <img
          src="/brand/logo_options/option_A_wordmark_ascending_dots_transparent.png"
          alt="Libo"
          style={{
            height: 28,
            width: 'auto',
            display: 'block',
            opacity: 0.95,
            filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))',
          }}
        />
      </Link>
    </header>
  );
}
