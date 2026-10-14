import { useEffect, useMemo, useState } from 'react';
import {
  fetchAiCoachUsage,
  aiCoachCostUsd,
  aiCoachCacheHitRate,
  AI_COACH_RATES_USD_PER_MTOK,
  type AiCoachUsage,
  type AiCoachDay,
  type AiCoachCapRow,
  type AiCoachFailure,
} from '../../lib/adminApi';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { Field, Select, Button } from '../../components/admin/FormField';
import { KpiCard } from '../../components/admin/KpiCard';
import { colors } from '../../theme';

// Everything on this page comes from `admin_ai_coach_usage(p_days)`, which
// returns counts and token sums and NOTHING ELSE. The coach stores no
// transcript — that was a decision (storing someone's training worries creates
// export and deletion obligations, and lets an admin read what a member told a
// coach in confidence), and the RPC's return shape is what keeps this panel
// structurally incapable of showing a conversation. There is no "view
// messages" affordance to add here, because there is no field to put one on.
// See libo-app-v2/supabase-migration-ai-coach-admin-rpc.sql.

const WINDOW_OPTIONS = [7, 14, 30, 60, 90];

const numberFmt = new Intl.NumberFormat();

// Spend here is tens of dollars a month, not hundreds, so cents matter and a
// rounded-to-the-dollar figure would read as zero for weeks. Sub-cent totals
// get an extra digit for the same reason.
const usd = (v: number) =>
  v > 0 && v < 0.01
    ? `$${v.toFixed(4)}`
    : v.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

const pct = (v: number) => `${Math.round(v * 100)}%`;

// Below this, the system-prompt cache is effectively not working and the bill
// is several times what it should be (docs/RUNBOOK-ai-coach-costs.md § Watching
// it). Not a tuned number — it is "obviously broken" versus "obviously fine";
// a healthy cached prefix puts this well above 80%.
const CACHE_HIT_FLOOR = 0.5;

const fmtDay = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    timeZone: 'UTC',
  });
};

const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const h1Style: React.CSSProperties = {
  fontFamily: 'Barlow Condensed, sans-serif',
  fontSize: 38,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  margin: '0 0 6px 0',
  color: colors.text,
};

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: 'Barlow Condensed, sans-serif',
  fontSize: 22,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  color: colors.text,
  margin: '28px 0 10px 0',
};

