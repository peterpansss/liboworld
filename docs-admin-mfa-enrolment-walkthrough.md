# Admin MFA Enrolment — Walkthrough & Readiness (LIBO-02, Phase A→B)

**Purpose:** de-risk the MFA enrolment step. Before we can enforce AAL2 on the
admin surface (Phase B), **both** production admins must enrol and *verify* a
TOTP factor at `liboworld.com/admin/mfa`. This doc confirms the page will work,
gives each admin a dead-simple walkthrough, and lists the fallbacks if it
doesn't render.

**Admin accounts (both must enrol):**

| Admin user UUID |
| --- |
| `292a6819-6097-4fbc-aaf3-0e83cd4f4ab8` |
| `dc140503-b4e2-4acc-8034-5edd9f07db78` |

> Do **not** apply `supabase-migration-admin-aal2-enforce.sql` (Phase B) until
> `SELECT admin_mfa_ready();` returns `TRUE`. Applying early instantly locks out
> any un-enrolled admin — no UI way back in. See the RUNBOOK at
> `libo-app-v2/docs/RUNBOOK-admin-aal2-rollout.md`.

---

## 1. Go / No-Go readiness assessment

**Verdict: GO — with one live dependency to confirm first (TOTP enabled in
Supabase Auth settings).**

The enrolment code path is sound and the enrolment page is wired correctly:

- **The actual enrolment uses Supabase Auth MFA built-ins**, not custom code.
  `startTotpEnrolment()` calls `supabase.auth.mfa.enroll({ factorType: 'totp' })`
  and reads back `data.totp.qr_code` (an SVG string) + `data.totp.secret`.
  `confirmTotpEnrolment()` then calls `supabase.auth.mfa.challenge()` followed by
  `supabase.auth.mfa.verify({ factorId, challengeId, code })`. Verify requires
  the **6-digit TOTP code** from the authenticator app. On success Supabase
  marks the factor `verified` and the account's AAL becomes `aal2`.
  (`react-app/src/lib/adminApi.ts`, `startTotpEnrolment` / `confirmTotpEnrolment`;
  UI in `react-app/src/components/admin/MfaEnrolPanel.tsx`.)
- **The QR renders as inline SVG** returned by Supabase (`challenge.qrSvg` →
  `dangerouslySetInnerHTML`), plus the secret is shown as text for manual entry.
  No external QR service, no extra library — so nothing else can break the QR.
- **`admin_mfa_ready()` — the cutover gate — IS defined in the repo**
  (`libo-app-v2/supabase-migration-admin-aal2-helper.sql`, Phase A) and reads
  `auth.mfa_factors` for a `status = 'verified'` factor per admin. This is the
  authoritative "are we ready for Phase B" check.
- The admin panel is **already live and in use today**, which is direct evidence
  that the custom RPCs the page depends on (see §4) are deployed to production
  out-of-band — otherwise the panel wouldn't load at all.

**What could still block it (in priority order):**

1. **#1 risk — TOTP not enabled in the Supabase project's Auth settings.** If
   TOTP MFA is disabled, `supabase.auth.mfa.enroll()` returns an error and **no
   QR appears** — the "Enable 2FA" button will error out instead of showing the
   QR. This is the single most likely failure. Fix in §3 fallback.
2. **A missing `my_admin_mfa_status` RPC would blank the enrol panel.**
   `MfaEnrolPanel` calls `getAdminMfaStatus()` (→ RPC `my_admin_mfa_status`) on
   mount; if that RPC errors, `status` stays `null`, and the panel's
   `if (!status?.is_admin) return null` renders **nothing** (you'd see the page
   heading + banner but no "Enable 2FA" button). Expected deployed — confirm in §4.
3. **A missing `is_caller_admin` RPC would block reaching `/admin/mfa` at all.**
   `AdminGuard` AND-combines the `profiles.is_admin` read with
   `isCallerAdminViaRpc()` (→ RPC `is_caller_admin`), which returns `false` on
   any error. If that RPC isn't deployed, the guard treats the admin as
   "not an admin" and shows the login screen with *"Not an admin account."* —
   they never reach the enrol UI. Expected deployed — confirm in §4/fallback.

None of (2) or (3) is expected to bite, because the panel works in production
today. (1) is the one to positively confirm before the admins sit down.

---

## 2. Numbered walkthrough (each admin does this once)

You'll need a TOTP authenticator app on your phone: **Google Authenticator**,
**1Password**, **Authy**, or Microsoft Authenticator — any of them works.

1. Go to **https://liboworld.com/admin** and **sign in** with your admin email +
   password.
2. In the browser, navigate to **https://liboworld.com/admin/mfa** (the "Security
   / MFA" page). You'll see a **"Two-Factor Authentication"** panel. If a red or
   yellow banner shows ("required" / "N days remaining"), ignore the urgency —
   the steps are the same.
3. Click **"Enable 2FA"**.
4. A **QR code** appears (on a white tile), with the text *"Or enter this secret
   manually: …"* underneath.
5. In your authenticator app, choose **add account → scan QR code**, and scan the
   QR. (If scanning fails, use **enter a setup key / manual entry** and type the
   secret string shown under the QR.) The app now shows a **6-digit code** that
   changes every 30 seconds.
6. Type the current **6-digit code** into the **"Code"** field on the page.
7. Click **"Verify and finish"**.
8. Success looks like: the panel switches to **"Enrolled. You'll be asked for a
   TOTP code on every sign-in."** You're done. Keep the authenticator entry — you
   will need it on every future sign-in.

