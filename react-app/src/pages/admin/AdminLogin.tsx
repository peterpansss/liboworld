import { useState, type FormEvent } from 'react';
import { signInAdmin } from '../../lib/adminApi';
import { Field, TextInput, Button } from '../../components/admin/FormField';
import { colors } from '../../theme';

export function AdminLogin({ onSignedIn, deniedReason }: { onSignedIn: () => void; deniedReason: string | null }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(deniedReason);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInAdmin(email.trim(), password);
      onSignedIn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <form
        onSubmit={submit}
        style={{
          background: colors.bg2,
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
          padding: 32,
          width: '100%',
          maxWidth: 380,
        }}
      >
        <h1
          style={{
            margin: '0 0 6px 0',
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 30,
            fontWeight: 800,
            color: colors.text,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
          }}
        >
          Libo Admin
        </h1>
        <p style={{ margin: '0 0 24px 0', color: colors.muted, fontSize: 13 }}>Sign in with your Libo admin account.</p>

        <Field label="Email">
          <TextInput
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="Password" error={error}>
          <TextInput
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>

        <Button type="submit" disabled={loading} style={{ width: '100%', padding: '12px 16px', fontSize: 14 }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}
