import { useEffect, useMemo, useState } from 'react';
import { colors } from '../../theme';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { Field, TextInput, Select, Button } from '../../components/admin/FormField';
import { Modal } from '../../components/admin/Modal';
import {
  listChallengePayouts,
  // Sensitive op: gated through requireRecentAuth() via the wrapper.
  // See lib/adminApi.ts.
  markPayoutPaidWithReauth as markPayoutPaid,
  type ChallengePayoutRow,
  type ChallengePayoutStatus,
  type ChallengePayoutMethod,
  type MarkPayoutPaidInput,
} from '../../lib/adminApi';

// ── styles ────────────────────────────────────────────────────────────────

const h1Style: React.CSSProperties = {
  margin: 0,
  fontFamily: 'Barlow Condensed, sans-serif',
  fontSize: 30,
  fontWeight: 800,
  color: colors.text,
  textTransform: 'uppercase',
  letterSpacing: 0.4,
};

const statsStyle: React.CSSProperties = { fontSize: 13, color: colors.muted, marginTop: 6 };

const headerRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  marginBottom: 20,
  gap: 16,
};

const errorBannerStyle: React.CSSProperties = {
  background: colors.errorDim,
  color: colors.error,
  border: `1px solid ${colors.error}`,
  borderRadius: 10,
  padding: '10px 14px',
  marginBottom: 14,
  fontSize: 13,
};

const successBannerStyle: React.CSSProperties = {
  background: colors.successDim,
  color: colors.success,
  border: `1px solid ${colors.success}`,
  borderRadius: 10,
  padding: '10px 14px',
  marginBottom: 14,
  fontSize: 13,
};

const filterRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginBottom: 16,
};

// ── helpers ───────────────────────────────────────────────────────────────

const STATUS_FILTER_OPTIONS: { value: '' | ChallengePayoutStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'pending' },
  { value: 'processing', label: 'processing' },
  { value: 'paid', label: 'paid' },
  { value: 'failed', label: 'failed' },
  { value: 'cancelled', label: 'cancelled' },
];

const METHOD_OPTIONS: ChallengePayoutMethod[] = ['wise', 'sepa', 'paypal', 'manual'];

function statusChipStyle(status: ChallengePayoutStatus): React.CSSProperties {
  let bg: string = colors.bg3;
  let fg: string = colors.muted;
  if (status === 'pending') {
    bg = colors.warningDim;
    fg = colors.warning;
  } else if (status === 'processing') {
    bg = colors.accentDim;
    fg = colors.accent;
  } else if (status === 'paid') {
    bg = colors.successDim;
    fg = colors.success;
  } else if (status === 'failed') {
    bg = colors.errorDim;
    fg = colors.error;
  }
  return {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 8,
    background: bg,
    color: fg,
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  };
}

function StatusChip({ status }: { status: ChallengePayoutStatus }) {
  return <span style={statusChipStyle(status)}>{status}</span>;
}

function formatAmount(amount: number, currency: string): string {
  const fixed = Number(amount).toFixed(2);
  if (currency === 'EUR' || !currency) return `€${fixed}`;
  if (currency === 'USD') return `$${fixed}`;
  if (currency === 'GBP') return `£${fixed}`;
  return `${currency} ${fixed}`;
}

function formatCycleWindow(startDate: string, endDate: string): string {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric' });
  };
  return `${fmt(startDate)} → ${fmt(endDate)}`;
}

