/**
 * Admin authentication: sign-in, sign-out, current-user-is-admin check.
 *
 * NOTE: the implementations live in adminApi.ts because the admin-auth
 * security agent is iterating on them in parallel. This file is a thin
 * re-export so callers can migrate import paths today and the underlying
 * implementation can move here once that work settles.
 */
export {
  signInAdmin,
  signOutAdmin,
  getCurrentUserIsAdmin,
} from '../adminApi';
