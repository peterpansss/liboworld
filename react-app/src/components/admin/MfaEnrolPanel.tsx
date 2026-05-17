import { useEffect, useState, type FormEvent } from 'react';
import {
  startTotpEnrolment,
  confirmTotpEnrolment,
  getAdminMfaStatus,
  type AdminMfaStatus,
  type MfaEnrolmentChallenge,
} from '../../lib/adminApi';
import { Field, TextInput, Button } from '../../components/admin/FormField';
import { colors } from '../../theme';

// MFA enrolment scaffold. Shipped as a self-contained panel mountable from
// the admin layout sidebar. NOT hooked into a route by this commit -- the
// architecture agent owns the layout/routing. Mount it wherever the
// "Settings" page is, or use the ChooseEnrolStep below as a banner.
//
// PRODUCTION GAPS (intentionally left as TODOs, see spec section 5):
//   - No recovery codes. If the device is lost, the only recovery path is
//     for a sysadmin to clear factors via the Supabase dashboard. Add a
//     codes panel that generates 10 single-use codes after successful
//     enrolment.
//   - No "remember this device" — every aal2 challenge re-prompts. Add an
//     opaque cookie keyed by browser + 30-day expiry.
//   - No SMS/push fallback. Single TOTP factor is fragile.
//   - No audit log of factor enrol / verify / unenrol events. Pipe these
//     into points_ledger or a dedicated admin_audit table.
//   - Enrolment is voluntary. The 30-day grace check (my_admin_mfa_status)
//     returns must_enrol: true after the grace expires, but no UI BLOCKS
//     the admin yet -- it just shows a banner. Wire that into a hard
//     redirect for the next iteration.

export function MfaEnrolPanel() {
  const [status, setStatus] = useState<AdminMfaStatus | null>(null);
  const [phase, setPhase] = useState<'idle' | 'enrolling' | 'verifying' | 'done'>('idle');
  const [challenge, setChallenge] = useState<MfaEnrolmentChallenge | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void refresh();
  }, []);

  const refresh = async () => {
    try {
      const s = await getAdminMfaStatus();
      setStatus(s);
      if (s.mfa_enrolled) setPhase('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load MFA status');
    }
  };

  const beginEnrol = async () => {
    setBusy(true);
    setError(null);
    try {
      const c = await startTotpEnrolment();
      setChallenge(c);
      setPhase('verifying');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start enrolment');
      setPhase('idle');
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    if (!challenge) return;
    setBusy(true);
    setError(null);
    try {
      await confirmTotpEnrolment(challenge.factorId, code.trim());
      setPhase('done');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Code did not verify. Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!status?.is_admin) return null;

  return (
    <section style={{ background: colors.bg2, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 20 }}>
      <h2 style={{ margin: '0 0 6px 0', fontSize: 18, fontWeight: 700, color: colors.text }}>
        Two-Factor Authentication
      </h2>

      {phase === 'done' ? (
        <p style={{ margin: 0, color: colors.success ?? colors.muted, fontSize: 13 }}>
          Enrolled. You'll be asked for a TOTP code on every sign-in.
        </p>
      ) : (
        <>
          <p style={{ margin: '0 0 12px 0', color: colors.muted, fontSize: 13 }}>
            Add a TOTP authenticator (Google Authenticator, Authy, 1Password, etc.).
            {status.must_enrol ? (
              <strong style={{ color: colors.error, display: 'block', marginTop: 6 }}>
                Required: your 30-day grace period has ended.
              </strong>
            ) : status.grace_days_remaining !== undefined ? (
              <span style={{ display: 'block', marginTop: 6, color: colors.dim }}>
                Grace period: {status.grace_days_remaining} day(s) remaining.
              </span>
            ) : null}
          </p>

          {phase === 'idle' && (
            <Button onClick={beginEnrol} disabled={busy}>
              {busy ? 'Starting…' : 'Enable 2FA'}
            </Button>
          )}

          {phase === 'verifying' && challenge && (
            <form onSubmit={verify}>
              <p style={{ margin: '0 0 8px 0', fontSize: 12, color: colors.muted }}>
                Scan this QR with your authenticator app, then enter the 6-digit code.
              </p>
              <div
                style={{ background: '#fff', padding: 12, borderRadius: 8, marginBottom: 12, width: 'fit-content' }}
                // eslint-disable-next-line react/no-danger -- Supabase returns a sanitised SVG string
                dangerouslySetInnerHTML={{ __html: challenge.qrSvg }}
              />
              <p style={{ margin: '0 0 12px 0', fontSize: 11, color: colors.dim, fontFamily: 'monospace' }}>
                Or enter this secret manually: {challenge.secret}
              </p>
              <Field label="Code" error={error}>
                <TextInput
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  required
                />
              </Field>
              <Button type="submit" disabled={busy || code.length !== 6}>
                {busy ? 'Verifying…' : 'Verify and finish'}
              </Button>
            </form>
          )}
        </>
      )}

      {error && phase !== 'verifying' && (
        <p style={{ marginTop: 12, color: colors.error, fontSize: 12 }}>{error}</p>
      )}
    </section>
  );
}
