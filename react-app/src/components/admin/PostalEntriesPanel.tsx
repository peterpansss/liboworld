import { useEffect, useMemo, useState } from 'react';
import { colors } from '../../theme';
import { Field, TextInput, Button } from './FormField';
import {
  listPostalEntries,
  recordPostalEntry,
  deletePostalEntry,
  type PostalEntry,
} from '../../lib/adminApi';

/**
 * Free entry by post for one membership round. Noah records each letter here
 * (one letter = one entry). The server counts at most the member's gap to a
 * Premium member with the same loyalty months. The draw adds them. Rendered inside the giveaway edit form, so it uses
 * type="button" controls and never submits the outer form.
 */
export function PostalEntriesPanel({
  giveawayId,
  startsAt,
  endsAt,
  drawn,
}: {
  giveawayId: string;
  startsAt: string;
  endsAt: string;
  drawn: boolean;
}) {
  const [entries, setEntries] = useState<PostalEntry[]>([]);
  const [email, setEmail] = useState('');
  const [receivedOn, setReceivedOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [country, setCountry] = useState('DE');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = async () => {
    try {
      setEntries(await listPostalEntries(giveawayId));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [giveawayId]);

  const perMember = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of entries) m.set(e.email, (m.get(e.email) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [entries]);

  const record = async () => {
    setError(null);
    setMessage(null);
    if (!email.trim()) {
      setError('Enter the account email from the letter.');
      return;
    }
    setBusy(true);
    try {
      const { letters: n, counting } = await recordPostalEntry({ giveawayId, email: email.trim(), receivedOn, country, note });
      setMessage(`Recorded. ${email.trim()} has ${n} letter(s) this round; ${counting} count with their current plan.`);
      setNote('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      await deletePostalEntry(id);
      setConfirmId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  // Berlin calendar date (a round opening 00:00 Berlin is 23:00 UTC the day before).
  const dateOnly = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date(iso));
    } catch {
      return iso.slice(0, 10);
    }
  };

  return (
    <div
      style={{
        marginTop: 8,
        marginBottom: 16,
        padding: 12,
        background: colors.bg3,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: colors.muted,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 6,
        }}
      >
        Free entry by post ({entries.length} letters)
      </div>
      <div style={{ fontSize: 12, color: colors.muted, marginBottom: 10 }}>
        One letter = one entry. What counts per member = the gap to a Premium member with the same loyalty months (Free: 2 + 2 per loyalty month, max 26; Premium: 0). Counts only if the letter arrived between{' '}
        {dateOnly(startsAt)} and {dateOnly(endsAt)} and the member completes a workout in the round.
      </div>

      {!drawn && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 70px', gap: 8 }}>
            <Field label="Account email (from the letter)">
              <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Received on">
              <TextInput type="date" value={receivedOn} onChange={(e) => setReceivedOn(e.target.value)} />
            </Field>
            <Field label="Country">
              <TextInput
                value={country}
                maxLength={2}
                onChange={(e) => setCountry(e.target.value.toUpperCase())}
              />
            </Field>
          </div>
          <Field label="Note (optional)">
            <TextInput value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Button type="button" variant="secondary" onClick={record} disabled={busy}>
            {busy ? 'Saving…' : 'Record letter'}
          </Button>
        </>
      )}

      {error && <div style={{ marginTop: 10, fontSize: 13, color: colors.error }}>{error}</div>}
      {message && <div style={{ marginTop: 10, fontSize: 13, color: colors.success }}>{message}</div>}

      {perMember.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 12, color: colors.text }}>
          {perMember.map(([who, n]) => (
            <div key={who}>
              {who}: <strong>{n}</strong>
            </div>
          ))}
        </div>
      )}

      {entries.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: colors.muted }}>
          {entries.map((e) => (
            <div key={e.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
              <span style={{ flex: 1 }}>
                {e.email} · {e.received_on} · {e.country}
                {e.note ? ` · ${e.note}` : ''}
              </span>
              {!drawn &&
                (confirmId === e.id ? (
                  <Button type="button" variant="danger" onClick={() => remove(e.id)} disabled={busy}>
                    Confirm remove
                  </Button>
                ) : (
                  <Button type="button" variant="ghost" onClick={() => setConfirmId(e.id)} disabled={busy}>
                    Remove
                  </Button>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
