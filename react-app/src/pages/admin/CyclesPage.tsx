import { useEffect, useMemo, useState } from 'react';
import { colors } from '../../theme';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { Field, TextInput, Select, Button } from '../../components/admin/FormField';
import { Modal } from '../../components/admin/Modal';
import {
  listChallengeCycles,
  openNextCycle,
  listCycleWinners,
  listCycleEnrollments,
  cycleSessionSummary,
  listMoneyChallenges,
  setCycleMaxParticipants,
  addEnrollment,
  setCycleStatus,
  cancelCycle,
  setCycleWindow,
  withRecentAuth,
  listUsers,
  type ChallengeCycleRow,
  type ChallengeCycleStatus,
  type CycleWinnerRow,
  type CycleEnrollmentRow,
  type MoneyChallenge,
  type AdminUserRow,
} from '../../lib/adminApi';
import { errMessage } from '../../lib/errors';

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
  } else if (status === 'cancelled') {
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

function enrollmentStatusChipStyle(status: string): React.CSSProperties {
  let bg: string = colors.bg3;
  let fg: string = colors.muted;
  if (status === 'active') {
    bg = colors.successDim;
    fg = colors.success;
  } else if (status === 'completed') {
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

/** ISO timestamp → 'YYYY-MM-DDTHH:mm' for a <input type="datetime-local">. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
    case 'invalid_seed':
      return 'Seed must be 0 or more and less than the headline total.';
    case 'already_enrolled':
      return 'That user is already enrolled in this cycle.';
    case 'cycle_not_joinable':
      return 'This cycle is not open for new enrollments.';
    case 'cycle_completed':
      return 'This cycle is already completed — payouts are finalized, so it can’t be cancelled or edited.';
    case 'cycle_has_payouts':
      return 'This cycle already has payouts — it can’t be cancelled.';
    case 'already_cancelled':
      return 'This cycle is already cancelled.';
    case 'window_invalid':
      return 'Start date must be on or before the end date.';
    default:
      return raw;
  }
}

// ── seed helpers ──────────────────────────────────────────────────────────
// `max_participants` is the REAL payable cap; `display_seed` is cosmetic
// phantom slots. The admin works in terms of HEADLINE (what users see) and
// SEED, where realCap = headline − seed.

/** Phantom slots for a row, defaulting missing/undefined to 0. */
function seedOf(r: ChallengeCycleRow): number {
  return r.display_seed ?? 0;
}

/** User-facing headline total = real cap + seed. */
function headlineTotalOf(r: ChallengeCycleRow): number {
  return r.max_participants + seedOf(r);
}

// ── form state ────────────────────────────────────────────────────────────

type OpenForm = {
  challenge_id: string;
  start_date: string;
  // Headline total shown to users; real cap = headline − seed.
  headline_total: string;
  // Cosmetic phantom slots.
  seed: string;
};

const EMPTY_OPEN_FORM: OpenForm = {
  challenge_id: '',
  start_date: todayISO(),
  headline_total: '50',
  seed: '0',
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

  // Participants (enrollments) modal
  const [participantsRow, setParticipantsRow] = useState<ChallengeCycleRow | null>(null);
  const [participants, setParticipants] = useState<CycleEnrollmentRow[] | null>(null);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsErr, setParticipantsErr] = useState<string | null>(null);
  // user_id -> real training minutes/sessions for this cycle (best-effort audit signal)
  const [sessionMins, setSessionMins] = useState<Record<string, { sessions: number; minutes: number }>>({});

  // Edit-slots modal
  const [editRow, setEditRow] = useState<ChallengeCycleRow | null>(null);
  const [editHeadline, setEditHeadline] = useState('');
  const [editSeed, setEditSeed] = useState('');
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

  // Inline status toggle (reopen / start) — tracks which cycle is updating.
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null);

  const handleSetStatus = async (
    row: ChallengeCycleRow,
    newStatus: 'enrollment_open' | 'running',
  ) => {
    const verb =
      newStatus === 'enrollment_open'
        ? 'Reopen enrollment for'
        : 'Close enrollment (start now) for';
    if (!confirm(`${verb} "${row.challenge_title}"?`)) return;
    setStatusSavingId(row.id);
    setErr(null);
    setSuccessMsg(null);
    try {
      await setCycleStatus(row.id, newStatus);
      setSuccessMsg(
        newStatus === 'enrollment_open'
          ? 'Enrollment reopened — users can join again.'
          : 'Enrollment closed — the cycle is now running.',
      );
      await refresh();
    } catch (e) {
      setErr(errMessage(e));
    } finally {
      setStatusSavingId(null);
    }
  };

  // Cancel / interrupt a running or open cycle (soft-cancel). Destructive →
  // step-up reauth, then a confirm. Refused server-side for completed/paid cycles.
  const [cancelSavingId, setCancelSavingId] = useState<string | null>(null);
  const handleCancelCycle = async (row: ChallengeCycleRow) => {
    if (
      !confirm(
        `Cancel the cycle for "${row.challenge_title}"?\n\nThis ends the cycle now and releases its ${row.active_count} active participant(s). No payouts are made. This cannot be undone.`,
      )
    )
      return;
    setCancelSavingId(row.id);
    setErr(null);
    setSuccessMsg(null);
    try {
      const r = await withRecentAuth(() => cancelCycle(row.id));
      setSuccessMsg(`Cycle cancelled — ${r.removed_enrollments ?? 0} participant(s) released.`);
      await refresh();
    } catch (e) {
      setErr(friendlyCycleError(errMessage(e)));
    } finally {
      setCancelSavingId(null);
    }
  };

  // Edit enrollment window (enrollment_opens_at / start / end) modal.
  const [windowRow, setWindowRow] = useState<ChallengeCycleRow | null>(null);
  const [windowForm, setWindowForm] = useState({ opensAt: '', startDate: '', endDate: '' });
  const [windowErr, setWindowErr] = useState<string | null>(null);
  const [windowSaving, setWindowSaving] = useState(false);
  const openWindowModal = (row: ChallengeCycleRow) => {
    setWindowRow(row);
    setWindowErr(null);
    setWindowForm({
      opensAt: row.enrollment_opens_at ? toLocalInput(row.enrollment_opens_at) : '',
      startDate: row.start_date,
      endDate: row.end_date,
    });
  };
  const handleWindowSubmit = async () => {
    if (!windowRow) return;
    if (windowForm.startDate && windowForm.endDate && windowForm.startDate > windowForm.endDate) {
      setWindowErr('Start date must be on or before the end date.');
      return;
    }
    setWindowSaving(true);
    setWindowErr(null);
    try {
      const r = await setCycleWindow(windowRow.id, {
        enrollmentOpensAt: windowForm.opensAt ? new Date(windowForm.opensAt).toISOString() : null,
        startDate: windowForm.startDate || null,
        endDate: windowForm.endDate || null,
      });
      setWindowRow(null);
      setSuccessMsg(
        `Window updated${r.shifted_enrollments ? ` — ${r.shifted_enrollments} active participant(s) shifted` : ''}.`,
      );
      await refresh();
    } catch (e) {
      setWindowErr(friendlyCycleError(errMessage(e)));
    } finally {
      setWindowSaving(false);
    }
  };

  const refresh = async (challengeId: string | null = challengeFilter === 'all' ? null : challengeFilter) => {
    setLoading(true);
    setErr(null);
    try {
      const list = await listChallengeCycles(challengeId);
      setRows(list);
    } catch (e) {
      setErr(errMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const loadChallenges = async () => {
    try {
      const list = await listMoneyChallenges();
      setChallenges(list);
    } catch (e) {
      setErr(errMessage(e));
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
    const headlineN = Number(openForm.headline_total);
    if (!Number.isFinite(headlineN) || headlineN <= 0) {
      setOpenFormErr('Headline total must be greater than 0.');
      return;
    }
    const seedN = Number(openForm.seed);
    if (!Number.isInteger(seedN) || seedN < 0 || seedN >= headlineN) {
      setOpenFormErr('Seed must be 0 or more and less than the headline total.');
      return;
    }
    const realCap = headlineN - seedN;
    setOpening(true);
    setOpenFormErr(null);
    try {
      const result = await openNextCycle(
        openForm.challenge_id,
        openForm.start_date || null,
        realCap,
      );
      // Seed is set in a second step: openNextCycle has no seed param.
      if (seedN > 0) {
        await setCycleMaxParticipants(result.cycle_id, realCap, seedN);
      }
      setSuccessMsg(
        `Opened cycle ${result.cycle_id.slice(0, 8)} · shows ${headlineN} · pays ${realCap}`,
      );
      setOpenModalOpen(false);
      setOpenForm(EMPTY_OPEN_FORM);
      await refresh(challengeFilter === 'all' ? null : challengeFilter);
    } catch (e2) {
      const raw = errMessage(e2);
      setOpenFormErr(friendlyCycleError(raw));
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
      setWinnersErr(errMessage(e));
    } finally {
      setWinnersLoading(false);
    }
  };

  const closeDetails = () => {
    setDetailsRow(null);
    setWinners(null);
    setWinnersErr(null);
  };

  const openParticipants = async (row: ChallengeCycleRow) => {
    setParticipantsRow(row);
    setParticipants(null);
    setParticipantsErr(null);
    setParticipantsLoading(true);
    try {
      const list = await listCycleEnrollments(row.id);
      setParticipants(list);
      // Real training minutes are a best-effort audit signal — don't fail the
      // participants view if the session summary can't load.
      try {
        const summary = await cycleSessionSummary(row.id);
        const m: Record<string, { sessions: number; minutes: number }> = {};
        for (const s of summary) m[s.user_id] = { sessions: s.sessions, minutes: s.total_minutes };
        setSessionMins(m);
      } catch {
        setSessionMins({});
      }
    } catch (e) {
      setParticipantsErr(errMessage(e));
    } finally {
      setParticipantsLoading(false);
    }
  };

  const closeParticipants = () => {
    setParticipantsRow(null);
    setParticipants(null);
    setParticipantsErr(null);
    setSessionMins({});
  };

  // ── Edit slots ────────────────────────────────────────────────────────────

  const openEditModal = (row: ChallengeCycleRow) => {
    setEditRow(row);
    setEditHeadline(String(headlineTotalOf(row)));
    setEditSeed(String(seedOf(row)));
    setEditErr(null);
  };

  const closeEditModal = () => {
    if (editSaving) return;
    setEditRow(null);
    setEditHeadline('');
    setEditSeed('');
    setEditErr(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRow) return;
    const headlineN = Number(editHeadline);
    if (!Number.isFinite(headlineN) || headlineN <= 0) {
      setEditErr('Headline total must be greater than 0.');
      return;
    }
    const seedN = Number(editSeed);
    if (!Number.isInteger(seedN) || seedN < 0 || seedN >= headlineN) {
      setEditErr('Seed must be 0 or more and less than the headline total.');
      return;
    }
    const realCap = headlineN - seedN;
    setEditSaving(true);
    setEditErr(null);
    try {
      const result = await setCycleMaxParticipants(editRow.id, realCap, seedN);
      const shows = result.max_participants + result.display_seed;
      setSuccessMsg(
        `Cycle ${result.cycle_id.slice(0, 8)} · shows ${shows} · pays ${result.max_participants} · ${result.active_count} active`,
      );
      setEditRow(null);
      setEditHeadline('');
      setEditSeed('');
      await refresh(challengeFilter === 'all' ? null : challengeFilter);
    } catch (e2) {
      const raw = errMessage(e2);
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
      const raw = errMessage(e2);
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
        render: (r) => {
          const seed = seedOf(r);
          const displayActive = r.active_count + seed;
          const displayTotal = headlineTotalOf(r);
          return (
            <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
              <span style={{ color: colors.text, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 700, letterSpacing: 0.4 }}>
                {displayActive} <span style={{ color: colors.dim, fontSize: 12 }}>/ {displayTotal}</span>
              </span>
              {seed > 0 && (
                <span style={{ color: colors.dim, fontSize: 11 }}>pays {r.max_participants}</span>
              )}
            </span>
          );
        },
        // Sort by the user-facing active count (real + seed).
        sort: (a, b) => (a.active_count + seedOf(a)) - (b.active_count + seedOf(b)),
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
          r.status === 'completed' || r.status === 'cancelled' ? (
            <span style={{ display: 'inline-flex', gap: 6 }}>
              <button
                type="button"
                style={tableActionBtnStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  void openParticipants(r);
                }}
              >
                Participants
              </button>
            </span>
          ) : (
            <span style={{ display: 'inline-flex', gap: 6 }}>
              <button
                type="button"
                style={tableActionBtnStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  void openParticipants(r);
                }}
              >
                Participants
              </button>
              {r.status === 'running' && (
                <button
                  type="button"
                  style={tableActionBtnStyle}
                  disabled={statusSavingId === r.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleSetStatus(r, 'enrollment_open');
                  }}
                  title="Let users join again (date window stays open so they can also record)"
                >
                  {statusSavingId === r.id ? '…' : 'Reopen'}
                </button>
              )}
              {r.status === 'enrollment_open' && (
                <button
                  type="button"
                  style={tableActionBtnStyle}
                  disabled={statusSavingId === r.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleSetStatus(r, 'running');
                  }}
                  title="Close enrollment and start the cycle now"
                >
                  {statusSavingId === r.id ? '…' : 'Start now'}
                </button>
              )}
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
              <button
                type="button"
                style={tableActionBtnStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  openWindowModal(r);
                }}
                title="Edit the enrollment-open time, start date and end date"
              >
                Edit window
              </button>
              <button
                type="button"
                style={{ ...tableActionBtnStyle, color: colors.error, borderColor: colors.error }}
                disabled={cancelSavingId === r.id}
                onClick={(e) => {
                  e.stopPropagation();
                  void handleCancelCycle(r);
                }}
                title="Interrupt this cycle now and release participants (no payouts)"
              >
                {cancelSavingId === r.id ? '…' : 'Cancel'}
              </button>
            </span>
          ),
      },
    ],
    // Recompute when a status toggle is in-flight so the Reopen/Start buttons
    // reflect the saving state (and capture the current handleSetStatus).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [statusSavingId],
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

          <Field label="Start date">
            <TextInput
              type="date"
              value={openForm.start_date}
              onChange={(e) => setOpenForm((f) => ({ ...f, start_date: e.target.value }))}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Headline total (shown to users)">
              <TextInput
                type="number"
                min={1}
                value={openForm.headline_total}
                onChange={(e) => setOpenForm((f) => ({ ...f, headline_total: e.target.value }))}
                required
              />
            </Field>
            <Field
              label="Seed (phantom slots)"
              hint={`Real payable cap = ${(() => {
                const h = Number(openForm.headline_total);
                const s = Number(openForm.seed);
                return Number.isFinite(h) && Number.isFinite(s) ? Math.max(0, h - s) : '—';
              })()}.`}
            >
              <TextInput
                type="number"
                min={0}
                value={openForm.seed}
                onChange={(e) => setOpenForm((f) => ({ ...f, seed: e.target.value }))}
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

      {/* Participants (enrollments) modal */}
      <Modal
        open={!!participantsRow}
        onClose={closeParticipants}
        title={participantsRow ? `Participants — ${participantsRow.challenge_title}` : 'Participants'}
        width={860}
      >
        {participantsRow && (
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
              <span style={statusChipStyle(participantsRow.status)}>{participantsRow.status}</span>
              <span>{formatWindow(participantsRow.start_date, participantsRow.end_date)}</span>
              <span>·</span>
              <span>
                {participantsRow.active_count} / {participantsRow.max_participants} active
              </span>
              <span>·</span>
              <span>{participantsRow.completed_count} completed</span>
            </div>

            {participantsLoading ? (
              <div style={{ color: colors.muted, padding: 12 }}>Loading…</div>
            ) : participantsErr ? (
              <div style={errorBannerStyle}><span>{participantsErr}</span></div>
            ) : !participants || participants.length === 0 ? (
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
                No participants yet.
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
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Tier</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Days</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Minutes</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Freeze</th>
                      <th style={thStyle}>Joined</th>
                      <th style={thStyle}>Last active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((p) => (
                      <tr key={p.enrollment_id} style={{ borderBottom: `1px solid ${colors.border}`, color: colors.text }}>
                        <td style={tdStyle}>{p.email ?? <span style={{ color: colors.dim }}>—</span>}</td>
                        <td style={tdStyle}>
                          <span style={enrollmentStatusChipStyle(p.status)}>{p.status}</span>
                        </td>
                        <td style={tdStyle}>{p.tier_at_enrollment}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{p.completed_days}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          {sessionMins[p.user_id] ? (
                            <span title={`${sessionMins[p.user_id].sessions} session(s)`}>
                              {sessionMins[p.user_id].minutes}
                              <span style={{ color: colors.dim, fontSize: 11 }}> ({sessionMins[p.user_id].sessions})</span>
                            </span>
                          ) : (
                            <span style={{ color: colors.dim }}>—</span>
                          )}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          {p.freeze_tokens_remaining != null ? p.freeze_tokens_remaining : <span style={{ color: colors.dim }}>—</span>}
                        </td>
                        <td style={{ ...tdStyle, color: colors.muted, fontSize: 12 }}>
                          {formatDateTime(p.joined_at)}
                        </td>
                        <td style={{ ...tdStyle, color: colors.muted, fontSize: 12 }}>
                          {formatDateTime(p.last_active_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <Button type="button" variant="ghost" onClick={closeParticipants}>
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
                shows {editRow.active_count + seedOf(editRow)} / {headlineTotalOf(editRow)}
              </span>
              <span>·</span>
              <span>
                real cap {editRow.max_participants} · seed {seedOf(editRow)} · {editRow.active_count} active
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field
                label="Headline total (shown to users)"
                hint={(() => {
                  const h = Number(editHeadline);
                  const s = Number(editSeed);
                  return Number.isFinite(h) && Number.isFinite(s)
                    ? `Real payable cap = ${Math.max(0, h - s)}.`
                    : ' ';
                })()}
              >
                <TextInput
                  type="number"
                  min={1}
                  value={editHeadline}
                  onChange={(e) => setEditHeadline(e.target.value)}
                  required
                  autoFocus
                />
              </Field>
              <Field
                label="Seed (phantom slots)"
                hint={`Cannot set real cap below the ${editRow.active_count} currently enrolled.`}
              >
                <TextInput
                  type="number"
                  min={0}
                  value={editSeed}
                  onChange={(e) => setEditSeed(e.target.value)}
                  required
                />
              </Field>
            </div>

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

      {/* Edit enrollment window modal */}
      <Modal
        open={!!windowRow}
        onClose={() => setWindowRow(null)}
        title={windowRow ? `Edit window — ${windowRow.challenge_title}` : 'Edit window'}
        width={520}
      >
        {windowRow && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleWindowSubmit();
            }}
          >
            {windowErr && <div style={errorBannerStyle}><span>{windowErr}</span></div>}

            <div style={{ fontSize: 12, color: colors.muted, marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={statusChipStyle(windowRow.status)}>{windowRow.status}</span>
              <span>{formatWindow(windowRow.start_date, windowRow.end_date)}</span>
              <span>·</span>
              <span>{windowRow.active_count} active</span>
            </div>

            <Field
              label="Enrollment opens"
              hint="When users can start joining this cycle."
            >
              <TextInput
                type="datetime-local"
                value={windowForm.opensAt}
                onChange={(e) => setWindowForm((f) => ({ ...f, opensAt: e.target.value }))}
              />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Start date">
                <TextInput
                  type="date"
                  value={windowForm.startDate}
                  onChange={(e) => setWindowForm((f) => ({ ...f, startDate: e.target.value }))}
                  required
                />
              </Field>
              <Field
                label="End date"
                hint="Moving this shifts active participants' deadlines by the same amount."
              >
                <TextInput
                  type="date"
                  value={windowForm.endDate}
                  onChange={(e) => setWindowForm((f) => ({ ...f, endDate: e.target.value }))}
                  required
                />
              </Field>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
              <Button type="button" variant="ghost" onClick={() => setWindowRow(null)} disabled={windowSaving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={windowSaving}>
                {windowSaving ? 'Saving…' : 'Save window'}
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
