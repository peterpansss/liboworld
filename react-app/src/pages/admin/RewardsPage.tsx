import { useEffect, useMemo, useState } from 'react';
import { colors } from '../../theme';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { Field, TextInput, TextArea, Select, Button } from '../../components/admin/FormField';
import { Modal } from '../../components/admin/Modal';
import {
  listRewardRedemptions,
  listRewardCatalogAdmin,
  // Sensitive ops: gated through requireRecentAuth() via the wrappers.
  resolveRedemptionWithReauth as resolveRedemption,
  upsertRewardCatalogWithReauth as upsertRewardCatalog,
  type RewardRedemptionRow,
  type RewardCatalogRow,
  type RewardCatalogInput,
  type RedemptionStatus,
  type RedemptionMethod,
  type RewardMinTier,
  type RewardKind,
} from '../../lib/adminApi';

/**
 * /admin/rewards — the rewards shop back office (points → gift code, or cash
 * to PayPal / Revolut / Wise / bank, Noah 14 Nov 2026).
 *
 *  (a) Redemption queue: pending first. "Mark sent" needs the gift code or
 *      the PayPal transaction ID and emails the member; "Reject" needs a note
 *      and refunds the points (admin_resolve_redemption writes the refund).
 *  (b) Catalogue editor: price, stock, active, min tier, brands.
 *
 * Fulfilment is manual by design while the member base is small, like
 * /admin/payouts. Budget (Noah, 13 Nov 2026): about €100 of stock a month.
 */

// ── styles (same as PayoutsPage) ──────────────────────────────────────────

const h1Style: React.CSSProperties = {
  margin: 0,
  fontFamily: 'Barlow Condensed, sans-serif',
  fontSize: 30,
  fontWeight: 800,
  color: colors.text,
  textTransform: 'uppercase',
  letterSpacing: 0.4,
};

const h2Style: React.CSSProperties = {
  margin: '32px 0 12px',
  fontFamily: 'Barlow Condensed, sans-serif',
  fontSize: 22,
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
  flexWrap: 'wrap',
};

const filterLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: colors.muted,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const panelStyle: React.CSSProperties = {
  padding: 16,
  background: colors.bg3,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  marginBottom: 16,
};

const chipBase: React.CSSProperties = {
  display: 'inline-block',
  padding: '3px 10px',
  borderRadius: 8,
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const numberStyle: React.CSSProperties = {
  fontFamily: 'Barlow Condensed, sans-serif',
  fontSize: 18,
  fontWeight: 700,
  color: colors.text,
  letterSpacing: 0.4,
};

/** Monthly stock budget (Noah, 13 Nov 2026). */
const MONTHLY_BUDGET_EUR = 100;

// ── helpers ───────────────────────────────────────────────────────────────

const STATUS_FILTER_OPTIONS: { value: '' | RedemptionStatus; label: string }[] = [
  { value: 'pending', label: 'pending' },
  { value: 'sent', label: 'sent' },
  { value: 'rejected', label: 'rejected' },
  { value: '', label: 'All' },
];

const METHOD_FILTER_OPTIONS: { value: '' | RedemptionMethod; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'code', label: 'gift code' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'revolut', label: 'Revolut' },
  { value: 'wise', label: 'Wise' },
  { value: 'sepa', label: 'Bank transfer' },
];

function statusChipStyle(status: RedemptionStatus): React.CSSProperties {
  if (status === 'pending') return { ...chipBase, background: colors.warningDim, color: colors.warning };
  if (status === 'sent') return { ...chipBase, background: colors.successDim, color: colors.success };
  return { ...chipBase, background: colors.errorDim, color: colors.error };
}

function StatusChip({ status }: { status: RedemptionStatus }) {
  return <span style={statusChipStyle(status)}>{status}</span>;
}

function TierChip({ tier }: { tier: RewardMinTier }) {
  return tier === 'premium'
    ? <span style={{ ...chipBase, background: colors.accentDim, color: colors.accent }}>Premium</span>
    : <span style={{ ...chipBase, background: colors.bg3, color: colors.muted }}>All members</span>;
}

function formatEur(n: number): string {
  return Number.isInteger(n) ? `€${n}` : `€${n.toFixed(2)}`;
}

function formatPoints(n: number): string {
  return Number(n).toLocaleString('en-GB');
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
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min${min === 1 ? '' : 's'} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const day = Math.floor(hr / 24);
  return `${day} day${day === 1 ? '' : 's'} ago`;
}

