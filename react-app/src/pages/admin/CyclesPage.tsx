import { useEffect, useMemo, useState } from 'react';
import { colors } from '../../theme';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { Field, TextInput, Select, Button } from '../../components/admin/FormField';
import { Modal } from '../../components/admin/Modal';
import {
  listChallengeCycles,
  openNextCycle,
  listCycleWinners,
  listMoneyChallenges,
  setCycleMaxParticipants,
  addEnrollment,
  listUsers,
  type ChallengeCycleRow,
  type ChallengeCycleStatus,
  type CycleWinnerRow,
  type MoneyChallenge,
  type AdminUserRow,
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
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
};

const successBannerStyle: React.CSSProperties = {
  background: colors.successDim,
  color: colors.success,
  border: `1px solid ${colors.success}`,
  borderRadius: 10,
  padding: '10px 14px',
  marginBottom: 14,
  fontSize: 13,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
};

const filterRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  alignItems: 'flex-end',
  marginBottom: 16,
  flexWrap: 'wrap',
};

const dismissBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'inherit',
  fontSize: 18,
  cursor: 'pointer',
  padding: 0,
  lineHeight: 1,
  opacity: 0.7,
};

// ── helpers ───────────────────────────────────────────────────────────────

function statusChipStyle(status: ChallengeCycleStatus): React.CSSProperties {
  let bg: string = colors.bg3;
  let fg: string = colors.muted;
  if (status === 'enrollment_open') {
    bg = colors.successDim;
    fg = colors.success;
  } else if (status === 'running') {
    bg = colors.warningDim;
    fg = colors.warning;
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

function payoutStatusChipStyle(status: CycleWinnerRow['payout_status']): React.CSSProperties {
  let bg: string = colors.bg3;
  let fg: string = colors.muted;
  if (status === 'paid') {
    bg = colors.successDim;
    fg = colors.success;
  } else if (status === 'pending' || status === 'processing') {
    bg = colors.warningDim;
    fg = colors.warning;
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

function formatWindow(start: string, end: string): string {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };
  return `${fmt(start)} → ${fmt(end)}`;
}

function formatDateTime(iso: string | null | undefined): string {
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

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Map raw RPC error codes to friendly admin-facing copy. */
function friendlyCycleError(raw: string, ctx?: { activeCount?: number }): string {
  switch (raw) {
    case 'forbidden':
      return 'You do not have permission to do that.';
    case 'cycle_not_found':
      return 'Cycle not found — it may have been removed.';
    case 'below_active_count':
      return ctx?.activeCount != null
        ? `Can't set below ${ctx.activeCount} already enrolled.`
        : "Can't set below the number already enrolled.";
    case 'cycle_full':
      return 'Cycle is full — raise the max participants first.';
    case 'already_enrolled':
      return 'That user is already enrolled in this cycle.';
    case 'cycle_not_joinable':
      return 'This cycle is not open for new enrollments.';
    default:
      return raw;
  }
}

// ── form state ────────────────────────────────────────────────────────────

type OpenForm = {
  challenge_id: string;
  start_date: string;
  max_participants: string;
};

const EMPTY_OPEN_FORM: OpenForm = {
  challenge_id: '',
  start_date: todayISO(),
  max_participants: '50',
};

const STATUS_OPTIONS: ('all' | ChallengeCycleStatus)[] = ['all', 'enrollment_open', 'running', 'completed'];

const tableActionBtnStyle: React.CSSProperties = {
  background: colors.bg3,
  color: colors.text,
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  padding: '5px 10px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

// ── page ──────────────────────────────────────────────────────────────────

export function CyclesPage() {
  const [rows, setRows] = useState<ChallengeCycleRow[]>([]);
  const [challenges, setChallenges] = useState<MoneyChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [challengeFilter, setChallengeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ChallengeCycleStatus>('all');

  // Open-new-cycle modal
  const [openModalOpen, setOpenModalOpen] = useState(false);
  const [openForm, setOpenForm] = useState<OpenForm>(EMPTY_OPEN_FORM);
  const [openFormErr, setOpenFormErr] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  // Winners details modal
  const [detailsRow, setDetailsRow] = useState<ChallengeCycleRow | null>(null);
  const [winners, setWinners] = useState<CycleWinnerRow[] | null>(null);
  const [winnersLoading, setWinnersLoading] = useState(false);
  const [winnersErr, setWinnersErr] = useState<string | null>(null);

  // Edit-slots modal
  const [editRow, setEditRow] = useState<ChallengeCycleRow | null>(null);
  const [editMax, setEditMax] = useState('');
  const [editErr, setEditErr] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Add-participant modal
  const [addRow, setAddRow] = useState<ChallengeCycleRow | null>(null);
  const [addSearch, setAddSearch] = useState('');
  const [addDebounced, setAddDebounced] = useState('');
  const [addUsers, setAddUsers] = useState<AdminUserRow[]>([]);
  const [addUsersLoading, setAddUsersLoading] = useState(false);
  const [addSelectedUser, setAddSelectedUser] = useState<AdminUserRow | null>(null);
  const [addErr, setAddErr] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);

  const refresh = async (challengeId: string | null = challengeFilter === 'all' ? null : challengeFilter) => {
    setLoading(true);
    setErr(null);
    try {
      const list = await listChallengeCycles(challengeId);
      setRows(list);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load cycles');
    } finally {
      setLoading(false);
    }
  };

  const loadChallenges = async () => {
    try {
      const list = await listMoneyChallenges();
      setChallenges(list);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load challenges');
    }
  };

  // Initial mount: parallel fetch of cycles + challenges.
  useEffect(() => {
    void Promise.all([refresh(null), loadChallenges()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch cycles whenever the challenge filter changes.
  useEffect(() => {
    void refresh(challengeFilter === 'all' ? null : challengeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeFilter]);

  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') return rows;
    return rows.filter((r) => r.status === statusFilter);
  }, [rows, statusFilter]);

  const openCreateModal = () => {
    setOpenForm({
      ...EMPTY_OPEN_FORM,
      challenge_id: challengeFilter !== 'all' ? challengeFilter : (challenges[0]?.id ?? ''),
    });
    setOpenFormErr(null);
    setOpenModalOpen(true);
  };

  const closeOpenModal = () => {
    if (opening) return;
    setOpenModalOpen(false);
    setOpenForm(EMPTY_OPEN_FORM);
    setOpenFormErr(null);
  };

  const handleOpenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openForm.challenge_id) {
      setOpenFormErr('Challenge is required.');
      return;
    }
    const maxN = Number(openForm.max_participants);
    if (!Number.isFinite(maxN) || maxN <= 0) {
      setOpenFormErr('Max participants must be greater than 0.');
      return;
    }
    setOpening(true);
    setOpenFormErr(null);
    try {
      const result = await openNextCycle(
        openForm.challenge_id,
        openForm.start_date || null,
        maxN,
      );
      setSuccessMsg(
        `Opened cycle ${result.cycle_id.slice(0, 8)} · ${result.promoted_from_waitlist} promoted from waitlist`,
      );
      setOpenModalOpen(false);
      setOpenForm(EMPTY_OPEN_FORM);
      await refresh(challengeFilter === 'all' ? null : challengeFilter);
    } catch (e2) {
      setOpenFormErr(e2 instanceof Error ? e2.message : 'Failed to open cycle');
    } finally {
      setOpening(false);
    }
  };

  const openDetails = async (row: ChallengeCycleRow) => {
    setDetailsRow(row);
    setWinners(null);
    setWinnersErr(null);
    if (row.status !== 'completed') return;
    setWinnersLoading(true);
    try {
      const list = await listCycleWinners(row.id);
      setWinners(list);
    } catch (e) {
      setWinnersErr(e instanceof Error ? e.message : 'Failed to load winners');
    } finally {
      setWinnersLoading(false);
    }
  };

  const closeDetails = () => {
    setDetailsRow(null);
    setWinners(null);
    setWinnersErr(null);
  };

  // ── Edit slots ────────────────────────────────────────────────────────────

  const openEditModal = (row: ChallengeCycleRow) => {
    setEditRow(row);
    setEditMax(String(row.max_participants));
    setEditErr(null);
  };

  const closeEditModal = () => {
    if (editSaving) return;
    setEditRow(null);
    setEditMax('');
    setEditErr(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRow) return;
    const maxN = Number(editMax);
    if (!Number.isFinite(maxN) || maxN <= 0) {
      setEditErr('Max participants must be greater than 0.');
      return;
    }
    setEditSaving(true);
    setEditErr(null);
    try {
      const result = await setCycleMaxParticipants(editRow.id, maxN);
      setSuccessMsg(
        `Cycle ${result.cycle_id.slice(0, 8)} · max now ${result.max_participants} · ${result.active_count} active`,
      );
      setEditRow(null);
      setEditMax('');
      await refresh(challengeFilter === 'all' ? null : challengeFilter);
    } catch (e2) {
      const raw = e2 instanceof Error ? e2.message : 'Failed to update slots';
      setEditErr(friendlyCycleError(raw, { activeCount: editRow.active_count }));
    } finally {
      setEditSaving(false);
    }
  };

  // ── Add participant ───────────────────────────────────────────────────────

  const openAddModal = (row: ChallengeCycleRow) => {
    setAddRow(row);
    setAddSearch('');
    setAddDebounced('');
    setAddUsers([]);
    setAddSelectedUser(null);
    setAddErr(null);
  };

  const closeAddModal = () => {
    if (addSaving) return;
    setAddRow(null);
    setAddSearch('');
    setAddDebounced('');
    setAddUsers([]);
    setAddSelectedUser(null);
    setAddErr(null);
  };

  // Debounce the participant search input.
  useEffect(() => {
    if (!addRow) return;
    const t = setTimeout(() => setAddDebounced(addSearch.trim()), 250);
    return () => clearTimeout(t);
  }, [addSearch, addRow]);

  // Fetch matching users whenever the (debounced) search changes while the modal is open.
  useEffect(() => {
    if (!addRow) return;
    let cancelled = false;
    setAddUsersLoading(true);
    void (async () => {
      try {
        const list = await listUsers(addDebounced.length > 0 ? addDebounced : null, 25, 0);
        if (!cancelled) setAddUsers(list);
      } catch {
        if (!cancelled) setAddUsers([]);
      } finally {
        if (!cancelled) setAddUsersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addDebounced, addRow]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addRow) return;
    if (!addSelectedUser) {
      setAddErr('Pick a user to enroll.');
      return;
    }
    setAddSaving(true);
    setAddErr(null);
    try {
      const result = await addEnrollment(addRow.id, addSelectedUser.id);
      const who = addSelectedUser.email ?? addSelectedUser.id.slice(0, 8);
      setSuccessMsg(
        `Enrolled ${who} · cycle ${result.cycle_id.slice(0, 8)} · ${result.active_count} active`,
      );
      setAddRow(null);
      setAddSelectedUser(null);
      await refresh(challengeFilter === 'all' ? null : challengeFilter);
    } catch (e2) {
      const raw = e2 instanceof Error ? e2.message : 'Failed to add participant';
      setAddErr(friendlyCycleError(raw));
    } finally {
      setAddSaving(false);
    }
  };

  const columns: Column<ChallengeCycleRow>[] = useMemo(
    () => [
      {
        key: 'challenge',
        header: 'Challenge',
        render: (r) => (
          <div>
            <div style={{ fontWeight: 600, color: colors.text }}>{r.challenge_title}</div>
            <div style={{ color: colors.dim, fontSize: 11, marginTop: 2 }}>{r.challenge_id}</div>
          </div>
        ),
        sort: (a, b) => a.challenge_id.localeCompare(b.challenge_id),
      },
      {
        key: 'status',
        header: 'Status',
        render: (r) => <span style={statusChipStyle(r.status)}>{r.status}</span>,
        sort: (a, b) => a.status.localeCompare(b.status),
      },
      {
        key: 'window',
        header: 'Window',
        render: (r) => (
          <span style={{ color: colors.muted, fontSize: 12 }}>
            {formatWindow(r.start_date, r.end_date)}
          </span>
        ),
        sort: (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
      },
      {
        key: 'slots',
        header: 'Slots',
        align: 'right',
        render: (r) => (
          <span style={{ color: colors.text, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 700, letterSpacing: 0.4 }}>
            {r.active_count} <span style={{ color: colors.dim, fontSize: 12 }}>/ {r.max_participants}</span>
          </span>
        ),
        sort: (a, b) => a.active_count - b.active_count,
      },
      {
        key: 'completed',
        header: 'Completed',
        align: 'right',
        render: (r) => (
          <span style={{ color: colors.text, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 700, letterSpacing: 0.4 }}>
            {r.completed_count}
          </span>
        ),
        sort: (a, b) => a.completed_count - b.completed_count,
      },
      {
        key: 'payouts',
        header: 'Payouts',
        render: (r) => {
          const total = r.payouts_paid + r.payouts_pending;
          const allPaid = total > 0 && r.payouts_pending === 0;
          let chipBg: string = colors.bg3;
          let chipFg: string = colors.muted;
          if (allPaid) {
            chipBg = colors.successDim;
            chipFg = colors.success;
          } else if (r.payouts_pending > 0) {
            chipBg = colors.warningDim;
            chipFg = colors.warning;
          }
          return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: colors.muted, fontSize: 12 }}>
                {r.payouts_paid} paid · {r.payouts_pending} pending
              </span>
              {total > 0 && (
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 8,
                    background: chipBg,
                    color: chipFg,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.4,
                  }}
                >
                  {total}
                </span>
              )}
            </span>
          );
        },
        sort: (a, b) => (a.payouts_paid + a.payouts_pending) - (b.payouts_paid + b.payouts_pending),
      },
      {
        key: 'owed',
        header: 'Owed',
        align: 'right',
        render: (r) =>
          r.total_owed > 0 ? (
            <span style={{ color: colors.warning, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 700, letterSpacing: 0.4 }}>
              €{r.total_owed.toFixed(2)}
            </span>
          ) : (
            <span style={{ color: colors.dim, fontSize: 12 }}>—</span>
          ),
        sort: (a, b) => a.total_owed - b.total_owed,
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (r) =>
          r.status === 'completed' ? (
            <span style={{ color: colors.dim, fontSize: 12 }}>—</span>
          ) : (
            <span style={{ display: 'inline-flex', gap: 6 }}>
              <button
                type="button"
                style={tableActionBtnStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  openEditModal(r);
                }}
              >
                Edit slots
              </button>
              <button
                type="button"
                style={tableActionBtnStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  openAddModal(r);
                }}
              >
                Add participant
              </button>
            </span>
          ),
      },
    ],
    [],
  );

  const totalCount = rows.length;
  const enrollmentOpenCount = rows.filter((r) => r.status === 'enrollment_open').length;
  const runningCount = rows.filter((r) => r.status === 'running').length;
  const completedCount = rows.filter((r) => r.status === 'completed').length;

  return (
    <div style={{ padding: 0 }}>
      <div style={headerRowStyle}>
        <div>
          <h1 style={h1Style}>Cycles</h1>
          <div style={statsStyle}>
            Individual timed runs of a challenge (sets the start date, window &amp; spots).
          </div>
          <div style={statsStyle}>
            {loading
              ? 'Loading…'
              : `${totalCount} total · ${enrollmentOpenCount} enrollment_open · ${runningCount} running · ${completedCount} completed`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            variant="secondary"
            onClick={() => refresh(challengeFilter === 'all' ? null : challengeFilter)}
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
          <Button variant="primary" onClick={openCreateModal}>
            + Open new cycle
          </Button>
        </div>
      </div>

      {err && (
        <div style={errorBannerStyle}>
          <span>{err}</span>
          <button onClick={() => setErr(null)} aria-label="Dismiss" style={dismissBtnStyle}>
            ×
          </button>
        </div>
      )}

      {successMsg && (
        <div style={successBannerStyle}>
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} aria-label="Dismiss" style={dismissBtnStyle}>
            ×
          </button>
        </div>
      )}

      <div style={filterRowStyle}>
        <div style={{ minWidth: 240 }}>
          <Field label="Challenge">
            <Select value={challengeFilter} onChange={(e) => setChallengeFilter(e.target.value)}>
              <option value="all">All challenges</option>
              {challenges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div style={{ minWidth: 200 }}>
          <Field label="Status">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | ChallengeCycleStatus)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === 'all' ? 'All' : s}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>

      <DataTable
        rows={filteredRows}
        columns={columns}
        rowKey={(r) => r.id}
        onRowClick={(r) => void openDetails(r)}
        emptyLabel={loading ? 'Loading…' : 'No cycles match these filters.'}
      />

      {/* Open new cycle modal */}
      <Modal open={openModalOpen} onClose={closeOpenModal} title="Open new cycle" width={520}>
        <form onSubmit={handleOpenSubmit}>
          {openFormErr && <div style={errorBannerStyle}><span>{openFormErr}</span></div>}

          <Field label="Challenge">
            <Select
              value={openForm.challenge_id}
              onChange={(e) => setOpenForm((f) => ({ ...f, challenge_id: e.target.value }))}
              required
            >
              <option value="">Select a challenge…</option>
              {challenges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Start date">
              <TextInput
                type="date"
                value={openForm.start_date}
                onChange={(e) => setOpenForm((f) => ({ ...f, start_date: e.target.value }))}
              />
            </Field>
            <Field label="Max participants">
              <TextInput
                type="number"
                min={1}
                value={openForm.max_participants}
                onChange={(e) => setOpenForm((f) => ({ ...f, max_participants: e.target.value }))}
                required
              />
            </Field>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <Button type="button" variant="ghost" onClick={closeOpenModal} disabled={opening}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={opening}>
              {opening ? 'Opening…' : 'Open cycle'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Winners / details modal */}
      <Modal
        open={!!detailsRow}
        onClose={closeDetails}
        title={detailsRow ? `Winners — ${detailsRow.challenge_title}` : 'Winners'}
        width={760}
      >
        {detailsRow && (
          <div>
            <div
              style={{
                fontSize: 12,
                color: colors.muted,
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <span style={statusChipStyle(detailsRow.status)}>{detailsRow.status}</span>
              <span>{formatWindow(detailsRow.start_date, detailsRow.end_date)}</span>
              <span>·</span>
              <span>
                {detailsRow.active_count} / {detailsRow.max_participants} active
              </span>
              <span>·</span>
              <span>{detailsRow.completed_count} completed</span>
            </div>

            {detailsRow.status !== 'completed' ? (
              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  background: colors.bg3,
                  border: `1px solid ${colors.border}`,
                  color: colors.muted,
                  fontSize: 13,
                }}
              >
                Cycle still running. Winners will appear here once it ends.
              </div>
            ) : winnersLoading ? (
              <div style={{ color: colors.muted, padding: 12 }}>Loading…</div>
            ) : winnersErr ? (
              <div style={errorBannerStyle}><span>{winnersErr}</span></div>
            ) : !winners || winners.length === 0 ? (
              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  background: colors.bg3,
                  border: `1px solid ${colors.border}`,
                  color: colors.muted,
                  fontSize: 13,
                }}
              >
                No completers in this cycle.
              </div>
            ) : (
              <div
                style={{
                  background: colors.bg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 12,
                  overflow: 'auto',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: colors.bg3, borderBottom: `1px solid ${colors.border}` }}>
                      <th style={thStyle}>Email</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Days</th>
                      <th style={thStyle}>Payout</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                      <th style={thStyle}>Paid at</th>
                    </tr>
                  </thead>
                  <tbody>
                    {winners.map((w) => (
                      <tr key={w.enrollment_id} style={{ borderBottom: `1px solid ${colors.border}`, color: colors.text }}>
                        <td style={tdStyle}>{w.user_email ?? <span style={{ color: colors.dim }}>—</span>}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{w.completed_days}</td>
                        <td style={tdStyle}>
                          {w.payout_status ? (
                            <span style={payoutStatusChipStyle(w.payout_status)}>{w.payout_status}</span>
                          ) : (
                            <span style={{ color: colors.dim }}>—</span>
                          )}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          {w.payout_amount != null ? `€${Number(w.payout_amount).toFixed(2)}` : <span style={{ color: colors.dim }}>—</span>}
                        </td>
                        <td style={{ ...tdStyle, color: colors.muted, fontSize: 12 }}>
                          {formatDateTime(w.payout_paid_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <Button type="button" variant="ghost" onClick={closeDetails}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit slots modal */}
      <Modal
        open={!!editRow}
        onClose={closeEditModal}
        title={editRow ? `Edit slots — ${editRow.challenge_title}` : 'Edit slots'}
        width={480}
      >
        {editRow && (
          <form onSubmit={handleEditSubmit}>
            {editErr && <div style={errorBannerStyle}><span>{editErr}</span></div>}

            <div
              style={{
                fontSize: 12,
                color: colors.muted,
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <span style={statusChipStyle(editRow.status)}>{editRow.status}</span>
              <span>{formatWindow(editRow.start_date, editRow.end_date)}</span>
              <span>·</span>
              <span>
                {editRow.active_count} / {editRow.max_participants} active
              </span>
            </div>

            <Field
              label="Max participants"
              hint={`Cannot go below the ${editRow.active_count} currently enrolled.`}
            >
              <TextInput
                type="number"
                min={1}
                value={editMax}
                onChange={(e) => setEditMax(e.target.value)}
                required
                autoFocus
              />
            </Field>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
              <Button type="button" variant="ghost" onClick={closeEditModal} disabled={editSaving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={editSaving}>
                {editSaving ? 'Saving…' : 'Save slots'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Add participant modal */}
      <Modal
        open={!!addRow}
        onClose={closeAddModal}
        title={addRow ? `Add participant — ${addRow.challenge_title}` : 'Add participant'}
        width={560}
      >
        {addRow && (
          <form onSubmit={handleAddSubmit}>
            {addErr && <div style={errorBannerStyle}><span>{addErr}</span></div>}

            <div
              style={{
                fontSize: 12,
                color: colors.muted,
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <span style={statusChipStyle(addRow.status)}>{addRow.status}</span>
              <span>
                {addRow.active_count} / {addRow.max_participants} active
              </span>
            </div>

            <Field label="Search user" hint="Search by email or name.">
              <TextInput
                type="text"
                value={addSearch}
                onChange={(e) => {
                  setAddSearch(e.target.value);
                  setAddSelectedUser(null);
                }}
                placeholder="email@example.com"
                autoFocus
              />
            </Field>

            <div
              style={{
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                maxHeight: 260,
                overflow: 'auto',
                marginBottom: 12,
              }}
            >
              {addUsersLoading ? (
                <div style={{ padding: 12, color: colors.muted, fontSize: 13 }}>Searching…</div>
              ) : addUsers.length === 0 ? (
                <div style={{ padding: 12, color: colors.muted, fontSize: 13 }}>No users match.</div>
              ) : (
                addUsers.map((u) => {
                  const selected = addSelectedUser?.id === u.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setAddSelectedUser(u)}
                      style={{
                        display: 'flex',
                        width: '100%',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        padding: '9px 12px',
                        background: selected ? colors.successDim : 'transparent',
                        border: 'none',
                        borderBottom: `1px solid ${colors.border}`,
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: colors.text,
                        fontSize: 13,
                      }}
                    >
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontWeight: 600 }}>
                          {u.email ?? <span style={{ color: colors.dim }}>(no email)</span>}
                        </span>
                        <span style={{ color: colors.dim, fontSize: 11 }}>
                          {u.name ?? u.id}
                        </span>
                      </span>
                      {selected && (
                        <span style={{ color: colors.success, fontWeight: 700, fontSize: 12 }}>✓ selected</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <Button type="button" variant="ghost" onClick={closeAddModal} disabled={addSaving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={addSaving || !addSelectedUser}>
                {addSaving ? 'Enrolling…' : 'Add participant'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  color: colors.muted,
  fontWeight: 600,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  verticalAlign: 'middle',
};
