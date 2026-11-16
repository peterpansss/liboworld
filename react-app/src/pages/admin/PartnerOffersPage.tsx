import { useEffect, useMemo, useRef, useState } from 'react';
import { colors } from '../../theme';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { Field, TextInput, TextArea, Select, Button } from '../../components/admin/FormField';
import { Modal } from '../../components/admin/Modal';
import {
  listPartnerOffersAdmin,
  uploadGiveawayImage,
  // Sensitive op: gated through requireRecentAuth() via the wrapper.
  upsertPartnerOfferWithReauth as upsertPartnerOffer,
  type PartnerOfferRow,
  type PartnerOfferInput,
  type PartnerOfferTier,
  type PartnerOfferLang,
  type PartnerOfferTranslations,
  PARTNER_OFFER_LANGS,
} from '../../lib/adminApi';

/**
 * /admin/partner-offers — the affiliate catalogue (WeWard-style "discounts",
 * Noah 15 Nov 2026). Members browse these in the app and are redirected
 * through the affiliate link; the network pays Libo directly. No points.
 *
 * Backed by supabase-migration-partner-offers.sql. There is no delete:
 * switching an offer off (active = false) is how it is removed.
 */

// ── styles (same as RewardsPage) ──────────────────────────────────────────

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

const thumbBox: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  background: colors.bg3,
  objectFit: 'cover',
  display: 'block',
};

// ── helpers ───────────────────────────────────────────────────────────────

const ERROR_MESSAGES: Record<string, string> = {
  not_authorized: 'Not authorised. Partner offers need an admin session with MFA (AAL2); sign in again with your code.',
  invalid_country: 'Countries must be two-letter ISO codes (e.g. DE, AT), separated by commas or spaces. Leave blank for worldwide.',
  invalid_min_tier: 'Tier must be "All members" or "Premium only".',
  invalid_url: 'The affiliate URL must start with https://.',
  invalid_slug: 'Slug must be lowercase letters, digits, dashes or underscores, starting with a letter or digit.',
  missing_fields: 'Provider and title are required.',
  not_found: 'This offer no longer exists. Refresh the list and try again.',
  slug_taken: 'Another offer already uses this slug. Pick a different one.',
  invalid_dates: 'The end date must be after the start date.',
  upsert_failed: 'Save failed.',
};

/** Supabase errors are plain objects with `message`; RPC envelopes come back as Error(code). */
function errorText(e: unknown, fallback: string): string {
  const msg =
    e instanceof Error
      ? e.message
      : e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string'
        ? (e as { message: string }).message
        : '';
  if (!msg) return fallback;
  const code = Object.keys(ERROR_MESSAGES).find((k) => msg === k || msg.includes(k));
  return code ? ERROR_MESSAGES[code] : msg;
}

