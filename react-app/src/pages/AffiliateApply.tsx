import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SeoHead } from '../components/SeoHead';
import ScrollRevealText from '../components/ScrollRevealText';
import {
  FunnelContextBar,
  FunnelLogoNav,
  FunnelMinimalFooter,
} from '../components/funnel/FunnelChrome';
import { supabase } from '../lib/supabase';
import './AffiliateApply.css';

/**
 * /creator-program/apply — the Creator Program application (was
 * /affiliate/apply, which now redirects here).
 *
 * FUNNEL page: lime context bar, unlinked centred logo, legal-only footer. The
 * only exits are the back link and the submit button — no sticky CTA, because
 * the form's own submit is the CTA.
 *
 * Submission backend: Supabase Edge Function `affiliate_apply` which calls
 * Resend to email the application to AFFILIATE_TO_EMAIL. Wiring unchanged.
 * Setup (one-time):
 *   1. supabase secrets set RESEND_API_KEY=re_...
 *   2. supabase secrets set AFFILIATE_FROM_EMAIL="Libo Creators <noreply@liboworld.com>"
 *      (use a domain verified in Resend)
 *   3. supabase secrets set AFFILIATE_TO_EMAIL=affiliates@liboworld.com
 *   4. cd libo-app-v2 && supabase functions deploy affiliate_apply
 *
 * Success is now an INLINE state rather than a redirect to
 * /creator-program/apply/sent — a funnel should never hand the user a fresh
 * page to bounce from. That route still exists but is no longer reached from
 * here.
 *
 * Fallback: if the function call fails the form surfaces an inline error
 * pointing at affiliates@liboworld.com so applications are never silently lost.
 */

const TERMS_TEXT = `1. These Terms and Conditions apply to the Creator Program of Libo World, S.L. (hereafter, "Libo").

2. Libo must confirm the publisher's participation in this Creator Program ("confirmed publisher"). Upon confirmation of participation in the Libo Creator Program, the publisher declares their agreement with these Terms and Conditions. Libo can change these Terms and Conditions or terminate the Libo Creator Program at any time.

3. The publisher must have their own website or social media. Pure email registrations shall not be accepted or confirmed.

4. Sites which include content of the following type are not allowed to participate: sites that promote violence, pornographic and discrimination based on race, sex, religion, nationality, disability, sexual orientation and/or age.

5. The website of the publisher must contain full legal company information including name, and, if applicable, company address and contact details (telephone, email), as well as fulfil all other legal requirements related to its country of establishment.

6. Libo pays a 25% commission on every paying subscriber referred by the confirmed publisher's unique link, on every renewal, for the lifetime of the subscription.

7. Payments are made monthly. The publisher must reach a minimum balance of €50 before payout. Payments are made via bank transfer or PayPal at the publisher's choice.

8. The publisher must not bid on Libo branded keywords in paid search advertising. Doing so is grounds for immediate termination from the Creator Program without payout of pending balance.

9. Cookie window: 60 days from last click on the publisher's referral link.

10. Libo reserves the right to reject any application without explanation.`;

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  emailConfirm: string;
  companyName: string;
  mainChannel: string;
  audienceSize: string;
  otherChannels: string;
  agreed: boolean;
};

const INITIAL: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  emailConfirm: '',
  companyName: '',
  mainChannel: '',
  audienceSize: '',
  otherChannels: '',
  agreed: false,
};