function formatAbsolute(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min${min === 1 ? '' : 's'} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} day${day === 1 ? '' : 's'} ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? '' : 's'} ago`;
  const yr = Math.floor(mo / 12);
  return `${yr} year${yr === 1 ? '' : 's'} ago`;
}

function truncate(value: string | null | undefined, n: number): string {
  if (!value) return '—';
  return value.length > n ? `${value.slice(0, n)}…` : value;
}

function userLabel(row: ChallengePayoutRow): string {
  return row.user_email ?? row.user_id.slice(0, 8);
}

// ── form ──────────────────────────────────────────────────────────────────

type FormState = {
  payment_method: ChallengePayoutMethod;
  payment_reference: string;
  payee_email: string;
  payee_iban: string;
  payee_country: string;
};

const EMPTY_FORM: FormState = {
  payment_method: 'wise',
  payment_reference: '',
  payee_email: '',
  payee_iban: '',
  payee_country: '',
};

function rowToForm(row: ChallengePayoutRow): FormState {
  return {
    payment_method: row.payment_method ?? 'wise',
    payment_reference: row.payment_reference ?? '',
    payee_email: row.payee_email ?? '',
    payee_iban: row.payee_iban ?? '',
    payee_country: row.payee_country ?? '',
  };
}

function formToInput(f: FormState): MarkPayoutPaidInput {
  return {
    payment_method: f.payment_method,
    payment_reference: f.payment_reference.trim(),
    payee_email: f.payee_email.trim() ? f.payee_email.trim() : null,
    payee_iban: f.payee_iban.trim() ? f.payee_iban.trim() : null,
    payee_country: f.payee_country.trim() ? f.payee_country.trim().toUpperCase() : null,
  };
}

// ── page ──────────────────────────────────────────────────────────────────

export function PayoutsPage() {
  const [statusFilter, setStatusFilter] = useState<'' | ChallengePayoutStatus>('pending');
  const [rows, setRows] = useState<ChallengePayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ChallengePayoutRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = async (status: '' | ChallengePayoutStatus = statusFilter) => {
    setLoading(true);
    setErr(null);
    try {
      const list = await listChallengePayouts(status === '' ? null : status);
      setRows(list);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load payouts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh('pending');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStatusChange = (next: '' | ChallengePayoutStatus) => {
    setStatusFilter(next);
    void refresh(next);
  };

  const openRow = (row: ChallengePayoutRow) => {
    setEditing(row);
    setForm(rowToForm(row));
    setFormErr(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErr(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!form.payment_method) {
      setFormErr('Payment method is required.');
      return;
    }
    if (!form.payment_reference.trim() || form.payment_reference.trim().length < 3) {
      setFormErr('Payment reference is required (min 3 chars).');
      return;
    }
    setSaving(true);
    setFormErr(null);
    try {
      await markPayoutPaid(editing.id, formToInput(form));
      setPageMessage('Payout marked as paid');
      setModalOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      await refresh();
    } catch (e2) {
      setFormErr(e2 instanceof Error ? e2.message : 'Mark-as-paid failed');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<ChallengePayoutRow>[] = useMemo(
    () => [
      {
        key: 'user',
        header: 'User',
        render: (r) => (
          <div>
            <div style={{ fontWeight: 600, color: colors.text }}>{userLabel(r)}</div>
            {r.user_email && (
              <div style={{ color: colors.dim, fontSize: 11, marginTop: 2 }}>{r.user_id.slice(0, 8)}</div>
            )}
          </div>
        ),
        sort: (a, b) => userLabel(a).localeCompare(userLabel(b)),
      },
      {
        key: 'challenge',
        header: 'Challenge',
        render: (r) => (
          <div>
            <div style={{ fontWeight: 600, color: colors.text }}>{r.challenge_title}</div>
            <div style={{ color: colors.dim, fontSize: 11, marginTop: 2 }}>{r.challenge_id}</div>
          </div>
        ),
        sort: (a, b) => a.challenge_title.localeCompare(b.challenge_title),
      },
      {
        key: 'cycle',
        header: 'Cycle window',
        render: (r) => (
          <span style={{ color: colors.muted, fontSize: 12 }}>
            {formatCycleWindow(r.cycle_start_date, r.cycle_end_date)}
          </span>
        ),
        sort: (a, b) =>
          new Date(a.cycle_start_date).getTime() - new Date(b.cycle_start_date).getTime(),
      },
      {
        key: 'amount',
        header: 'Amount',
        align: 'right',
        render: (r) => (
          <span
            style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              fontSize: 18,
              fontWeight: 700,
              color: colors.text,
              letterSpacing: 0.4,
            }}
          >
            {formatAmount(r.amount, r.currency)}
          </span>
        ),
        sort: (a, b) => Number(a.amount) - Number(b.amount),
      },
      {
        key: 'status',
        header: 'Status',
        render: (r) => <StatusChip status={r.status} />,
        sort: (a, b) => a.status.localeCompare(b.status),
      },
      {
        key: 'method',
        header: 'Method',
        render: (r) => (
          <span style={{ color: colors.muted, fontSize: 12, textTransform: 'capitalize' }}>
            {r.payment_method ?? '—'}
          </span>
        ),
        sort: (a, b) => (a.payment_method ?? '').localeCompare(b.payment_method ?? ''),
      },
      {
        key: 'reference',
        header: 'Reference',
        render: (r) => (
          <span
            style={{ color: colors.muted, fontSize: 12, fontFamily: 'monospace' }}
            title={r.payment_reference ?? ''}
          >
            {truncate(r.payment_reference, 12)}
          </span>
        ),
        sort: (a, b) => (a.payment_reference ?? '').localeCompare(b.payment_reference ?? ''),
      },
      {
        key: 'created',
        header: 'Created',
        render: (r) => (
          <span
            style={{ color: colors.muted, fontSize: 12 }}
            title={formatAbsolute(r.created_at)}
          >
            {formatRelative(r.created_at)}
          </span>
        ),
        sort: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      },
    ],
    []
  );

  // Subtitle math (over the loaded set).
  const pendingCount = rows.filter((r) => r.status === 'pending').length;
  const paidCount = rows.filter((r) => r.status === 'paid').length;
  const owedSum = rows
    .filter((r) => r.status === 'pending' || r.status === 'processing')
    .reduce((acc, r) => acc + Number(r.amount), 0);
  const paidSum = rows
    .filter((r) => r.status === 'paid')
    .reduce((acc, r) => acc + Number(r.amount), 0);

  const filterScopeLabel = statusFilter === '' ? 'all' : `status=${statusFilter}`;
  const subtitle = loading
    ? 'Loading…'
    : `${pendingCount} pending · ${paidCount} paid · €${owedSum.toFixed(2)} owed · €${paidSum.toFixed(2)} paid out (${filterScopeLabel})`;

  const isActionable =
    !!editing && (editing.status === 'pending' || editing.status === 'processing');

  return (
    <div style={{ padding: 0 }}>
      <div style={headerRowStyle}>
        <div>
          <h1 style={h1Style}>Payouts</h1>
          <div style={statsStyle}>{subtitle}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={() => void refresh()} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </div>

      {err && (
        <div
          style={{ ...errorBannerStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>{err}</span>
          <button
            onClick={() => setErr(null)}
            aria-label="Dismiss error"
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.error,
              cursor: 'pointer',
              fontSize: 18,
              lineHeight: 1,
              padding: 0,
              marginLeft: 12,
            }}
          >
            ×
          </button>
        </div>
      )}

      {pageMessage && (
        <div
          style={{ ...successBannerStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>{pageMessage}</span>
          <button
            onClick={() => setPageMessage(null)}
            aria-label="Dismiss message"
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.success,
              cursor: 'pointer',
              fontSize: 18,
              lineHeight: 1,
              padding: 0,
              marginLeft: 12,
            }}
          >
            ×
          </button>
        </div>
      )}

      <div style={filterRowStyle}>
        <label
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: colors.muted,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          Status
        </label>
        <div style={{ width: 200 }}>
          <Select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value as '' | ChallengePayoutStatus)}
          >
            {STATUS_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        onRowClick={openRow}
        emptyLabel={loading ? 'Loading…' : 'No payouts in this status.'}
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={
          editing
            ? isActionable
              ? `Pay out ${formatAmount(editing.amount, editing.currency)} to ${userLabel(editing)}`
              : `Payout · ${formatAmount(editing.amount, editing.currency)} · ${userLabel(editing)}`
            : 'Payout'
        }
        width={720}
      >
        {editing && (
          <>
            {/* Sub-header chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: colors.bg3,
                  color: colors.muted,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {editing.challenge_title}
              </span>
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: colors.bg3,
                  color: colors.muted,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {formatCycleWindow(editing.cycle_start_date, editing.cycle_end_date)}
              </span>
              <StatusChip status={editing.status} />
            </div>

            {isActionable ? (
              <form onSubmit={handleSubmit}>
                {formErr && <div style={errorBannerStyle}>{formErr}</div>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Field label="Payment method">
                    <Select
                      value={form.payment_method}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          payment_method: e.target.value as ChallengePayoutMethod,
                        }))
                      }
                      required
                    >
                      {METHOD_OPTIONS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Payment reference">
                    <TextInput
                      value={form.payment_reference}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, payment_reference: e.target.value }))
                      }
                      placeholder="Wise transferId, SEPA EndToEndId, etc."
                      required
                    />
                  </Field>
                </div>

                <Field label="Payee email (optional)">
                  <TextInput
                    type="email"
                    value={form.payee_email}
                    onChange={(e) => setForm((f) => ({ ...f, payee_email: e.target.value }))}
                    placeholder="payee@example.com"
                  />
                </Field>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
                  <Field label="Payee IBAN (optional)">
                    <TextInput
                      value={form.payee_iban}
                      onChange={(e) => setForm((f) => ({ ...f, payee_iban: e.target.value }))}
                      placeholder="DE89 3704 0044 0532 0130 00"
                    />
                  </Field>
                  <Field label="Payee country (ISO α-2, optional)">
                    <TextInput
                      value={form.payee_country}
                      onChange={(e) => setForm((f) => ({ ...f, payee_country: e.target.value }))}
                      maxLength={2}
                      placeholder="DE"
                    />
                  </Field>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 8,
                    paddingTop: 16,
                    borderTop: `1px solid ${colors.border}`,
                  }}
                >
                  <Button type="button" variant="danger" onClick={closeModal} disabled={saving}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={saving}
                    style={{
                      background: colors.success,
                      borderColor: colors.success,
                      color: '#080B10',
                    }}
                  >
                    {saving ? 'Marking…' : 'Mark as paid'}
                  </Button>
                </div>
              </form>
            ) : (
              <ReadOnlyDetails row={editing} onClose={closeModal} />
            )}
          </>
        )}
      </Modal>
    </div>
  );
}

// ── read-only details ────────────────────────────────────────────────────

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: colors.muted,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13, color: colors.text, wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}

function ReadOnlyDetails({ row, onClose }: { row: ChallengePayoutRow; onClose: () => void }) {
  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          padding: 16,
          background: colors.bg3,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          marginBottom: 16,
        }}
      >
        <DetailItem label="Amount" value={formatAmount(row.amount, row.currency)} />
        <DetailItem label="Currency" value={row.currency} />
        <DetailItem label="Status" value={<StatusChip status={row.status} />} />
        <DetailItem label="Payment method" value={row.payment_method ?? '—'} />
        <DetailItem
          label="Payment reference"
          value={
            <span style={{ fontFamily: 'monospace' }}>{row.payment_reference ?? '—'}</span>
          }
        />
        <DetailItem label="Payee email" value={row.payee_email ?? '—'} />
        <DetailItem
          label="Payee IBAN"
          value={<span style={{ fontFamily: 'monospace' }}>{row.payee_iban ?? '—'}</span>}
        />
        <DetailItem label="Payee country" value={row.payee_country ?? '—'} />
        <DetailItem label="Created at" value={formatAbsolute(row.created_at)} />
        <DetailItem label="Processed at" value={formatAbsolute(row.processed_at)} />
        <DetailItem label="Paid at" value={formatAbsolute(row.paid_at)} />
        <DetailItem label="Failed at" value={formatAbsolute(row.failed_at)} />
        {row.failure_reason && (
          <div style={{ gridColumn: '1 / -1' }}>
            <DetailItem
              label="Failure reason"
              value={<span style={{ color: colors.error }}>{row.failure_reason}</span>}
            />
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
          paddingTop: 16,
          borderTop: `1px solid ${colors.border}`,
        }}
      >
        <Button type="button" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </>
  );
}
