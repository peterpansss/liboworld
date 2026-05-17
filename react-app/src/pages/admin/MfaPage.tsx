import { useEffect, useState } from 'react';
import { MfaEnrolPanel } from '../../components/admin/MfaEnrolPanel';
import { getAdminMfaStatus, type AdminMfaStatus } from '../../lib/adminApi';
import { colors } from '../../theme';

// Route: /admin/mfa
// Wraps the existing MfaEnrolPanel scaffold. The page adds a status banner
// above the panel reflecting the grace-period state:
//   - must_enrol === true  → red banner: enrolment is required NOW
//   - 1 ≤ grace_days_remaining ≤ 7 → yellow banner: enrol in N days
//   - already enrolled → no banner (panel renders the "done" state)
//
// TODOs (deferred for min-viable scope):
//   - Recovery codes UI (10 single-use codes)
//   - "Trust this device" cookie (skip aal2 prompt for 30 days)
//   - Audit log of enrol/verify events
//   - SMS / push factor fallback
export const MFA_ROUTE_PATH = 'mfa';
export const MFA_ROUTE_FULL = '/admin/mfa';

export function MfaPage() {
  const [status, setStatus] = useState<AdminMfaStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getAdminMfaStatus();
        if (!cancelled) setStatus(s);
      } catch {
        // Banner is non-essential; the panel itself surfaces RPC errors.
        // Treat as "no banner" so we don't double-report.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const mustEnrol = status?.must_enrol === true;
  const graceDays = status?.grace_days_remaining;
  const urgentGrace =
    !mustEnrol &&
    typeof graceDays === 'number' &&
    graceDays >= 1 &&
    graceDays <= 7 &&
    !status?.mfa_enrolled;

  return (
    <div style={{ maxWidth: 560 }}>
      <h1
        style={{
          fontFamily: 'Barlow Condensed, sans-serif',
          fontSize: 32,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          margin: '0 0 24px 0',
          color: colors.text,
        }}
      >
        Security · MFA
      </h1>

      {mustEnrol && (
        <div
          role="alert"
          style={{
            background: colors.errorDim,
            border: `1px solid ${colors.error}`,
            color: colors.error,
            padding: '12px 14px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 16,
          }}
        >
          MFA enrolment is required to access the admin panel. Your 30-day
          grace period has expired.
        </div>
      )}

      {urgentGrace && (
        <div
          role="alert"
          style={{
            background: colors.warningDim,
            border: `1px solid ${colors.warning}`,
            color: colors.warning,
            padding: '12px 14px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 16,
          }}
        >
          MFA enrolment required in {graceDays} day{graceDays === 1 ? '' : 's'}.
        </div>
      )}

      <MfaEnrolPanel />
    </div>
  );
}

export default MfaPage;
