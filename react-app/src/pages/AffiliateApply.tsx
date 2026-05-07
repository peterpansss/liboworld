import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { supabase } from '../lib/supabase';
import './AffiliateApply.css';

// /affiliate/apply — application form modeled after Hevy/Everflow but
// hosted on liboworld.com.
//
// Submission backend: Supabase Edge Function `affiliate_apply` which calls
// Resend to email the application to AFFILIATE_TO_EMAIL.
// Setup (one-time):
//   1. supabase secrets set RESEND_API_KEY=re_...
//   2. supabase secrets set AFFILIATE_FROM_EMAIL="Libo Affiliates <noreply@liboworld.com>"
//      (use a domain verified in Resend)
//   3. supabase secrets set AFFILIATE_TO_EMAIL=affiliates@liboworld.com
//   4. cd libo-app-v2 && supabase functions deploy affiliate_apply
//
// Fallback: if the function call fails (network, function not deployed,
// etc.) the form opens the user's email client with the answers pre-filled
// so applications are never silently lost.
const RECIPIENT_EMAIL = 'affiliates@liboworld.com';

const TERMS_TEXT = `1. These Terms and Conditions apply to the Affiliate Programme of Libo World, S.L. (hereafter, "Libo").

2. Libo must confirm the publisher's participation in this Affiliate Programme ("confirmed publisher"). Upon confirmation of participation in the Libo Affiliate Programme, the publisher declares their agreement with these Terms and Conditions. Libo can change these Terms and Conditions or terminate the Libo Affiliate Programme at any time.

3. The publisher must have their own website or social media. Pure email registrations shall not be accepted or confirmed.

4. Sites which include content of the following type are not allowed to participate: sites that promote violence, pornographic and discrimination based on race, sex, religion, nationality, disability, sexual orientation and/or age.

5. The website of the publisher must contain full legal company information including name, and, if applicable, company address and contact details (telephone, email), as well as fulfil all other legal requirements related to its country of establishment.

6. Libo pays a 25% commission on every paying subscriber referred by the confirmed publisher's unique link, on every renewal, for the lifetime of the subscription.

7. Payments are made monthly. The publisher must reach a minimum balance of €50 before payout. Payments are made via bank transfer or PayPal at the publisher's choice.

8. The publisher must not bid on Libo branded keywords in paid search advertising. Doing so is grounds for immediate termination from the Programme without payout of pending balance.

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
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      navigate('/affiliate/apply/sent');
    } catch (submitErr) {
      // eslint-disable-next-line no-console
      console.error('Affiliate application submission failed', submitErr);
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
      <SiteNav />

      <section className="aa-hero">
        <Link to="/affiliate" className="aa-back">
          ← {t('affiliateApply.back', { defaultValue: 'Back to program' })}
        </Link>
        <h1 className="aa-headline font-display">
          {t('affiliateApply.headline', { defaultValue: 'Apply to the Libo Affiliate Programme' })}
        </h1>
        <p className="aa-sub">
          {t('affiliateApply.sub', {
            defaultValue: "Tell us about your audience. If you're a fit, we'll be in touch within 5 working days.",
          })}
        </p>
      </section>

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
          <span className="aa-label">{t('affiliateApply.termsSubtitle', { defaultValue: 'Libo Affiliate Programme Terms of Service' })} *</span>
          <div className="aa-terms-box" tabIndex={0} aria-label={t('affiliateApply.termsBoxAria', { defaultValue: 'Affiliate programme terms' })}>
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
          <button type="submit" className="aa-submit" disabled={submitting}>
            {submitting
              ? t('affiliateApply.submitting', { defaultValue: 'Submitting…' })
              : t('affiliateApply.submit', { defaultValue: 'Apply' })}
          </button>
        </div>
      </form>

      <SiteFooter />
    </div>
  );
}
