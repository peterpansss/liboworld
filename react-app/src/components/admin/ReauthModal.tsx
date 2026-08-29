import { useEffect, useRef, useState, type FormEvent } from 'react';
import { registerReauthPrompt } from '../../lib/adminApi';
import { Field, TextInput, Button } from '../../components/admin/FormField';
import { colors } from '../../theme';

// Mounted inside the admin tree. When a sensitive RPC wrapper calls
// requireRecentAuth() — or AdminGuard needs to elevate the session on entry —
// this modal opens and asks for the 6-digit code from the admin's authenticator
// app. On submit it resolves the pending prompt with the entered code; the lib
// runs the AAL2 challenge/verify. It NEVER handles a password.

// TOTP codes are exactly six digits.
const CODE_LENGTH = 6;

export function ReauthModal() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The resolver fn the lib hands us when it wants to prompt. We invoke it
  // with the code (or null if cancelled) to unblock the sensitive op / step-up.
  const resolveRef = useRef<((code: string | null) => void) | null>(null);

  useEffect(() => {
    const unregister = registerReauthPrompt((resolve) => {
      resolveRef.current = resolve;
      setCode('');
      setError(null);
      setOpen(true);
    });
    return unregister;
  }, []);

  const cancel = () => {
    if (busy) return;
    resolveRef.current?.(null);
    resolveRef.current = null;
    setOpen(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setBusy(true);
    setError(null);
    // The resolver drives the AAL2 challenge/verify inside the lib; we don't
    // know if it succeeded until the awaiting caller returns. The lib throws
    // (sensitive op) or reports false (AdminGuard step-up) on a bad code.
    // Since this modal closes optimistically, the caller's error path surfaces
    // the result. If the code was wrong, the wrapped op errors out and the
    // page-level toast (or the AdminGuard block screen) shows the failure —
    // acceptable for an admin tool.
    resolveRef.current?.(trimmed);
    resolveRef.current = null;
    setOpen(false);
    setBusy(false);
  };

  if (!open) return null;

  return (
    <div
      onClick={cancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        style={{
          background: colors.bg2,
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
          padding: 28,
          width: '100%',
          maxWidth: 400,
        }}
      >
        <h2
          style={{
            margin: '0 0 6px 0',
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 24,
            fontWeight: 800,
            color: colors.text,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
          }}
        >
          Confirm with authenticator
        </h2>
        <p style={{ margin: '0 0 20px 0', color: colors.muted, fontSize: 13 }}>
          This action requires two-factor verification. Enter the 6-digit code
          from your authenticator app.
        </p>

        <Field label="Authentication code" error={error}>
          <TextInput
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={CODE_LENGTH}
            placeholder="123456"
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
            required
            style={{ letterSpacing: 4, fontSize: 18 }}
          />
        </Field>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <Button type="button" variant="ghost" onClick={cancel} style={{ flex: 1 }}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy} style={{ flex: 1 }}>
            {busy ? 'Confirming…' : 'Confirm'}
          </Button>
        </div>
      </form>
    </div>
  );
}
