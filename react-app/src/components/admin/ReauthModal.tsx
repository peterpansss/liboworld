import { useEffect, useRef, useState, type FormEvent } from 'react';
import { registerReauthPrompt } from '../../lib/adminApi';
import { Field, TextInput, Button } from '../../components/admin/FormField';
import { colors } from '../../theme';

// Mounted once at the AdminLayout level. When a sensitive RPC wrapper calls
// requireRecentAuth(), this modal opens and asks for the password. On
// submit, requireRecentAuth handles the actual signInWithPassword call.

export function ReauthModal() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The resolver fn the lib hands us when it wants to prompt. We invoke it
  // with the password (or null if cancelled) to unblock the sensitive op.
  const resolveRef = useRef<((password: string | null) => void) | null>(null);

  useEffect(() => {
    const unregister = registerReauthPrompt((resolve) => {
      resolveRef.current = resolve;
      setPassword('');
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
    if (!password) {
      setError('Password is required.');
      return;
    }
    setBusy(true);
    setError(null);
    // The resolver triggers a signInWithPassword inside the lib; we don't
    // know if it succeeded until requireRecentAuth returns. The lib will
    // throw on failure, which the *caller* surfaces. Since this modal
    // closes optimistically, we let the caller's error path show the
    // result. Cleaner UX, but it does mean the modal may close even when
    // the password was wrong -- the wrapped op will then error out, and
    // the page-level toast surfaces "re-authentication failed". Acceptable
    // for an admin tool (no novice users).
    resolveRef.current?.(password);
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
          Confirm with password
        </h2>
        <p style={{ margin: '0 0 20px 0', color: colors.muted, fontSize: 13 }}>
          This action requires recent authentication.
        </p>

        <Field label="Password" error={error}>
          <TextInput
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
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