/** A full-width notice. `tone` only changes colour, never the wording. */
function Notice({
  tone,
  children,
}: {
  tone: 'neutral' | 'good' | 'warn' | 'bad';
  children: React.ReactNode;
}) {
  const palette = {
    neutral: { bg: colors.bg2, fg: colors.muted, border: colors.border },
    good: { bg: colors.successDim, fg: colors.success, border: colors.success },
    warn: { bg: colors.warningDim, fg: colors.warning, border: colors.warning },
    bad: { bg: colors.errorDim, fg: colors.error, border: colors.error },
  }[tone];
  return (
    <div
      style={{
        background: palette.bg,
        color: palette.fg,
        border: `1px solid ${palette.border}`,
        borderRadius: 12,
        padding: '14px 16px',
        marginBottom: 16,
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}

export function AiCoachPage() {
  const [days, setDays] = useState(14);
  // Bumped by Refresh. The effect keys off it so that the only place that
  // calls the RPC is the effect, and nothing sets state synchronously inside
  // it (react-hooks/set-state-in-effect) — the spinner is turned on by the
  // event handler that asked for the reload, not by the effect that serves it.
  const [reloadNonce, setReloadNonce] = useState(0);
  const [usage, setUsage] = useState<AiCoachUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Re-fetch whenever the window or the nonce changes; the RPC clamps the
    // window to 1..90 regardless of what we send.
    let cancelled = false;
    fetchAiCoachUsage(days)
      .then((u) => {
        if (cancelled) return;
        setUsage(u);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load AI coach usage');
        setUsage(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days, reloadNonce]);

  const requestReload = (nextDays: number) => {
    setLoading(true);
    setDays(nextDays);
    setReloadNonce((n) => n + 1);
  };

  const derived = useMemo(() => {
    if (!usage) return null;
    const todayCost = aiCoachCostUsd(usage.today);
    const windowCost = aiCoachCostUsd(usage.window_totals);
    return {
      todayCost,
      windowCost,
      // Cost per message over the window, which is the figure to compare
      // against the runbook's ~$0.018. Undefined rather than 0 when no
      // messages were sent — dividing by zero reads as "free", not "no data".
      perMessage:
        usage.window_totals.messages > 0
          ? windowCost / usage.window_totals.messages
          : null,
      // Over the window, not today: one day's ratio swings wildly on a
      // handful of messages, and the question "is the cache working" is not a
      // same-day question.
      cacheRate: aiCoachCacheHitRate(usage.window_totals),
    };
  }, [usage]);

  const dayColumns: Column<AiCoachDay>[] = [
    {
      key: 'day',
      header: 'Day',
      width: 150,
      render: (r) => <span style={{ whiteSpace: 'nowrap' }}>{fmtDay(r.period_start)}</span>,
      sort: (a, b) => a.period_start.localeCompare(b.period_start),
    },
    {
      key: 'members',
      header: 'Members',
      width: 100,
      align: 'right',
      render: (r) => numberFmt.format(r.members),
      sort: (a, b) => a.members - b.members,
    },
    {
      key: 'messages',
      header: 'Messages',
      width: 110,
      align: 'right',
      render: (r) => numberFmt.format(r.messages),
      sort: (a, b) => a.messages - b.messages,
    },
    {
      key: 'billed',
      header: 'Billed input',
      width: 130,
      align: 'right',
      render: (r) => numberFmt.format(r.billed_input),
      sort: (a, b) => a.billed_input - b.billed_input,
    },
    {
      key: 'cached',
      header: 'Cached input',
      width: 130,
      align: 'right',
      render: (r) => numberFmt.format(r.cached_input),
      sort: (a, b) => a.cached_input - b.cached_input,
    },
    {
      key: 'cacheRate',
      header: 'Cache hit',
      width: 110,
      align: 'right',
      render: (r) => {
        const rate = aiCoachCacheHitRate(r);
        if (rate == null) return <span style={{ color: colors.dim }}>—</span>;
        return (
          <span style={{ color: rate < CACHE_HIT_FLOOR ? colors.error : colors.text }}>
            {pct(rate)}
          </span>
        );
      },
      sort: (a, b) => (aiCoachCacheHitRate(a) ?? 0) - (aiCoachCacheHitRate(b) ?? 0),
    },
    {
      key: 'output',
      header: 'Output',
      width: 110,
      align: 'right',
      render: (r) => numberFmt.format(r.output),
      sort: (a, b) => a.output - b.output,
    },
    {
      key: 'cost',
      header: 'Cost',
      width: 110,
      align: 'right',
      render: (r) => (
        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16 }}>
          {usd(aiCoachCostUsd(r))}
        </span>
      ),
      sort: (a, b) => aiCoachCostUsd(a) - aiCoachCostUsd(b),
    },
  ];

  const capColumns: Column<AiCoachCapRow>[] = [
    {
      key: 'member',
      header: 'Member',
      render: (r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* A UUID prefix, not a name — paste it into Users to find them.
              There is nothing else about this person on this page. */}
          <span style={{ fontFamily: 'ui-monospace, monospace' }}>{r.member_ref}…</span>
          {r.is_admin && (
            <span style={{ fontSize: 11, color: colors.muted, textTransform: 'uppercase' }}>
              admin
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'messages',
      header: 'Messages today',
      width: 150,
      align: 'right',
      render: (r) => (
        <span
          style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 18,
            color:
              usage && r.messages >= usage.daily_message_limit ? colors.warning : colors.text,
          }}
        >
          {r.messages} / {usage?.daily_message_limit ?? 25}
        </span>
      ),
      sort: (a, b) => a.messages - b.messages,
    },
    {
      key: 'tokens',
      header: 'Tokens',
      width: 120,
      align: 'right',
      render: (r) => numberFmt.format(r.tokens),
      sort: (a, b) => a.tokens - b.tokens,
    },
    {
      key: 'tools',
      header: 'Tool calls (avg / max)',
      width: 180,
      align: 'right',
      render: (r) => {
        const ceiling = usage?.tool_call_ceiling ?? 6;
        return (
          <span style={{ color: r.max_tool_calls >= ceiling ? colors.warning : colors.text }}>
            {r.avg_tool_calls == null ? '—' : r.avg_tool_calls} / {r.max_tool_calls}
          </span>
        );
      },
      sort: (a, b) => a.max_tool_calls - b.max_tool_calls,
    },
  ];

  const failureColumns: Column<AiCoachFailure>[] = [
    {
      key: 'when',
      header: 'When',
      width: 150,
      render: (r) => <span style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(r.created_at)}</span>,
      sort: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      key: 'member',
      header: 'Member',
      width: 120,
      render: (r) => (
        <span style={{ fontFamily: 'ui-monospace, monospace' }}>{r.member_ref}…</span>
      ),
    },
    {
      key: 'detail',
      header: 'Upstream error',
      // Already redacted server-side by describeUpstreamError (any `sk-ant-`
      // substring is scrubbed before storage). Shown verbatim on purpose: the
      // text IS the diagnosis — "this API key is not scoped to a workspace"
      // is what a dead key looks like, and it took a hand-written SQL query to
      // find on 13 Oct.
      render: (r) => (
        <span style={{ color: colors.text, fontSize: 12, wordBreak: 'break-word' }}>
          {r.error_detail}
        </span>
      ),
    },
    {
      key: 'tools',
      header: 'Tool calls',
      width: 110,
      align: 'right',
      render: (r) => numberFmt.format(r.tool_calls),
      sort: (a, b) => a.tool_calls - b.tool_calls,
    },
  ];

  // The headline fact, in priority order: has a real member ever used this?
  // At 40-odd installs the honest answer is "no" for a while, and it has to
  // read as a fact rather than as a panel that failed to load.
  const usageNotice = () => {
    if (!usage) return null;
    const { ever } = usage;
    if (ever.messages === 0) {
      return (
        <Notice tone="neutral">
          <strong>Nobody has used the AI coach yet.</strong> No messages have been recorded
          since it shipped on 13 Oct 2026. Every number below is zero because there is nothing
          to count, not because the panel is broken.
        </Notice>
      );
    }
    if (ever.non_admin_members === 0) {
      return (
        <Notice tone="warn">
          <strong>No member has used the AI coach yet.</strong> All{' '}
          {numberFmt.format(ever.messages)} message
          {ever.messages === 1 ? '' : 's'} on record
          {ever.first_day ? ` since ${fmtDay(ever.first_day)}` : ''} came from admin accounts.
          The first real member conversation will change this line.
        </Notice>
      );
    }
    return (
      <Notice tone="good">
        <strong>
          {numberFmt.format(ever.non_admin_members)} member
          {ever.non_admin_members === 1 ? '' : 's'} have used the AI coach
        </strong>{' '}
        — {numberFmt.format(ever.non_admin_messages)} message
        {ever.non_admin_messages === 1 ? '' : 's'}, first on{' '}
        {ever.non_admin_first_day ? fmtDay(ever.non_admin_first_day) : 'an unknown day'}.{' '}
        {numberFmt.format(ever.messages)} total including admin usage.
      </Notice>
    );
  };

  const cacheNotice = () => {
    if (!usage || !derived) return null;
    const rate = derived.cacheRate;
    // No input at all means no verdict. Saying "0%" here would invent a
    // problem that does not exist yet.
    if (rate == null) return null;
    if (rate >= CACHE_HIT_FLOOR) return null;
    return (
      <Notice tone="bad">
        <strong>Prompt cache is not hitting ({pct(rate)} of input served from cache).</strong>{' '}
        Cache reads should be most of the input; at this rate the bill is several times what it
        should be. The usual cause is the system prompt changing between requests. Check the
        cache before changing anything else — see RUNBOOK-ai-coach-costs § Turning it down.
      </Notice>
    );
  };

  const failureNotice = () => {
    if (!usage) return null;
    if (usage.unsettled_over_1h === 0) return null;
    return (
      <Notice tone="warn">
        <strong>
          {numberFmt.format(usage.unsettled_over_1h)} request
          {usage.unsettled_over_1h === 1 ? '' : 's'} never settled
        </strong>{' '}
        (older than an hour). Those stay charged at their estimate, so a handful is normal and a
        rising count means <code>ai_coach_settle</code> is failing and the spend figures above
        are fiction.
      </Notice>
    );
  };

  return (
    <div style={{ padding: 24, color: colors.text, fontFamily: 'Inter, sans-serif' }}>
      <h1 style={h1Style}>AI Coach</h1>
      <div style={{ color: colors.muted, fontSize: 14, marginBottom: 20 }}>
        Usage and spend only. Conversations are never stored and cannot be shown here.
      </div>

      {error && <Notice tone="bad">{error}</Notice>}

      <div
        style={{
          background: colors.bg2,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'flex-end',
        }}
      >
        <div style={{ minWidth: 180 }}>
          <Field label="Window" hint="Server caps this at 90 days.">
            <Select value={days} onChange={(e) => requestReload(Number(e.target.value))}>
              {WINDOW_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  Last {d} days
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div style={{ marginBottom: 16 }}>
          <Button variant="secondary" onClick={() => requestReload(days)} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </Button>
        </div>
        <div style={{ marginBottom: 20, fontSize: 12, color: colors.dim }}>
          {usage ? `Generated ${fmtDateTime(usage.generated_at)}` : 'Loading…'}
        </div>
      </div>

      {usageNotice()}
      {cacheNotice()}
      {failureNotice()}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 12,
        }}
      >
        <KpiCard
          label="Messages today"
          value={usage ? numberFmt.format(usage.today.messages) : '—'}
          hint={usage ? `${numberFmt.format(usage.today.members)} member(s)` : undefined}
        />
        <KpiCard
          label="Spend today"
          value={derived ? usd(derived.todayCost) : '—'}
          hint="At Sonnet 5.5 list prices"
        />
        <KpiCard
          label={`Spend (${usage?.window_days ?? days}d)`}
          value={derived ? usd(derived.windowCost) : '—'}
          hint={
            derived?.perMessage != null
              ? `${usd(derived.perMessage)} per message`
              : 'No messages in window'
          }
        />
        <KpiCard
          label="Cache hit rate"
          value={derived?.cacheRate != null ? pct(derived.cacheRate) : '—'}
          hint={
            derived?.cacheRate == null
              ? 'No input to measure yet'
              : derived.cacheRate < CACHE_HIT_FLOOR
                ? 'Too low — the bill is inflated'
                : 'Cache reads should dominate'
          }
        />
        <KpiCard
          label="At daily cap"
          value={usage ? numberFmt.format(usage.at_cap_count) : '—'}
          hint={
            usage
              ? `${numberFmt.format(usage.near_cap_count)} near (${usage.near_cap_threshold}+ of ${usage.daily_message_limit})`
              : undefined
          }
        />
        <KpiCard
          label="Tool calls / request"
          value={usage ? usage.tool_calls.avg : '—'}
          hint={
            usage
              ? `${numberFmt.format(usage.tool_calls.at_ceiling)} of ${numberFmt.format(usage.tool_calls.requests)} at the ${usage.tool_call_ceiling} ceiling`
              : undefined
          }
        />
      </div>

      <h2 style={sectionTitleStyle}>At or near today&rsquo;s cap</h2>
      <div style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>
        People to talk to, not to block. Shown by member reference only — the first 8 characters
        of their user id, which the Users page search accepts.
        {usage?.at_cap_truncated && ' Showing the top 50 only — the counts above are complete.'}
      </div>
      <DataTable
        rows={usage?.at_cap ?? []}
        columns={capColumns}
        rowKey={(r) => r.member_ref}
        emptyLabel={loading ? 'Loading…' : 'Nobody is near the daily cap today.'}
        dense
      />

      <h2 style={sectionTitleStyle}>Recent failures</h2>
      <div style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>
        Upstream errors recorded by the edge function, newest first (max 20 in the window).
      </div>
      <DataTable
        rows={usage?.failures ?? []}
        columns={failureColumns}
        rowKey={(r) => `${r.created_at}-${r.member_ref}`}
        emptyLabel={loading ? 'Loading…' : 'No upstream failures in this window.'}
        dense
      />

      <h2 style={sectionTitleStyle}>Spend by day</h2>
      <div style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>
        Days with no usage are absent, not zero rows. Cost is computed from token counts at{' '}
        {`$${AI_COACH_RATES_USD_PER_MTOK.input.toFixed(2)}`}/
        {`$${AI_COACH_RATES_USD_PER_MTOK.output.toFixed(2)}`} per million input/output tokens
        (cache read {`$${AI_COACH_RATES_USD_PER_MTOK.cacheRead.toFixed(2)}`}, cache write{' '}
        {`$${AI_COACH_RATES_USD_PER_MTOK.cacheWrite.toFixed(2)}`}).
      </div>
      <DataTable
        rows={usage?.daily ?? []}
        columns={dayColumns}
        rowKey={(r) => r.period_start}
        emptyLabel={loading ? 'Loading…' : 'No coach usage in this window.'}
        dense
      />
    </div>
  );
}