function TierChip({ tier }: { tier: PartnerOfferTier }) {
  return tier === 'premium'
    ? <span style={{ ...chipBase, background: colors.accentDim, color: colors.accent }}>Premium</span>
    : <span style={{ ...chipBase, background: colors.bg3, color: colors.muted }}>All members</span>;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function windowLabel(r: PartnerOfferRow): string {
  if (!r.starts_at && !r.ends_at) return 'Always';
  if (r.starts_at && r.ends_at) return `${formatDate(r.starts_at)} → ${formatDate(r.ends_at)}`;
  return r.starts_at ? `From ${formatDate(r.starts_at)}` : `Until ${formatDate(r.ends_at)}`;
}

function windowState(r: PartnerOfferRow): 'scheduled' | 'ended' | null {
  const now = Date.now();
  if (r.starts_at && new Date(r.starts_at).getTime() > now) return 'scheduled';
  if (r.ends_at && new Date(r.ends_at).getTime() <= now) return 'ended';
  return null;
}

/** ISO timestamp → value for <input type="datetime-local"> (local time). */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local value (local time) → ISO, or null when blank. */
function localInputToIso(v: string): string | null | undefined {
  if (!v.trim()) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

function parseCountries(v: string): string[] {
  return [...new Set(v.split(/[\s,;]+/).map((c) => c.trim().toUpperCase()).filter(Boolean))];
}

function slugify(v: string): string {
  return v
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

function suggestSlug(provider: string, title: string, countries: string): string {
  const first = parseCountries(countries)[0] ?? '';
  return slugify([provider, title, first].filter(Boolean).join(' '));
}

// ── form ──────────────────────────────────────────────────────────────────

type OfferForm = {
  id: string | null;
  slug: string;
  /** Creating, and the slug hasn't been typed by hand: keep it in sync with the suggestion. */
  slugAuto: boolean;
  provider: string;
  title: string;
  subtitle: string;
  badge: string;
  description: string;
  terms: string;
  image_url: string;
  affiliate_url: string;
  promo_code: string;
  countries: string;
  min_tier: PartnerOfferTier;
  active: boolean;
  sort_order: string;
  starts_at: string;
  ends_at: string;
  /** DE/ES/FR/PT texts; the plain fields above are the English (fallback) ones. */
  translations: PartnerOfferTranslations;
};

type TextField = 'title' | 'subtitle' | 'badge' | 'description' | 'terms';
const LANG_LABEL: Record<PartnerOfferLang, string> = { en: 'EN', de: 'DE', es: 'ES', fr: 'FR', pt: 'PT' };

const EMPTY_FORM: OfferForm = {
  id: null,
  slug: '',
  slugAuto: true,
  provider: '',
  title: '',
  subtitle: '',
  badge: '',
  description: '',
  terms: '',
  image_url: '',
  affiliate_url: '',
  promo_code: '',
  countries: '',
  min_tier: 'free',
  // New offers start switched off.
  active: false,
  sort_order: '0',
  starts_at: '',
  ends_at: '',
  translations: {},
};

function rowToForm(r: PartnerOfferRow): OfferForm {
  return {
    id: r.id,
    slug: r.slug,
    slugAuto: false,
    provider: r.provider,
    title: r.title,
    subtitle: r.subtitle ?? '',
    badge: r.badge ?? '',
    description: r.description ?? '',
    terms: r.terms ?? '',
    image_url: r.image_url ?? '',
    affiliate_url: r.affiliate_url,
    promo_code: r.promo_code ?? '',
    countries: r.countries.join(', '),
    min_tier: r.min_tier,
    active: r.active,
    sort_order: String(r.sort_order),
    starts_at: isoToLocalInput(r.starts_at),
    ends_at: isoToLocalInput(r.ends_at),
    // English lives in the plain fields; an 'en' entry would only shadow them.
    translations: Object.fromEntries(
      Object.entries(r.translations).filter(([l]) => l !== 'en'),
    ) as PartnerOfferTranslations,
  };
}

const opt = (v: string): string | null => (v.trim() ? v.trim() : null);

function formToInput(f: OfferForm): PartnerOfferInput | string {
  if (!f.provider.trim() || !f.title.trim()) return ERROR_MESSAGES.missing_fields;
  const slug = f.slug.trim();
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(slug)) return ERROR_MESSAGES.invalid_slug;
  const url = f.affiliate_url.trim();
  if (!/^https:\/\//i.test(url)) return ERROR_MESSAGES.invalid_url;
  const countries = parseCountries(f.countries);
  const bad = countries.filter((c) => !/^[A-Z]{2}$/.test(c));
  if (bad.length) return `${ERROR_MESSAGES.invalid_country} Not valid: ${bad.join(', ')}.`;
  const sort = Number(f.sort_order);
  if (!Number.isInteger(sort)) return 'Sort order must be a whole number.';
  const starts = localInputToIso(f.starts_at);
  const ends = localInputToIso(f.ends_at);
  if (starts === undefined || ends === undefined) return 'Dates must be valid, or left blank.';
  if (starts && ends && new Date(ends) <= new Date(starts)) return ERROR_MESSAGES.invalid_dates;
  return {
    id: f.id,
    slug,
    provider: f.provider.trim(),
    title: f.title.trim(),
    subtitle: opt(f.subtitle),
    badge: opt(f.badge),
    description: opt(f.description),
    terms: opt(f.terms),
    image_url: opt(f.image_url),
    affiliate_url: url,
    promo_code: opt(f.promo_code),
    countries,
    min_tier: f.min_tier,
    active: f.active,
    sort_order: sort,
    starts_at: starts,
    ends_at: ends,
    translations: {
      ...f.translations,
      // Mirror English so the server's lang → en → column fallback agrees.
      en: {
        title: f.title.trim(),
        subtitle: f.subtitle.trim(),
        badge: f.badge.trim(),
        description: f.description.trim(),
        terms: f.terms.trim(),
      },
    },
  };
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
        style={{ background: 'transparent', border: 'none', color, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0, marginLeft: 12 }}
      >
        ×
      </button>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────

export function PartnerOffersPage() {
  const [rows, setRows] = useState<PartnerOfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const [form, setForm] = useState<OfferForm | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [lang, setLang] = useState<PartnerOfferLang>('en');
  /** A text field in the language being edited (EN = the plain fields). */
  const textOf = (f: OfferForm, field: TextField): string =>
    lang === 'en' ? f[field] : f.translations[lang]?.[field] ?? '';
  const setText = (field: TextField, value: string) =>
    setForm((f) => {
      if (!f) return f;
      if (lang === 'en') return { ...f, [field]: value };
      return { ...f, translations: { ...f.translations, [lang]: { ...f.translations[lang], [field]: value } } };
    });
  /** In another language, show the English text as the placeholder. */
  const ph = (f: OfferForm, field: TextField, fallback: string) => (lang === 'en' ? fallback : f[field] || fallback);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    setLoading(true);
    setErr(null);
    try {
      setRows(await listPartnerOffersAdmin());
    } catch (e) {
      setErr(errorText(e, 'Failed to load partner offers'));
    } finally {
      setLoading(false);
    }
  };

  // First load: `loading` already starts true, so only async callbacks set state here.
  useEffect(() => {
    let cancelled = false;
    listPartnerOffersAdmin()
      .then((r) => {
        if (!cancelled) setRows(r);
      })
      .catch((e: unknown) => {
        if (!cancelled) setErr(errorText(e, 'Failed to load partner offers'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Edits a field; while creating with an untouched slug, re-suggests it. */
  const patch = (changes: Partial<OfferForm>) => {
    setForm((f) => {
      if (!f) return f;
      const next = { ...f, ...changes };
      if (next.id === null && next.slugAuto) next.slug = suggestSlug(next.provider, next.title, next.countries);
      return next;
    });
  };

  // Same public bucket + resize/validation as the giveaway and reward images.
  const handleImageUpload = async (file: File) => {
    setImageUploading(true);
    setFormErr(null);
    try {
      const url = await uploadGiveawayImage(file);
      setForm((f) => (f ? { ...f, image_url: url } : f));
    } catch (e) {
      setFormErr(errorText(e, 'Upload failed'));
    } finally {
      setImageUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const input = formToInput(form);
    if (typeof input === 'string') {
      setFormErr(input);
      return;
    }
    setSaving(true);
    setFormErr(null);
    try {
      await upsertPartnerOffer(input);
      setPageMessage(
        `Saved "${input.provider} · ${input.title}"${input.active ? '' : ' (inactive: not shown in the app until switched on)'}.`,
      );
      setForm(null);
      await refresh();
    } catch (e2) {
      setFormErr(errorText(e2, 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<PartnerOfferRow>[] = useMemo(
    () => [
      {
        key: 'image',
        header: '',
        width: 60,
        render: (r) =>
          r.image_url ? <img src={r.image_url} alt="" style={thumbBox} /> : <div style={thumbBox} />,
      },
      {
        key: 'offer',
        header: 'Offer',
        render: (r) => (
          <div>
            <div style={{ color: colors.muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {r.provider}
            </div>
            <div style={{ fontWeight: 600, color: colors.text, marginTop: 2 }}>{r.title}</div>
            <div style={{ color: colors.dim, fontSize: 11, marginTop: 2 }}>{r.slug}</div>
          </div>
        ),
        sort: (a, b) => a.provider.localeCompare(b.provider) || a.title.localeCompare(b.title),
      },
      {
        key: 'badge',
        header: 'Badge',
        render: (r) =>
          r.badge
            ? <span style={{ ...chipBase, background: colors.accentDim, color: colors.accent }}>{r.badge}</span>
            : <span style={{ color: colors.dim }}>—</span>,
      },
      {
        key: 'countries',
        header: 'Countries',
        render: (r) => (
          <span style={{ color: colors.text, fontSize: 12 }}>
            {r.countries.length ? r.countries.join(', ') : 'Worldwide'}
          </span>
        ),
        sort: (a, b) => a.countries.join(',').localeCompare(b.countries.join(',')),
      },
      {
        key: 'tier',
        header: 'Who',
        render: (r) => <TierChip tier={r.min_tier} />,
        sort: (a, b) => a.min_tier.localeCompare(b.min_tier),
      },
      {
        key: 'active',
        header: 'Active',
        render: (r) =>
          r.active
            ? <span style={{ ...chipBase, background: colors.successDim, color: colors.success }}>on</span>
            : <span style={{ ...chipBase, background: colors.bg3, color: colors.muted }}>off</span>,
        sort: (a, b) => Number(b.active) - Number(a.active),
      },
      {
        key: 'window',
        header: 'Window',
        render: (r) => {
          const state = windowState(r);
          return (
            <div style={{ fontSize: 12, color: colors.muted }}>
              {windowLabel(r)}
              {state && (
                <div style={{ marginTop: 4 }}>
                  <span
                    style={{
                      ...chipBase,
                      background: state === 'ended' ? colors.errorDim : colors.warningDim,
                      color: state === 'ended' ? colors.error : colors.warning,
                    }}
                  >
                    {state}
                  </span>
                </div>
              )}
            </div>
          );
        },
      },
      {
        key: 'clicks',
        header: 'Clicks 30d / total',
        align: 'right',
        render: (r) => (
          <span>
            <span style={numberStyle}>{r.clicks_30d.toLocaleString('en-GB')}</span>
            <span style={{ color: colors.muted, fontSize: 12 }}> / {r.clicks_total.toLocaleString('en-GB')}</span>
          </span>
        ),
        sort: (a, b) => a.clicks_30d - b.clicks_30d || a.clicks_total - b.clicks_total,
      },
      {
        key: 'sort',
        header: 'Sort',
        align: 'right',
        render: (r) => <span style={{ color: colors.text }}>{r.sort_order}</span>,
        sort: (a, b) => a.sort_order - b.sort_order,
      },
    ],
    [],
  );

  const activeCount = rows.filter((r) => r.active).length;
  const clicks30 = rows.reduce((acc, r) => acc + r.clicks_30d, 0);

  return (
    <div style={{ padding: 0 }}>
      <div style={headerRowStyle}>
        <div>
          <h1 style={h1Style}>Partner offers</h1>
          <div style={statsStyle}>
            Affiliate links members open from the app. No points. To remove an offer, switch it off.
          </div>
          <div style={statsStyle}>
            One row per country version: Amazon tags only pay in their own store (use OneLink), and many Awin
            partners pay for certain countries only.
          </div>
          <div style={statsStyle}>
            {loading ? 'Loading…' : `${rows.length} offers · ${activeCount} active · ${clicks30.toLocaleString('en-GB')} clicks in 30 days`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={() => void refresh()} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setLang('en');
              setForm(EMPTY_FORM);
              setFormErr(null);
            }}
          >
            New offer
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

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        onRowClick={(r) => {
          setLang('en');
          setForm(rowToForm(r));
          setFormErr(null);
        }}
        emptyLabel={loading ? 'Loading…' : 'No partner offers yet.'}
      />

      <Modal
        open={!!form}
        onClose={() => {
          if (!saving) setForm(null);
        }}
        title={form?.id ? `Edit ${form.title || 'offer'}` : 'New partner offer'}
        width={680}
      >
        {form && (
          <form onSubmit={handleSave}>
            {formErr && <div style={errorBannerStyle}>{formErr}</div>}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', margin: '0 0 12px' }}>
              <span style={{ fontSize: 12, color: colors.muted, marginRight: 4 }}>Texts in</span>
              {PARTNER_OFFER_LANGS.map((l) => {
                const done = l === 'en' ? !!form.title.trim() : !!form.translations[l]?.title?.trim();
                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    aria-pressed={lang === l}
                    style={{
                      ...chipBase,
                      cursor: 'pointer',
                      border: `1px solid ${lang === l ? colors.accent : colors.border}`,
                      background: lang === l ? colors.accentDim : 'transparent',
                      color: lang === l ? colors.accent : done ? colors.text : colors.muted,
                    }}
                  >
                    {LANG_LABEL[l]}{done ? '' : ' ·'}
                  </button>
                );
              })}
              <span style={{ fontSize: 12, color: colors.muted, marginLeft: 4 }}>
                {lang === 'en' ? 'English is the fallback for any language left blank.' : 'Blank fields show the English text.'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
              <Field label="Provider">
                <TextInput value={form.provider} onChange={(e) => patch({ provider: e.target.value })} placeholder="Amazon" />
              </Field>
              <Field label={`Title (${LANG_LABEL[lang]})`}>
                <TextInput
                  value={textOf(form, 'title')}
                  onChange={(e) => setText('title', e.target.value)}
                  placeholder={ph(form, 'title', 'Kindle Unlimited 3 months free')}
                />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <Field label={`Subtitle (${LANG_LABEL[lang]}, optional)`}>
                <TextInput
                  value={textOf(form, 'subtitle')}
                  onChange={(e) => setText('subtitle', e.target.value)}
                  placeholder={ph(form, 'subtitle', 'New subscribers only')}
                />
              </Field>
              <Field label={`Badge (${LANG_LABEL[lang]}, optional)`}>
                <TextInput
                  value={textOf(form, 'badge')}
                  onChange={(e) => setText('badge', e.target.value)}
                  placeholder={ph(form, 'badge', '3 months free')}
                />
              </Field>
            </div>
            <Field label={`Description (${LANG_LABEL[lang]}, optional)`} hint="Shown on the offer's detail page in the app: 2-3 short lines on what the member gets.">
              <TextArea
                value={textOf(form, 'description')}
                onChange={(e) => setText('description', e.target.value)}
                rows={3}
                placeholder={ph(form, 'description', 'Read as much as you like: millions of eBooks, comics and magazines.')}
              />
            </Field>
            <Field label={`Conditions (${LANG_LABEL[lang]}, optional)`} hint="The offer's terms, shown small under the description (new customers only, cancel before the trial ends, …).">
              <TextArea
                value={textOf(form, 'terms')}
                onChange={(e) => setText('terms', e.target.value)}
                rows={3}
                placeholder={ph(form, 'terms', 'New customers only. Then €11.99/month, cancel anytime.')}
              />
            </Field>
            <Field
              label="Affiliate URL"
              hint="Paste the tracking link from the affiliate network. Optional: put {SUBID} where the network accepts a sub-ID (Amazon ascsubtag, Awin clickref) — it's replaced with the offer slug."
            >
              <TextInput
                value={form.affiliate_url}
                onChange={(e) => patch({ affiliate_url: e.target.value })}
                placeholder="https://…"
                autoComplete="off"
              />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Countries" hint="ISO-2 codes, comma or space separated (e.g. DE, AT). Blank = worldwide.">
                <TextInput
                  value={form.countries}
                  onChange={(e) => patch({ countries: e.target.value.toUpperCase() })}
                  placeholder="Worldwide"
                />
              </Field>
              <Field label="Promo code (optional)" hint="Shown to members who can open the offer.">
                <TextInput
                  value={form.promo_code}
                  onChange={(e) => patch({ promo_code: e.target.value })}
                  autoComplete="off"
                />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <Field
                label="Slug"
                hint={form.id === null && form.slugAuto ? 'Suggested from provider, title and first country.' : 'Also the {SUBID} value in network reports.'}
              >
                <TextInput
                  value={form.slug}
                  onChange={(e) => patch({ slug: e.target.value, slugAuto: e.target.value === '' })}
                  placeholder="amazon-kindle-unlimited-de"
                />
              </Field>
              <Field label="Who can open">
                <Select value={form.min_tier} onChange={(e) => patch({ min_tier: e.target.value as PartnerOfferTier })}>
                  <option value="free">All members</option>
                  <option value="premium">Premium only</option>
                </Select>
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Starts (optional)" hint="Your local time. Blank = now.">
                <TextInput type="datetime-local" value={form.starts_at} onChange={(e) => patch({ starts_at: e.target.value })} />
              </Field>
              <Field label="Ends (optional)" hint="Your local time. Blank = no end.">
                <TextInput type="datetime-local" value={form.ends_at} onChange={(e) => patch({ ends_at: e.target.value })} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Sort order" hint="Lower comes first.">
                <TextInput type="number" step={1} value={form.sort_order} onChange={(e) => patch({ sort_order: e.target.value })} />
              </Field>
              <Field label="Active">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: colors.text, paddingTop: 10 }}>
                  <input type="checkbox" checked={form.active} onChange={(e) => patch({ active: e.target.checked })} />
                  Shown in the app
                </label>
              </Field>
            </div>
            <Field label="Image (optional)">
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                {form.image_url ? (
                  <img
                    src={form.image_url}
                    alt=""
                    style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 10, border: `1px solid ${colors.border}`, flexShrink: 0 }}
                  />
                ) : (
                  <div
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 10,
                      background: colors.bg3,
                      border: `1px solid ${colors.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: colors.muted,
                      fontSize: 11,
                      flexShrink: 0,
                    }}
                  >
                    No image
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <TextInput value={form.image_url} onChange={(e) => patch({ image_url: e.target.value })} placeholder="https://…" />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleImageUpload(f);
                      }}
                    />
                    <Button type="button" variant="secondary" onClick={() => imageInputRef.current?.click()} disabled={imageUploading}>
                      {imageUploading ? 'Uploading…' : 'Upload image'}
                    </Button>
                    {form.image_url && (
                      <Button type="button" variant="ghost" onClick={() => patch({ image_url: '' })}>
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </div>
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
              <Button type="button" variant="ghost" onClick={() => setForm(null)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={saving || imageUploading}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