function memberLabel(r: RewardRedemptionRow): string {
  return r.member_name ?? r.member_email ?? (r.user_id ? r.user_id.slice(0, 8) : 'deleted user');
}

function cardLabel(r: RewardRedemptionRow): string {
  return r.catalog_title ?? `${formatEur(r.value_eur)} reward`;
}

const METHOD_LABELS: Record<RedemptionMethod, string> = {
  code: 'Gift code',
  paypal: 'PayPal',
  revolut: 'Revolut',
  wise: 'Wise',
  sepa: 'Bank transfer',
};

function methodLabel(m: RedemptionMethod): string {
  return METHOD_LABELS[m] ?? m;
}

/** What "Mark sent" asks for, by method. */
function proofLabel(m: RedemptionMethod): string {
  return m === 'code' ? 'Gift code' : `${methodLabel(m)} transaction ID`;
}

/** Where to pay a cash redemption, for the queue and the modal. */
function payoutLabel(r: RewardRedemptionRow): string | null {
  if (r.method === 'code' || !r.payout_to) return null;
  return r.method === 'sepa' && r.payout_name ? `${r.payout_name} · ${r.payout_to}` : r.payout_to;
}

/** Pending first (oldest first, it is a queue), then everything else newest first. */
function queueOrder(a: RewardRedemptionRow, b: RewardRedemptionRow): number {
  const ap = a.status === 'pending' ? 0 : 1;
  const bp = b.status === 'pending' ? 0 : 1;
  if (ap !== bp) return ap - bp;
  const at = new Date(a.created_at).getTime();
  const bt = new Date(b.created_at).getTime();
  return ap === 0 ? at - bt : bt - at;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void navigator.clipboard?.writeText(value).then(
          () => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          },
          () => setCopied(false),
        );
      }}
      title="Copy"
      style={{
        marginLeft: 6,
        padding: '2px 8px',
        borderRadius: 8,
        border: `1px solid ${colors.border}`,
        background: colors.bg3,
        color: copied ? colors.success : colors.muted,
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ ...filterLabelStyle, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: colors.text, wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}

function DismissableBanner({
  style,
  color,
  children,
  onDismiss,
}: {
  style: React.CSSProperties;
  color: string;
  children: React.ReactNode;
  onDismiss: () => void;
}) {
  return (
    <div style={{ ...style, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span>{children}</span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          background: 'transparent',
          border: 'none',
          color,
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
  );
}

// ── catalogue form ────────────────────────────────────────────────────────

type CatalogForm = {
  id: string | null;
  slug: string;
  title: string;
  value_eur: string;
  points_cost: string;
  min_tier: RewardMinTier;
  kind: RewardKind;
  brands: string;
  monthly_stock: string;
  active: boolean;
  sort_order: string;
  image_url: string;
};

const EMPTY_CATALOG_FORM: CatalogForm = {
  id: null,
  slug: '',
  title: '',
  value_eur: '',
  points_cost: '',
  min_tier: 'free',
  kind: 'gift',
  brands: '',
  monthly_stock: '0',
  active: false,
  sort_order: '0',
  image_url: '',
};

function catalogToForm(r: RewardCatalogRow): CatalogForm {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    value_eur: String(r.value_eur),
    points_cost: String(r.points_cost),
    min_tier: r.min_tier,
    kind: r.kind,
    brands: r.brands.join(', '),
    monthly_stock: String(r.monthly_stock),
    active: r.active,
    sort_order: String(r.sort_order),
    image_url: r.image_url ?? '',
  };
}

function formToCatalogInput(f: CatalogForm): RewardCatalogInput | string {
  const value = Number(f.value_eur);
  const points = Number(f.points_cost);
  const stock = Number(f.monthly_stock);
  const sort = Number(f.sort_order);
  if (!f.title.trim()) return 'Title is required.';
  if (!/^[a-z0-9-]+$/.test(f.slug.trim())) return 'Slug is required: lowercase letters, digits and dashes.';
  if (!Number.isFinite(value) || value <= 0) return 'Value (€) must be a positive number.';
  if (!Number.isInteger(points) || points <= 0) return 'Points must be a positive whole number.';
  if (!Number.isInteger(stock) || stock < 0) return 'Monthly stock must be a whole number, 0 or more.';
  if (!Number.isInteger(sort)) return 'Sort order must be a whole number.';
  const brands = f.kind === 'cash' ? [] : f.brands.split(',').map((b) => b.trim()).filter(Boolean);
  if (f.kind === 'gift' && brands.length === 0) return 'A gift card needs at least one brand.';
  return {
    id: f.id,
    slug: f.slug.trim(),
    title: f.title.trim(),
    value_eur: value,
    points_cost: points,
    min_tier: f.min_tier,
    kind: f.kind,
    brands,
    monthly_stock: stock,
    active: f.active,
    sort_order: sort,
    image_url: f.image_url.trim() ? f.image_url.trim() : null,
  };
}

// ── page ──────────────────────────────────────────────────────────────────

export function RewardsPage() {
  // Redemption queue
  const [statusFilter, setStatusFilter] = useState<'' | RedemptionStatus>('pending');
  const [methodFilter, setMethodFilter] = useState<'' | RedemptionMethod>('');
  const [rows, setRows] = useState<RewardRedemptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const [open, setOpen] = useState<RewardRedemptionRow | null>(null);
  const [proof, setProof] = useState('');
  const [note, setNote] = useState('');
  const [modalErr, setModalErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Catalogue
  const [catalog, setCatalog] = useState<RewardCatalogRow[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogErr, setCatalogErr] = useState<string | null>(null);
  const [catalogForm, setCatalogForm] = useState<CatalogForm | null>(null);
  const [catalogFormErr, setCatalogFormErr] = useState<string | null>(null);
  const [catalogSaving, setCatalogSaving] = useState(false);

  const refresh = async (status: '' | RedemptionStatus = statusFilter) => {
    setLoading(true);
    setErr(null);
    try {
      setRows(await listRewardRedemptions(status === '' ? null : status));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load redemptions');
    } finally {
      setLoading(false);
    }
  };

  const refreshCatalog = async () => {
    setCatalogLoading(true);
    setCatalogErr(null);
    try {
      setCatalog(await listRewardCatalogAdmin());
    } catch (e) {
      setCatalogErr(e instanceof Error ? e.message : 'Failed to load the catalogue');
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    void refresh('pending');
    void refreshCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStatusChange = (next: '' | RedemptionStatus) => {
    setStatusFilter(next);
    void refresh(next);
  };

  const visibleRows = useMemo(
    () => rows.filter((r) => methodFilter === '' || r.method === methodFilter).sort(queueOrder),
    [rows, methodFilter],
  );

  const openRow = (r: RewardRedemptionRow) => {
    setOpen(r);
    setProof('');
    setNote('');
    setModalErr(null);
  };

  const closeModal = () => {
    if (saving) return;
    setOpen(null);
    setModalErr(null);
  };

  const handleMarkSent = async () => {
    if (!open) return;
    const value = proof.trim();
    if (value.length < 3) {
      setModalErr(`Paste the ${proofLabel(open.method).toLowerCase()} first.`);
      return;
    }
    setSaving(true);
    setModalErr(null);
    try {
      await resolveRedemption(open.id, 'sent', value, note.trim() || null);
      setPageMessage(
        `Marked sent: ${cardLabel(open)} for ${memberLabel(open)}. The member gets an email${
          open.method === 'code' ? ' with the code' : ` saying the ${methodLabel(open.method)} payment was sent`
        }.`,
      );
      setOpen(null);
      await Promise.all([refresh(), refreshCatalog()]);
    } catch (e) {
      setModalErr(e instanceof Error ? e.message : 'Mark sent failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!open) return;
    const reason = note.trim();
    if (reason.length < 3) {
      setModalErr('A note is required to reject (the reason the member is told).');
      return;
    }
    // Same pattern as the irreversible actions on PayoutsPage.
    if (!window.confirm(
      `Reject this request? ${formatPoints(open.points)} points go back to ${memberLabel(open)}'s balance. This cannot be undone.`,
    )) return;
    setSaving(true);
    setModalErr(null);
    try {
      await resolveRedemption(open.id, 'rejected', null, reason);
      setPageMessage(`Rejected. ${formatPoints(open.points)} points returned to ${memberLabel(open)}.`);
      setOpen(null);
      await Promise.all([refresh(), refreshCatalog()]);
    } catch (e) {
      setModalErr(e instanceof Error ? e.message : 'Reject failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCatalogSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catalogForm) return;
    const input = formToCatalogInput(catalogForm);
    if (typeof input === 'string') {
      setCatalogFormErr(input);
      return;
    }
    setCatalogSaving(true);
    setCatalogFormErr(null);
    try {
      await upsertRewardCatalog(input);
      setPageMessage(`Saved catalogue card "${input.title}".`);
      setCatalogForm(null);
      await refreshCatalog();
    } catch (e2) {
      setCatalogFormErr(e2 instanceof Error ? e2.message : 'Save failed');
    } finally {
      setCatalogSaving(false);
    }
  };

  const columns: Column<RewardRedemptionRow>[] = useMemo(
    () => [
      {
        key: 'member',
        header: 'Member',
        render: (r) => (
          <div>
            <div style={{ fontWeight: 600, color: colors.text }}>{memberLabel(r)}</div>
            <div style={{ color: colors.dim, fontSize: 11, marginTop: 2 }}>
              {r.member_name && r.member_email ? r.member_email : r.user_id.slice(0, 8)}
            </div>
          </div>
        ),
        sort: (a, b) => memberLabel(a).localeCompare(memberLabel(b)),
      },
      {
        key: 'card',
        header: 'Card',
        render: (r) => (
          <div>
            <div style={numberStyle}>{formatEur(r.value_eur)}</div>
            <div style={{ color: colors.dim, fontSize: 11, marginTop: 2 }}>
              {r.catalog_title ? `${r.catalog_title} · ` : ''}{formatPoints(r.points)} pts
            </div>
          </div>
        ),
        sort: (a, b) => a.value_eur - b.value_eur,
      },
      {
        key: 'brand',
        header: 'Brand',
        render: (r) => <span style={{ color: colors.text, fontSize: 13 }}>{r.brand ?? '—'}</span>,
        sort: (a, b) => (a.brand ?? '').localeCompare(b.brand ?? ''),
      },
      {
        key: 'method',
        header: 'Method',
        render: (r) => <span style={{ color: colors.muted, fontSize: 12 }}>{methodLabel(r.method)}</span>,
        sort: (a, b) => a.method.localeCompare(b.method),
      },
      {
        key: 'payout',
        header: 'Pay to',
        render: (r) =>
          payoutLabel(r) ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12, color: colors.text }}>
              {payoutLabel(r)}
              <CopyButton value={r.payout_to ?? ''} />
            </span>
          ) : (
            <span style={{ color: colors.dim }}>—</span>
          ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (r) => (
          <div>
            <StatusChip status={r.status} />
            {r.status === 'sent' && (
              <div style={{ color: colors.dim, fontSize: 11, marginTop: 4 }}>member emailed</div>
            )}
            {r.status === 'rejected' && (
              <div style={{ color: colors.dim, fontSize: 11, marginTop: 4 }}>points returned</div>
            )}
          </div>
        ),
        sort: (a, b) => a.status.localeCompare(b.status),
      },
      {
        key: 'created',
        header: 'Requested',
        render: (r) => (
          <span style={{ color: colors.muted, fontSize: 12 }} title={formatAbsolute(r.created_at)}>
            {formatRelative(r.created_at)}
          </span>
        ),
        sort: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      },
    ],
    [],
  );

  const catalogColumns: Column<RewardCatalogRow>[] = useMemo(
    () => [
      {
        key: 'title',
        header: 'Card',
        render: (r) => (
          <div>
            <div style={{ fontWeight: 600, color: colors.text }}>{r.title}</div>
            <div style={{ color: colors.dim, fontSize: 11, marginTop: 2 }}>{r.slug}</div>
          </div>
        ),
      },
      {
        key: 'value',
        header: 'Value',
        align: 'right',
        render: (r) => <span style={numberStyle}>{formatEur(r.value_eur)}</span>,
        sort: (a, b) => a.value_eur - b.value_eur,
      },
      {
        key: 'points',
        header: 'Price',
        align: 'right',
        render: (r) => <span style={{ color: colors.text }}>{formatPoints(r.points_cost)} pts</span>,
        sort: (a, b) => a.points_cost - b.points_cost,
      },
      {
        key: 'tier',
        header: 'Who',
        render: (r) => <TierChip tier={r.min_tier} />,
      },
      {
        key: 'kind',
        header: 'Kind',
        render: (r) => <span style={{ color: colors.text, fontSize: 12 }}>{r.kind === 'cash' ? 'Cash' : 'Gift card'}</span>,
        sort: (a, b) => a.kind.localeCompare(b.kind),
      },
      {
        key: 'brands',
        header: 'Brands',
        render: (r) => (
          <span style={{ color: colors.muted, fontSize: 12 }}>
            {r.kind === 'cash' ? 'PayPal, Revolut, Wise, bank' : r.brands.length ? r.brands.join(', ') : '—'}
          </span>
        ),
      },
      {
        key: 'stock',
        header: 'Stock (left / month)',
        align: 'right',
        render: (r) => (
          <span style={{ color: colors.text }}>
            {r.remaining_this_month ?? '?'} / {r.monthly_stock}
          </span>
        ),
      },
      {
        key: 'active',
        header: 'Active',
        render: (r) =>
          r.active
            ? <span style={{ ...chipBase, background: colors.successDim, color: colors.success }}>on</span>
            : <span style={{ ...chipBase, background: colors.bg3, color: colors.muted }}>off</span>,
      },
    ],
    [],
  );

  const pendingCount = rows.filter((r) => r.status === 'pending').length;
  const pendingEur = rows.filter((r) => r.status === 'pending').reduce((acc, r) => acc + r.value_eur, 0);
  const subtitle = loading
    ? 'Loading…'
    : `${pendingCount} pending · ${formatEur(pendingEur)} to send (${statusFilter === '' ? 'all' : `status=${statusFilter}`})`;
  const configuredStockEur = catalog
    .filter((c) => c.active)
    .reduce((acc, c) => acc + c.value_eur * c.monthly_stock, 0);

  return (
    <div style={{ padding: 0 }}>
      <div style={headerRowStyle}>
        <div>
          <h1 style={h1Style}>Rewards</h1>
          <div style={statsStyle}>Budget: about €{MONTHLY_BUDGET_EUR} of stock a month.</div>
          <div style={statsStyle}>{subtitle}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            variant="secondary"
            onClick={() => {
              void refresh();
              void refreshCatalog();
            }}
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </div>

      {err && (
        <DismissableBanner style={errorBannerStyle} color={colors.error} onDismiss={() => setErr(null)}>
          {err}
        </DismissableBanner>
      )}
      {pageMessage && (
        <DismissableBanner style={successBannerStyle} color={colors.success} onDismiss={() => setPageMessage(null)}>
          {pageMessage}
        </DismissableBanner>
      )}

      {/* ── (a) Redemption queue ── */}
      <div style={filterRowStyle}>
        <label style={filterLabelStyle}>Status</label>
        <div style={{ width: 180 }}>
          <Select value={statusFilter} onChange={(e) => handleStatusChange(e.target.value as '' | RedemptionStatus)}>
            {STATUS_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>
        <label style={filterLabelStyle}>Method</label>
        <div style={{ width: 160 }}>
          <Select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value as '' | RedemptionMethod)}>
            {METHOD_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>
      </div>

      <DataTable
        rows={visibleRows}
        columns={columns}
        rowKey={(r) => r.id}
        onRowClick={openRow}
        emptyLabel={loading ? 'Loading…' : 'No redemptions in this filter.'}
      />

      {/* ── (b) Catalogue ── */}
      <div style={{ ...headerRowStyle, marginBottom: 12 }}>
        <div>
          <h2 style={h2Style}>Catalogue</h2>
          <div style={{ ...statsStyle, marginTop: -6 }}>
            Active stock configured: {formatEur(configuredStockEur)} a month
            {configuredStockEur > MONTHLY_BUDGET_EUR ? ` (over the €${MONTHLY_BUDGET_EUR} budget)` : ''}.
            Prices are published on liboworld.com/rewards-rules; change both together.
          </div>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setCatalogForm(EMPTY_CATALOG_FORM);
            setCatalogFormErr(null);
          }}
        >
          New card
        </Button>
      </div>

      {catalogErr && (
        <DismissableBanner style={errorBannerStyle} color={colors.error} onDismiss={() => setCatalogErr(null)}>
          {catalogErr}
        </DismissableBanner>
      )}

      <DataTable
        rows={catalog}
        columns={catalogColumns}
        rowKey={(r) => r.id}
        onRowClick={(r) => {
          setCatalogForm(catalogToForm(r));
          setCatalogFormErr(null);
        }}
        emptyLabel={catalogLoading ? 'Loading…' : 'No catalogue cards yet.'}
      />

      {/* ── Redemption modal ── */}
      <Modal
        open={!!open}
        onClose={closeModal}
        title={open ? `${formatEur(open.value_eur)} ${methodLabel(open.method).toLowerCase()} · ${memberLabel(open)}` : 'Redemption'}
        width={680}
      >
        {open && (
          <>
            <div style={{ ...panelStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <DetailItem label="Member" value={memberLabel(open)} />
              <DetailItem label="Account email" value={open.member_email ?? '—'} />
              <DetailItem label="Card" value={`${cardLabel(open)} · ${formatPoints(open.points)} points`} />
              <DetailItem label="Brand" value={open.brand ?? '—'} />
              <DetailItem label="Method" value={methodLabel(open.method)} />
              <DetailItem
                label={open.method === 'sepa' ? 'IBAN' : 'Pay to'}
                value={
                  open.method !== 'code' && open.payout_to ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      {open.payout_to}
                      <CopyButton value={open.payout_to} />
                    </span>
                  ) : '—'
                }
              />
              {open.method === 'sepa' && (
                <DetailItem
                  label="Account holder"
                  value={
                    open.payout_name ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {open.payout_name}
                        <CopyButton value={open.payout_name} />
                      </span>
                    ) : '—'
                  }
                />
              )}
              <DetailItem label="Status" value={<StatusChip status={open.status} />} />
              <DetailItem label="Requested" value={formatAbsolute(open.created_at)} />
              {open.status !== 'pending' && (
                <>
                  <DetailItem label="Resolved" value={formatAbsolute(open.fulfilled_at)} />
                  <DetailItem
                    label={proofLabel(open.method)}
                    value={<span style={{ fontFamily: 'monospace' }}>{open.code_or_txn ?? '—'}</span>}
                  />
                </>
              )}
              {open.admin_note && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <DetailItem label="Note" value={open.admin_note} />
                </div>
              )}
            </div>

            {open.status === 'sent' && (
              <div style={{ fontSize: 13, color: colors.muted, marginBottom: 16 }}>
                Sent. The member was emailed{open.method === 'code' ? ' the code' : ` that the ${methodLabel(open.method)} payment was sent`}.
              </div>
            )}
            {open.status === 'rejected' && (
              <div style={{ fontSize: 13, color: colors.muted, marginBottom: 16 }}>
                Rejected. {formatPoints(open.points)} points were returned to the member.
              </div>
            )}

            {open.status === 'pending' && (
              <>
                {modalErr && <div style={errorBannerStyle}>{modalErr}</div>}

                <div style={{ ...panelStyle, borderColor: colors.success }}>
                  <div style={{ fontWeight: 700, color: colors.text, marginBottom: 10 }}>Mark sent</div>
                  <Field
                    label={proofLabel(open.method)}
                    hint={
                      open.method !== 'code'
                        ? `Send ${formatEur(open.value_eur)} by ${methodLabel(open.method)} to ${payoutLabel(open) ?? 'the member'} first, then paste the transaction ID.`
                        : `Buy a ${formatEur(open.value_eur)}${open.brand ? ` ${open.brand}` : ''} code, then paste it here.`
                    }
                  >
                    <TextInput
                      value={proof}
                      onChange={(e) => setProof(e.target.value)}
                      placeholder={open.method !== 'code' ? 'e.g. 5TY05013RG002845M' : 'e.g. XXXX-XXXX-XXXX'}
                      autoComplete="off"
                    />
                  </Field>
                  <div style={{ fontSize: 12, color: colors.muted, marginBottom: 12, lineHeight: 1.5 }}>
                    Marking it sent emails the member
                    {open.method === 'code' ? ' this code' : ' that the payment was sent'}. Check it before you save.
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => void handleMarkSent()}
                      disabled={saving || proof.trim().length < 3}
                      style={{ background: colors.success, borderColor: colors.success, color: '#080B10' }}
                    >
                      {saving ? 'Saving…' : 'Mark sent'}
                    </Button>
                  </div>
                </div>

                <div style={{ ...panelStyle, borderColor: colors.error }}>
                  <div style={{ fontWeight: 700, color: colors.text, marginBottom: 10 }}>Reject</div>
                  <Field label="Note (required to reject)" hint="The reason. The member's points go back to their balance.">
                    <TextArea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. account under 14 days old"
                    />
                  </Field>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => void handleReject()}
                      disabled={saving || note.trim().length < 3}
                    >
                      Reject + return {formatPoints(open.points)} points
                    </Button>
                  </div>
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16, borderTop: `1px solid ${colors.border}` }}>
              <Button type="button" variant="ghost" onClick={closeModal} disabled={saving}>
                Close
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* ── Catalogue modal ── */}
      <Modal
        open={!!catalogForm}
        onClose={() => {
          if (!catalogSaving) setCatalogForm(null);
        }}
        title={catalogForm?.id ? `Edit ${catalogForm.title || 'card'}` : 'New catalogue card'}
        width={640}
      >
        {catalogForm && (
          <form onSubmit={handleCatalogSave}>
            {catalogFormErr && <div style={errorBannerStyle}>{catalogFormErr}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <Field label="Title">
                <TextInput
                  value={catalogForm.title}
                  onChange={(e) => setCatalogForm({ ...catalogForm, title: e.target.value })}
                  placeholder="€5 gift card"
                />
              </Field>
              <Field label="Slug">
                <TextInput
                  value={catalogForm.slug}
                  onChange={(e) => setCatalogForm({ ...catalogForm, slug: e.target.value })}
                  placeholder="gift-5"
                />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Field label="Value (€)">
                <TextInput
                  type="number"
                  min={1}
                  step="0.01"
                  value={catalogForm.value_eur}
                  onChange={(e) => setCatalogForm({ ...catalogForm, value_eur: e.target.value })}
                />
              </Field>
              <Field label="Price (points)">
                <TextInput
                  type="number"
                  min={1}
                  step={1}
                  value={catalogForm.points_cost}
                  onChange={(e) => setCatalogForm({ ...catalogForm, points_cost: e.target.value })}
                />
              </Field>
              <Field label="Who can redeem">
                <Select
                  value={catalogForm.min_tier}
                  onChange={(e) => setCatalogForm({ ...catalogForm, min_tier: e.target.value as RewardMinTier })}
                >
                  <option value="free">All members</option>
                  <option value="premium">Premium only</option>
                </Select>
              </Field>
            </div>
            <Field label="Kind" hint="Gift card = the member picks a brand and gets a code. Cash = paid to their PayPal, Revolut, Wise or bank account.">
              <Select
                value={catalogForm.kind}
                onChange={(e) => setCatalogForm({ ...catalogForm, kind: e.target.value as RewardKind })}
              >
                <option value="gift">Gift card</option>
                <option value="cash">Cash</option>
              </Select>
            </Field>
            {catalogForm.kind === 'gift' && (
              <Field label="Brands" hint="Comma-separated. The member picks one of these; they are also the logos shown.">
                <TextInput
                  value={catalogForm.brands}
                  onChange={(e) => setCatalogForm({ ...catalogForm, brands: e.target.value })}
                  placeholder="Amazon, Zalando, Steam"
                />
              </Field>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Field label="Monthly stock" hint="Resets on the 1st, Berlin time.">
                <TextInput
                  type="number"
                  min={0}
                  step={1}
                  value={catalogForm.monthly_stock}
                  onChange={(e) => setCatalogForm({ ...catalogForm, monthly_stock: e.target.value })}
                />
              </Field>
              <Field label="Sort order">
                <TextInput
                  type="number"
                  step={1}
                  value={catalogForm.sort_order}
                  onChange={(e) => setCatalogForm({ ...catalogForm, sort_order: e.target.value })}
                />
              </Field>
              <Field label="Active">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: colors.text, paddingTop: 10 }}>
                  <input
                    type="checkbox"
                    checked={catalogForm.active}
                    onChange={(e) => setCatalogForm({ ...catalogForm, active: e.target.checked })}
                  />
                  Shown in the app
                </label>
              </Field>
            </div>
            <Field label="Image URL (optional)">
              <TextInput
                value={catalogForm.image_url}
                onChange={(e) => setCatalogForm({ ...catalogForm, image_url: e.target.value })}
                placeholder="https://…"
              />
            </Field>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
                paddingTop: 16,
                borderTop: `1px solid ${colors.border}`,
              }}
            >
              <Button type="button" variant="ghost" onClick={() => setCatalogForm(null)} disabled={catalogSaving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={catalogSaving}>
                {catalogSaving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
