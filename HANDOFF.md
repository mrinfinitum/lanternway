# Lanternway — Handoff for the next chat

_Last updated: Nov 1, 2026. Replaces the Oct 24 handoff (Stage 1 is long done)._

## Prompt to start a new chat

> Read `CLAUDE.md`, `HANDOFF.md`, `BUILD_PLAN.md`, `APP_MAP.md`, and `COMPLIANCE.md`. Then pick the next item from "Next up" and confirm it with me before starting. Push to `dev` only, never `main`.

## Where things stand

| | |
|---|---|
| Repo | https://github.com/mrinfinitum/lanternway |
| `main` (production) | `2e3fdee` (Stage 1 mock-data prototype). **Don't push or deploy to production.** The user hasn't decided when to promote dev. |
| `dev` | Latest: family sharing (see `git log`), deployed to **https://dev.lanternway.co** (noindex + prototype banner) |
| Working tree | Clean. Medication reminder settings + care calendar are committed and on dev. Migration 007 is applied to the shared Neon database. |

### Phone app skeleton, M3 (Nov 2, branch `mobile/m3-skeleton`, not pushed)
- **What it is:** `apps/mobile` (`@lanternway/mobile`), Expo SDK 58 with Expo Router (`src/app/`) and TypeScript.
  - Brand: `src/theme.ts` (the website's colors, Nunito via `@expo-google-fonts/nunito`) and `src/lib/brand.ts` (copies of the web brand PNGs).
  - API client: `src/lib/api.ts`, typed from the new `packages/shared/src/api.ts`. The web's `/me` and `/auth/sign-in` routes now `satisfies` those types.
  - The client sends `Authorization: Bearer` from `expo-secure-store` and the device's time zone in `X-Time-Zone`. It retries 503s and never treats them as signed out.
  - The placeholder screen calls `GET /api/v1/me` and shows the answer.
- **Running it:** `pnpm dev` + `pnpm mobile` (press `i`). In development the app calls port 3000 on the computer running Metro; `EXPO_PUBLIC_API_URL` overrides that. See `apps/mobile/README.md`.
- **Tested:**
  - Opened in the iOS Simulator (Expo Go, iPhone 18 Pro): logo, Lumi, Nunito, and "Connected to Lanternway. You're not signed in yet." The web log shows `GET /api/v1/me 401`.
  - iOS and Android bundles build.
  - Root `pnpm lint`, `pnpm typecheck` and `pnpm build` pass.
  - **Not tried:** Android Emulator (no Android SDK on this Mac).
- **Mac setup this needed (the user did it, Nov 2):** `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`, `sudo xcodebuild -license accept`, `xcodebuild -runFirstLaunch`.
- **Lockfile note:** installing Expo changed two optional peers for the website: recharts now resolves `react-is` 19.3.1 instead of 16.13.1, and Next sees `babel-plugin-react-compiler` (unused: `reactCompiler` isn't enabled). The web build passes; worth a quick look at a chart page after merging.
- **Vercel:** installs the whole workspace, mobile included, so installs get slower. Optional: set the Install Command to `pnpm install --filter @lanternway/web...`.

### Mobile API, M2 (Nov 1, merged to `dev`)
- **What it is:** a JSON API for the phone at `/api/v1`, on the same Next.js app. It has 30 route files under `apps/web/src/app/api/v1/`, listed in `MOBILE_PLAN.md` §2 and §6/M2.
  - **Auth:** `lib/api/auth.ts`, the spike's bearer-token approach. The phone sends `Authorization: Bearer <Neon Auth session token>`, which is checked with Neon Auth on every call.
  - **Every route:** `lib/api/http.ts` (`withUser`, `childAccess` / `familyAccess`, `todayFor`) gives a 401 when signed out, a 403 for too low a role and a 404 for another family's data.
  - **Screen data:** `lib/api/screens.ts` returns what each screen needs.
- **Data-layer refactor (its own commit):**
  - `lib/child-data.ts` has cookie-free record readers taking `(userId, childId, …)`.
  - `data.ts` keeps its signatures and fills those in from the request.
  - `loadChildRecords` / `loadChildCheckIns` take the user, and `saveRecord(user, …)` takes the user for `loggedBy`.
  - Website unchanged: browser-checked at 390px and 1280px as an admin (Home, Log + save, Medications, Therapy + provider page, School tabs, About Me, Family) and as a view-only member (same pages, with no add/edit/invite controls). No console errors.
- **Test:** `pnpm api:test http://localhost:3141`, with a dev server on 3141. **111/111 pass.**
  - It uses four QA accounts: an admin, a "can log" member and a "can view" member of one family, plus another family's admin.
  - 401 for all 29 signed-in routes, both signed out and with a made-up token.
  - 403 for 13 admin-only actions as "log" and as "view"; view can't log; log can log.
  - 404 for every read and 12 writes into another family.
  - Invite and check-in tokens are shown once, plus the usual flows: join, revoke, roles, leave, delete account, password change, sign out, sign out everywhere.
  - It cleans up after itself. **Don't pipe it through `head`:** that kills it before cleanup.
- **Found and fixed:**
  1. Neon Auth rate-limits session checks (`429 over_request_rate_limit`) after about a hundred quick calls. The API now answers `503` + `Retry-After` instead of 401, so the phone retries rather than signing out, and the test waits it out.
  2. Saving over another family's record id answered 200 while the database changed nothing. Now it's 404.
  3. Sign-out with a made-up token answered 200. Now it's 401.
- **Open:**
  - Whether to cache sessions briefly (rate limit vs. revoke delay) is the user's call; see `MOBILE_PLAN.md` §3.
  - `/auth/verify-email` hasn't been tested with a real emailed code.
  - The sample family isn't served by the API (saved kids only).

### Mobile auth spike, M0 (Nov 1, branch `spike/mobile-auth`, not merged; its code now lives in M2)
- **Result:** the phone signs in through our own `/api/v1/auth/sign-in`, gets the Neon Auth session token in JSON, and sends it as a bearer token. The server checks it with the Neon Auth SDK's framework-agnostic `createAuthServer()`. No new dependencies; the JWT plugin and `jose` aren't needed.
- **Found in passing:** Neon Auth answers an unverified sign-in with `422 email_not_confirmed` (the web sign-in now handles it, `e02a069`).

### Monorepo, M1 (Nov 1, merged to `dev` as `0f0b7e7`)
- **Layout:**
  - the website moved to `apps/web/` with `git mv` (`src/`, `public/`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `components.json`, `AGENTS.md`);
  - `packages/shared/` (`@lanternway/shared`) holds `types`, `record-schemas`, `family-roles`, `labels` and `dates`;
  - `db/`, `scripts/`, `brand/` and the docs stay at the root.
- **Imports:** `@/lib/types` became `@lanternway/shared/types`, and the same for the other four files. The web compiles the shared package through `transpilePackages`.
- **Scripts:** root scripts forward to the web app. `db:setup` and `db:test-rls` read `apps/web/.env.local`.
- **No behaviour change.** Checked:
  - lint, typecheck, build, `db:setup` and `db:test-rls` (all passing);
  - a browser smoke test at 390px and 1280px: sign in, add a child, quick log → Home, add a med with type-ahead, calendar, Timeline, Family sharing. No console errors. The QA account was deleted.
- **Before merging to `dev`, the user must:**
  1. set Vercel's Root Directory to `apps/web`;
  2. move their `.env.local` to `apps/web/.env.local`.
- **Lockfile:** pnpm dropped a duplicate peer copy of `jose`/`zod` under `@better-auth/core`. Both versions were already installed, and the peer warnings are the same as on `dev`.

### Medication reminders + care calendar (reviewed and tested Nov 1)
- `db/migrations/007_medication_reminders.sql`: adds `medication_reminder` to the `records.kind` check. Reminders are records whose parent is the medication, so the existing RLS covers them and deleting a med deletes its reminders.
- `src/app/(app)/medications/reminders.tsx`: reminder settings (times, days, push or text, phone). They're private by default ("Maya's 8:00 AM reminder"), and the medication is named only if the parent opts in. **Nothing is sent yet**, and the UI says so.
- `src/app/(app)/_components/care-calendar.tsx` + `src/lib/schedule.ts`: a month calendar on Medications and Therapy covering:
  - doses, reminder times and dose changes;
  - refills;
  - logged sessions;
  - upcoming weekly appointments parsed from the care team's schedule text (it never guesses when there's no weekday).
- Updates to `record-schemas.ts`, `types.ts`, `data.ts`, mock meds, `db-test-rls.mjs`, the privacy draft, `BUILD_PLAN.md`, `COMPLIANCE.md`, and `CLAUDE.md`.
- Tested in the browser on a QA account and the sample family, at 390px and 1280px: suggested times, text-number check, private/named wording, pause, "Not now", calendar doses/refills/changes/weekly appointments, and deleting a med removes its reminder. Fixed: the reminder dialog kept unsaved edits after Cancel.

## What's built (on dev)

- **Auth (Neon Auth, email + password only):**
  - sign-up asks for 4 consents (18+ parent/guardian, terms, privacy, health data) and a 10+ character password;
  - email verification by 6-digit code;
  - forgot/reset password;
  - sign out everywhere;
  - change password.
  - Emails go through Resend SMTP from `noreply@send.lanternway.co`. Delivery is confirmed working.
- **Families:** each account gets its own family, and kids live in `children.profile`.
  - Adding a child uses the `/kids/new` intake wizard.
  - Multiple kids are supported, with a switcher in the header.
  - A **sample family** (Maya and Theo, fictional mock data) can be entered or left from the header menu.
- **Everything saves to the account:** logs, milestones, medications + dose changes, care team, therapy goals and sessions, IEP/504 plans, goals and progress, supports, school messages.
  - All of it lives in one `records` table, validated server-side by `packages/shared/src/record-schemas.ts`.
  - The client store (`records-store.tsx`) saves optimistically, then persists through server actions in a serial queue.
- **About Me:** a visual profile with per-section editing, plus share presets (Teacher, Caregiver, Medical, Camp). Private info is off by default, and consent is recorded before a link appears. **The share link and PDF are still placeholders.**
- **Teacher check-in links (real):**
  - School → Check-ins → "Ask for check-ins", for an existing or new person, valid for 30, 90 or 180 days. A consent box is recorded as `share_checkin`.
  - The token is 32 random bytes, and only its SHA-256 hash is stored, so the link is **shown once**. The dialog offers Copy and "Email it", a `mailto:` from the parent's own mail app. Lanternway doesn't email teachers.
  - The public `/c/[token]` page sees only the child's first name and the form. It gets this through the `checkin_form_context(token)` and `submit_checkin(...)` SECURITY DEFINER functions, which run with no user (`asNobody()` in `db.ts`).
  - One check-in per link per day; sending again updates it.
  - Revoking takes effect immediately.
  - Check-ins appear for kids without a plan too.
  - Real check-ins feed Home teacher stats, the medication before/after charts, the Timeline and Reports.
- **Family sharing (Nov 1):** `/family` (linked from More and the sidebar) and the public `/join/[invite]` page.
  - Roles: **admin** (everything), **log** (reads everything; adds/edits daily logs and milestones only), **view** (reads only). Enforced by RLS in migration 008 and mirrored in the UI: `getCurrentAccess()` (`data.ts`) → `AccessProvider` in the app layout → `useAccess()` / `IfAllowed` (`src/components/access.tsx`). `FormDialog` hides itself unless the person can edit (`need="log"` for log forms). Non-admins see a short note at the top of each page.
  - Invite links: hashed, shown once, single use, 7 or 30 days, revocable, `share_family` consent. **Anyone with the link can accept** (the user's choice). Not signed in → sign in/up → the `lw-join` cookie brings them back to `/join` (`afterSignInPath()`).
  - A family always keeps an admin (trigger). The only admin of a shared family can't delete their account until they hand off. Export covers only families you're an admin of. Adding a child goes into a family you're an admin of (or a new one).
  - Tested end to end with two QA accounts (invite → sign in → join → log → role change → leave; revoke; last-admin block). **Not tested:** the "Create an account to join" path through email verification (needs a real code), though it uses the same redirect helper.
  - Empty states and the Home welcome tip have wording for log/view members (`IfAllowed otherwise=`).
- **Medication catalog:** 69 medications (names, classes and forms; **no doses**) in Neon, with type-ahead when adding a med.
- **Privacy and compliance:**
  - draft Privacy, Terms and Consumer Health Data policies under `(legal)`;
  - a test-data notice;
  - data export (`/api/account/export`, including check-ins);
  - account deletion (`delete_my_auth_account()`, migration 004, after a password re-check);
  - security headers and CSP in `next.config.ts`;
  - breach plan draft in `docs/compliance/BREACH_RESPONSE.md`.
  - The tracker is `COMPLIANCE.md`.
- **"Today":** the real date in the family's time zone, from the `lw-tz` cookie set by `<TimeZoneCookie />` (default America/New_York). The sample family stays pinned to `PROTOTYPE_TODAY` (2026-10-21), because its mock data is built around that date.

## Architecture cheat sheet

- **Monorepo (from M1):** `apps/web` (this website), `packages/shared` (`@lanternway/shared`: types, record schemas, labels, dates, family roles; no React, Node or DB code) and, later, `apps/mobile`. Web paths below (`src/...`) are under `apps/web/`. Run every command from the repo root.
- **Next.js 16.4** App Router with `cacheComponents` + `partialPrefetching`. Read `apps/web/node_modules/next/dist/docs/` before using unfamiliar APIs (`apps/web/AGENTS.md`).
  - Every `(app)` page has `export const instant = false`. Add it to any new page.
  - Anything reading cookies, params or the clock sits under `<Suspense>`. Call `await connection()` before `new Date()` or DB work on pages that read no cookies (see `getToday()` and `/c/[token]`).
  - `"use server"` files may export only async functions.
  - After writes, call `refresh()` from `next/cache`.
- **`src/proxy.ts`** (Next 16's middleware) protects app routes with `auth.middleware({ loginUrl: "/sign-in" })`. `/c/*` and the legal pages are public.
- **Mobile API (`/api/v1`, M2):** JSON route handlers for the phone. They're bearer-token only, never cookies, and not in the `proxy.ts` matcher. Each wraps its handler in `withUser` and checks `childAccess` / `familyAccess`, then calls the same lib functions as the website (`child-data.ts`, `records.ts`, `sharing.ts`, `checkins.ts`, …). **Every new screen or action needs its `/api/v1` route and checks in `scripts/api-test.mjs`.** Neon Auth rate limits come back as 503, never 401.
- **Data access:** screens only import `src/lib/data.ts` (cookie wrappers over the cookie-free readers in `src/lib/child-data.ts`). Each getter reads Neon for saved kids (UUID ids, via `isSavedChildId`) and `@/mock` for the sample family. Supporting modules:
  - `records.ts`: `loadChildRecords`, `saveRecord`, `deleteRecord`.
  - `checkins.ts`: links, revoke, public context and submit.
  - `families.ts`.
  - `consents.ts`.
  - `account.ts`: export and delete.
- **RLS:** `asUser(userId, fn)` runs one transaction with `set_config('app.user_id', …)`. The policies use `my_family_ids()`, `my_writable_family_ids()` and `my_admin_family_ids()`.
  - The website connects as `lanternway_app`, which isn't the table owner, so the policies always apply.
  - Migrations run as `lanternway_owner`.
  - **Every new table needs RLS plus new checks in `scripts/db-test-rls.mjs`** (43 checks at the last run, all passing).
- **Migrations:** `db/migrations/001…007`, run by `pnpm db:setup` (idempotent: it re-runs all of them and upserts the catalog). Local and dev share **one Neon database**.

## Environment and accounts (no secrets here)

- **`apps/web/.env.local`** (git-ignored; at the repo root before M1) holds `DATABASE_URL_ADMIN`, `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` and `RESEND_API_KEY`. Never print or commit these.
- **Vercel:**
  - Team NSoul (`team_QoiswXU8qLWxgCOD5vvpbPMJ`), project `lanternway`, account **geofftracy-7003**, not pgamemes.
  - Preview env vars for gitBranch `dev` are set via the REST API. Avoid `vercel link`, which rewrites `.env.local`.
  - The CLI flips between accounts; device-login approvals must be done as geofftracy-7003.
- **Neon:** project `winter-sound-66238869` (org NSoul Co), aws-us-east-1. Neon Auth's trusted domain is `https://dev.lanternway.co`. 2FA isn't available in managed Neon Auth.
- **DNS:** Cloudflare. `dev.lanternway.co` points to Vercel, and `send.lanternway.co` is verified in Resend.
- **Git push** (the keychain uses a different GitHub account): `git -c credential.helper= -c credential.helper='!gh auth git-credential' push origin dev`

## How to test

```bash
pnpm dev --port 3123
pnpm lint && pnpm typecheck
pnpm db:test-rls      # family isolation + check-in link rules
pnpm api:test http://localhost:3123   # mobile API: 401/403/404 and flows (needs the dev server)
pnpm mobile           # phone app (Expo); press i for the iOS Simulator; needs pnpm dev running
pnpm build            # catches Suspense/cacheComponents issues dev misses (don't run while dev is running)
```

- **QA accounts:**
  1. Sign up with `lanternway-qa+<something>@example.com` by POSTing to `/api/auth/sign-up/email` with `Origin` set.
  2. Mark the account verified with admin SQL: `update neon_auth."user" set "emailVerified" = true where email = …`.
  3. **Clean up afterwards:** delete the `families` they created, their `consents`, and their `neon_auth."user"` rows. The only real user in the database is the owner's own account, so leave it alone.
- **Browser end-to-end test:**
  - The headless-Chrome CDP harness that lived in `/tmp/lw-tools/` (`e2e.mjs`, `shoot.mjs`) is gone. Recreate it if needed: launch Chrome with `--remote-debugging-port` and set `Emulation.setDeviceMetricsOverride` to 390 wide.
  - The last run passed 18/18 checks locally and on dev: sign in, add a child, quick log, add a med with type-ahead, add a provider, add an IEP plan + goal + progress, create a check-in link (consent required), submit as the teacher (only the first name shown), parent sees it, revoke kills the link, reload persistence, Home stats, Timeline.
  - Radix tabs need a `mousedown` event plus `focus()` to switch in scripts.
- Check every screen at 390px (phone first) and ~1280px.

## Gotchas

- Browser testing in the Claude app's built-in browser: keep the pane visible. A hidden pane blocks animation frames, so streamed parts of the page never finish loading and it looks broken when it isn't.
- Pages showing stale content after code changes usually mean a stale dev server: restart it.
- zsh: quote URLs containing `?`, and don't name a variable `path`.
- Neon Auth SDK error codes are lowercase. A duplicate sign-up returns 422 `validation_failed`, shown as a neutral message.
- A stale or revoked session cookie is handled: `getSignedInUser()` catches it and returns null.
- When state updates come from quick taps, use functional `setState`. Fast taps dropped answers twice: the About Me chips and the teacher form.
- After replacing an image in `public/`, clear `.next/cache/images`.

## How the user likes to work

- Short messages ("yes", "push", "do these"). Act on them, explain results in plain language, and keep summaries short.
- **Deploy to dev only.** Ask before anything touching `main` or production, paid services, new SDKs, or analytics.
- Prefers recommended defaults; ask only when it's genuinely their call.
- The user handles their own account setup: Vercel, Cloudflare, Resend, Neon. Walk them through it step by step and never ask them to paste secrets into chat. They put keys in `apps/web/.env.local` themselves.

## Next up

**Pick from these (in rough priority order):**
1. **Real About Me share links + PDF**: hashed tokens, expiry, revoke, view log (same pattern as check-ins).
2. **Teacher accounts** per `APP_MAP.md`: they see only children a parent connected them to, and only the check-in form, About Me and accommodations.
3. **Sending medication reminders**: needs decisions or paid services, so ask first. Details are in `BUILD_PLAN.md` (web push + scheduler; SMS needs a paid provider and 10DLC).
4. **Polish:**
   - Lumi moments (ask before inventing new Lumi art);
   - an accessibility/contrast audit;
   - a 390px pass on every route.

**The user's own to-dos (remind them; don't do them):**
- Sign the DPAs: Neon, Vercel, Resend (later an SMS vendor).
- Fill in the `LEGAL` placeholders in `src/lib/policies.ts`, get a lawyer to review the policies, then remove the draft banner and the test-data notice.
- Name the people in `docs/compliance/BREACH_RESPONSE.md`.
- Decide when to promote `dev` to `main` (production).
