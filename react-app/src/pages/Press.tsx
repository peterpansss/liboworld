import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { supabase } from '../lib/supabase';
import './Press.css';

// /press — media inquiry form for journalists, bloggers, and partners.
//
// Submission backend: Supabase Edge Function `press_inquiry` which calls
// Resend to email the inquiry to PRESS_TO_EMAIL with reply_to set to the
// sender so press@ can reply directly to the journalist.
// Setup (one-time):
//   1. supabase secrets set PRESS_FROM_EMAIL="Libo Press <noreply@liboworld.com>"
//   2. supabase secrets set PRESS_TO_EMAIL=press@liboworld.com
//   3. cd libo-app-v2 && supabase functions deploy press_inquiry
//
// On submission failure we show an inline error with the press@ address —
// never auto-open the mail client + navigate to /press/sent, because that
// makes a failed send look successful.

type FormState = {
  email: string;
  subject: string;
  message: string;
};

const INITIAL: FormState = {
  email: '',
  subject: '',
  message: '',
};

export default function Press() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): string | null => {
    if (!form.email.trim()) return t('press.errEmail', { defaultValue: 'Email is required.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      return t('press.errEmailFormat', { defaultValue: 'Please enter a valid email.' });
    if (!form.subject.trim()) return t('press.errSubject', { defaultValue: 'Subject is required.' });
    if (!form.message.trim()) return t('press.errMessage', { defaultValue: 'Message is required.' });
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
      const { data, error: fnError } = await supabase.functions.invoke('press_inquiry', {
        body: {
          email: form.email,
          subject: form.subject,
          message: form.message,
        },
      });
      if (fnError) throw fnError;
      const result = data as { ok: boolean; error?: string };
      if (!result?.ok) throw new Error(result?.error || 'submission_failed');
      navigate('/press/sent');
    } catch (submitErr) {
      // eslint-disable-next-line no-console
      console.error('Press inquiry submission failed', submitErr);
      setError(
        t('press.errSubmit', {
          defaultValue:
            "We couldn't send your inquiry. Please try again, or email us directly at press@liboworld.com.",
        })
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="press-page">
      <SiteNav />

      <section className="press-hero">
        <h1 className="press-headline font-display">
          {t('press.headline', { defaultValue: 'Press' })}
        </h1>
        <p className="press-sub">
          {t('press.sub', {
            defaultValue:
              'Get in touch with our press team for media inquiries, interviews, and press releases.',
          })}
        </p>
      </section>

      <form className="press-form" onSubmit={onSubmit} noValidate>
        <label className="press-field">
          <span className="press-label">
            {t('press.email', { defaultValue: 'Email Address' })} *
          </span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="your.email@example.com"
            autoComplete="email"
            required
          />
        </label>

        <label className="press-field">
          <span className="press-label">
            {t('press.subject', { defaultValue: 'Subject' })} *
          </span>
          <input
            type="text"
            value={form.subject}
            onChange={(e) => update('subject', e.target.value)}
            placeholder={t('press.subjectPlaceholder', { defaultValue: 'Media inquiry subject' })}
            required
          />
        </label>

        <label className="press-field">
          <span className="press-label">
            {t('press.message', { defaultValue: 'Message' })} *
          </span>
          <textarea
            rows={6}
            value={form.message}
            onChange={(e) => update('message', e.target.value)}
            placeholder={t('press.messagePlaceholder', {
              defaultValue:
                "Please provide details about your media inquiry, including deadline, outlet information, and specific questions you'd like answered…",
            })}
            required
          />
        </label>

        {error && (
          <div className="press-error" role="alert">
            {error}
          </div>
        )}

        <button type="submit" className="press-submit" disabled={submitting}>
          {submitting
            ? t('press.submitting', { defaultValue: 'Sending…' })
            : t('press.submit', { defaultValue: 'Send Press Inquiry' })}
        </button>
      </form>

      <SiteFooter />
    </div>
  );
}