Repeat for the **second** admin account (different person / device). Both UUIDs
above must complete step 8.

> Note: there are currently **no recovery codes** (a known, deferred gap). If a
> phone is lost after enrolment, the only recovery is a sysadmin clearing the
> factor in the Supabase dashboard. Don't wipe the authenticator entry.

---

## 3. Fallback — if the QR does NOT render

This is almost certainly **TOTP disabled in Supabase Auth settings.**

1. Open the **Supabase Dashboard** for the **production** project
   (`oaftqweofrifoiuwntce`).
2. Go to **Authentication → Sign In / Providers → Multi-Factor Authentication**
   (in some dashboard versions: **Authentication → Providers → MFA**, or
   **Authentication → MFA**).
3. Ensure **TOTP (Authenticator app)** is **enabled**. Save.
4. Back in the app: reload `/admin/mfa`, click **Enable 2FA** again — the QR
   should now render.

If enabling TOTP doesn't fix it, capture the browser console error on the
"Enable 2FA" click — `startTotpEnrolment` surfaces the raw Supabase error into
the panel ("Could not start enrolment") and the console.

### Fallback — if you're stuck at a login gate and never reach `/admin/mfa`

Symptom: after signing in you're bounced to the login screen showing
**"Not an admin account."** despite being an admin.

- Likely cause: the **`is_caller_admin`** RPC is not deployed (the guard fails
  closed when it errors). Confirm it exists in production:

  ```sql
  SELECT is_caller_admin();   -- run while authed as the admin, or:
  SELECT proname FROM pg_proc WHERE proname = 'is_caller_admin';
  ```

- If the panel loads but the MFA card is blank (heading shows, no "Enable 2FA"
  button), the **`my_admin_mfa_status`** RPC is likely missing:

  ```sql
  SELECT proname FROM pg_proc WHERE proname = 'my_admin_mfa_status';
  ```

Both are expected to already exist (the panel works in production). If either is
genuinely absent, it must be (re)deployed out-of-band before enrolment — these
RPCs are **not** defined in the repo (see §4).

---

## 4. RPCs the flow calls — Auth built-in vs custom, and what's in the repo

| Name | Type | Defined in repo? | Role in enrolment |
| --- | --- | --- | --- |
| `supabase.auth.mfa.enroll` | Supabase Auth built-in | n/a (Supabase-hosted) | Creates the TOTP factor, returns QR + secret |
| `supabase.auth.mfa.challenge` | Supabase Auth built-in | n/a | Starts a verify challenge |
| `supabase.auth.mfa.verify` | Supabase Auth built-in | n/a | Verifies the 6-digit code → factor `verified`, session → aal2 |
| `is_caller_admin` | Custom Postgres RPC | **MISSING from repo** | AdminGuard gate — must pass to reach `/admin/mfa` |
| `my_admin_mfa_status` | Custom Postgres RPC | **MISSING from repo** | Feeds the enrol panel + guard's grace/must-enrol state (`getAdminMfaStatus`) |
| `confirm_my_mfa_enrolment` | Custom Postgres RPC | **MISSING from repo** | Best-effort profile stamp after verify — **swallowed on error**, does NOT block enrolment |
| `check_admin_login_allowed` | Custom Postgres RPC | **MISSING from repo** | Login rate-limit gate — **fails OPEN** in code if absent |
| `record_admin_login_failure` | Custom Postgres RPC | **MISSING from repo** | Records failed logins — best-effort, non-blocking |
| `admin_mfa_ready` | Custom Postgres RPC | **DEFINED** (`libo-app-v2/supabase-migration-admin-aal2-helper.sql`) | Cutover gate; TRUE only when every admin has a verified factor |
| `is_admin_aal2` | Custom Postgres RPC | **DEFINED** (same file) | Phase B enforcement gate (admin AND jwt aal=aal2) |

**Custom RPCs the enrolment flow needs that are NOT verifiable from this repo
(deployed out-of-band — smoke-test them):**
`is_caller_admin`, `my_admin_mfa_status`, `confirm_my_mfa_enrolment`,
`check_admin_login_allowed`, `record_admin_login_failure`.

Of these, only **`is_caller_admin`** and **`my_admin_mfa_status`** are on the
critical path to a working enrol page (see §3 fallback). The other three are
non-blocking (fail open / swallowed / best-effort). Their presence is strongly
implied by the fact that the admin panel functions in production today, but they
cannot be verified statically — so a quick smoke-test at `/admin/mfa` before the
admins enrol is the safe move.

---

## 5. Post-enrolment verification (gate for Phase B)

After **both** admins reach the "Enrolled" state, run in
**Supabase Dashboard → SQL Editor** (production project):

```sql
SELECT admin_mfa_ready();          -- MUST return TRUE before Phase B
```

Optional per-admin detail (both rows must show `true`):

```sql
SELECT p.id,
       EXISTS (SELECT 1 FROM auth.mfa_factors f
                WHERE f.user_id = p.id AND f.status = 'verified') AS has_verified_factor
  FROM profiles p
 WHERE p.is_admin = TRUE;
```

Only once `admin_mfa_ready()` returns `TRUE` is it safe to apply
`libo-app-v2/supabase-migration-admin-aal2-enforce.sql` (Phase B). That
migration self-aborts with a `RAISE EXCEPTION` if `admin_mfa_ready()` is still
`FALSE`, so a premature paste is safe — but confirm TRUE first anyway.
