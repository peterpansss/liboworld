// Where and how often the Blueprint before-you-go popup may show.
export const BP_POPUP_KEY = 'libo_bp_popup_seen_v1';
export const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

const BLOCKED = [
  '/blueprint', '/find-your-plan', '/get-app', '/join', '/onboarding',
  '/rules', '/giveaway-rules', '/rewards-rules', '/terms', '/privacy',
  '/delete-account', '/admin', '/auth', '/w/',
];

export function isBlockedPath(pathname: string): boolean {
  return BLOCKED.some((p) => pathname === p || pathname.startsWith(p.endsWith('/') ? p : `${p}/`));
}
