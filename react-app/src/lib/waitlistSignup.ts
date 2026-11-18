import { supabase } from './supabase';

export type WaitlistSignupSource = 'homepage_waitlist' | 'challenge_waitlist' | 'onboarding';

type WaitlistSignupResult = { ok: boolean; duplicate?: boolean; error?: string };

export async function submitWaitlistSignup(
  email: string,
  source: WaitlistSignupSource,
  onboardingAnswers?: string,
  signal?: AbortSignal,
): Promise<'success' | 'duplicate'> {
  const { data, error } = await supabase.functions.invoke('waitlist_signup', {
    body: {
      email,
      source,
      ...(onboardingAnswers === undefined ? {} : { onboarding_answers: onboardingAnswers }),
    },
    signal,
  });
  if (error) throw error;
  const result = data as WaitlistSignupResult | null;
  if (!result?.ok) throw new Error(result?.error ?? 'waitlist_signup_failed');
  return result.duplicate ? 'duplicate' : 'success';
}