export default function AffiliateApply() {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): string | null => {
    if (!form.firstName.trim()) return t('affiliateApply.errFirstName', { defaultValue: 'First name is required.' });
    if (!form.lastName.trim()) return t('affiliateApply.errLastName', { defaultValue: 'Last name is required.' });
    if (!form.email.trim()) return t('affiliateApply.errEmail', { defaultValue: 'Email is required.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return t('affiliateApply.errEmailFormat', { defaultValue: 'Please enter a valid email.' });
    if (form.email.trim() !== form.emailConfirm.trim()) return t('affiliateApply.errEmailMatch', { defaultValue: "Email addresses don't match." });
    if (!form.mainChannel.trim()) return t('affiliateApply.errMainChannel', { defaultValue: 'Please add a link to your main channel.' });
    if (!form.audienceSize.trim()) return t('affiliateApply.errAudience', { defaultValue: 'Please tell us your audience size.' });
    if (!form.agreed) return t('affiliateApply.errTerms', { defaultValue: 'You must agree to the Terms of Service.' });
    return null;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('affiliate_apply', {
        body: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          companyName: form.companyName,
          mainChannel: form.mainChannel,
          audienceSize: form.audienceSize,
          otherChannels: form.otherChannels,
          agreed: form.agreed,
        },
      });
      if (fnError) throw fnError;
      const result = data as { ok: boolean; error?: string };
      if (!result?.ok) throw new Error(result?.error || 'submission_failed');
      setSent(true);
    } catch (submitErr) {
      console.error('Creator Program application submission failed', submitErr);
      setError(
        t('affiliateApply.errSubmit', {
          defaultValue:
            "We couldn't submit your application. Please try again, or email us directly at affiliates@liboworld.com.",
        })
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="aa-page">
      <SeoHead
        title={t('affiliateApply.seoTitle', { defaultValue: 'Apply to the Libo Creator Program' })}
        description={t('affiliateApply.seoDescription', {
          defaultValue:
            'Apply to the Libo Creator Program and earn 25% commission on every subscription payment your audience makes.',
        })}
        canonical="https://liboworld.com/creator-program/apply"
      />

      <FunnelContextBar>
        <span className="aa-bar-full">
          {t('affiliateApply.contextBar', {
            defaultValue: '25% lifetime commission — on every payment, not just the first',
          })}
        </span>
        <span className="aa-bar-short">
          {t('affiliateApply.contextBarShort', { defaultValue: '25% lifetime commission' })}
        </span>
      </FunnelContextBar>

      <FunnelLogoNav />

      <section className="aa-hero">
        {/* nowrap — the canvas render breaks this onto two lines. */}
        <Link to="/creator-program" className="aa-back">
          ← {t('affiliateApply.back', { defaultValue: 'Back to program' })}
        </Link>
        <h1 className="aa-headline font-display">
          <ScrollRevealText as="span" className="aa-line">
            {t('affiliateApply.headlineLine1', { defaultValue: 'Apply to the Libo' })}
          </ScrollRevealText>
          <ScrollRevealText as="span" className="aa-line aa-line--accent">
            {t('affiliateApply.headlineLine2', { defaultValue: 'Creator Program.' })}
          </ScrollRevealText>
        </h1>
        <p className="aa-sub">
          {t('affiliateApply.sub', {
            defaultValue: "Tell us about your audience. If you're a fit, we'll be in touch within 5 working days.",
          })}
        </p>
      </section>

      {sent ? (
        /* Inline success — no redirect. The funnel ends here. */
        <div className="aa-form aa-form--sent" role="status" aria-live="polite">
          <div className="aa-sent-icon" aria-hidden>✓</div>
          <h2 className="aa-sent-title font-display">
            {t('affiliateApply.sentTitle', { defaultValue: 'Application received ✓' })}
          </h2>
          <p className="aa-sent-body">
            {t('affiliateApply.sentBody', {
              defaultValue:
                "We read every application. If you're a fit, we'll be in touch within 5 working days at the address you gave us.",
            })}
          </p>
        </div>
      ) : (
      <form className="aa-form" onSubmit={onSubmit} noValidate>
        <p className="aa-hint">
          {t('affiliateApply.hint', { defaultValue: 'Fields with an asterisk (*) are required.' })}
        </p>

        {/* General */}
        <fieldset className="aa-section">
          <legend className="aa-legend">{t('affiliateApply.generalTitle', { defaultValue: 'General' })}</legend>
          <div className="aa-grid">
            <label className="aa-field">
              <span className="aa-label">{t('affiliateApply.firstName', { defaultValue: 'First name' })} *</span>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => update('firstName', e.target.value)}
                autoComplete="given-name"
                required
              />
            </label>
            <label className="aa-field">
              <span className="aa-label">{t('affiliateApply.lastName', { defaultValue: 'Last name' })} *</span>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => update('lastName', e.target.value)}
                autoComplete="family-name"
                required
              />
            </label>
            <label className="aa-field">
              <span className="aa-label">{t('affiliateApply.email', { defaultValue: 'Email' })} *</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className="aa-field">
              <span className="aa-label">{t('affiliateApply.emailConfirm', { defaultValue: 'Confirm email' })} *</span>
              <input
                type="email"
                value={form.emailConfirm}
                onChange={(e) => update('emailConfirm', e.target.value)}
                autoComplete="email"
                required
              />
            </label>
          </div>
        </fieldset>

        {/* Company */}
        <fieldset className="aa-section">
          <legend className="aa-legend">{t('affiliateApply.companyTitle', { defaultValue: 'Company' })}</legend>
          <label className="aa-field">
            <span className="aa-label">{t('affiliateApply.companyName', { defaultValue: 'Company / Individual / Website name' })}</span>
            <input
              type="text"
              value={form.companyName}
              onChange={(e) => update('companyName', e.target.value)}
              autoComplete="organization"
            />
          </label>
        </fieldset>

        {/* Audience */}
        <fieldset className="aa-section">
          <legend className="aa-legend">{t('affiliateApply.audienceTitle', { defaultValue: 'Audience' })}</legend>
          <label className="aa-field">
            <span className="aa-label">
              {t('affiliateApply.mainChannel', { defaultValue: 'Main website / social media you will advertise on (link)' })} *
            </span>
            <input
              type="url"
              value={form.mainChannel}
              onChange={(e) => update('mainChannel', e.target.value)}
              placeholder="https://instagram.com/yourhandle"
              required
            />
          </label>
          <label className="aa-field">
            <span className="aa-label">{t('affiliateApply.audienceSize', { defaultValue: 'What is your audience size?' })} *</span>
            <input
              type="text"
              value={form.audienceSize}
              onChange={(e) => update('audienceSize', e.target.value)}
              placeholder="e.g. 25,000 IG + 8,000 TikTok"
              required
            />
          </label>
          <label className="aa-field">
            <span className="aa-label">{t('affiliateApply.otherChannels', { defaultValue: 'Other websites / social media (add all)' })}</span>
            <textarea
              rows={3}
              value={form.otherChannels}
              onChange={(e) => update('otherChannels', e.target.value)}
              placeholder="https://tiktok.com/@yourhandle"
            />
          </label>
        </fieldset>

        {/* Terms */}
        <fieldset className="aa-section">
          <legend className="aa-legend">{t('affiliateApply.termsTitle', { defaultValue: 'Terms and Conditions' })}</legend>
          <span className="aa-label">{t('affiliateApply.termsSubtitle', { defaultValue: 'Libo Creator Program Terms of Service' })} *</span>
          <div className="aa-terms-box" tabIndex={0} aria-label={t('affiliateApply.termsBoxAria', { defaultValue: 'Creator Program terms' })}>
            <pre>{TERMS_TEXT}</pre>
          </div>
          <label className="aa-checkbox">
            <input
              type="checkbox"
              checked={form.agreed}
              onChange={(e) => update('agreed', e.target.checked)}
            />
            <span>{t('affiliateApply.agree', { defaultValue: "I agree to Libo's Terms of Service" })}</span>
          </label>
        </fieldset>

        {error && (
          <div className="aa-error" role="alert">{error}</div>
        )}

        <div className="aa-actions">
          {/* Disabled until the terms are ticked — the button state is the
              affordance, the validator still catches keyboard submits. */}
          <button type="submit" className="aa-submit font-display" disabled={submitting || !form.agreed}>
            {submitting
              ? t('affiliateApply.submitting', { defaultValue: 'Submitting…' })
              : t('affiliateApply.submit', { defaultValue: 'Apply to the program →' })}
          </button>
        </div>
      </form>
      )}

      <FunnelMinimalFooter />
    </div>
  );
}
