# Lanternway — Mobile App Plan (iOS + Android)

_Drafted Nov 1, 2026. A plan for review. Nothing here is built yet._

## The short version

- **Same repo, same backend, same database.** The repo becomes a pnpm workspace with three parts:
  - `apps/web`: today's Next.js app, unchanged in behaviour;
  - `apps/mobile`: a new Expo (React Native) app;
  - `packages/shared`: types, record validation, labels and dates, used by both apps.
- **The phone never talks to Neon.** It calls a new JSON API (`/api/v1/...`) on the Next.js app on Vercel. That API calls the same `src/lib` functions the web pages use, so RLS, `asUser()` and validation stay in one place.
- **Sign-in goes through our own server.** Neon's managed Better Auth doesn't support Expo directly (details in §3). The first milestone is a one-day spike to prove the approach before anything else is built.
- **Start small:** sign in, pick a child, quick log, Today. Then Timeline and Medications, and the rest after that. Push reminders come later and need your decisions first.
- **You set up the store accounts:** Apple Developer ($99 a year) and Google Play ($25 one time). Everything else in this plan is free to start, except where it's marked **ask first**.
- **A real native app, one codebase.** You chose this over two separate Swift + Kotlin apps or a wrapped website. Native screens and navigation, native push, offline logging. **No WebView wrapper of the website.**

---

## 0. What "native" means here

**Your choice:** a real app, built once for iOS and Android ("Real app, one codebase"). Not a website in a frame, and not two separate Swift and Kotlin apps.

**What the app is made of:**
- **Native screens and navigation.** React Native draws real iOS and Android views (UIKit / Android Views), not HTML. Expo Router uses each platform's own navigation stack and tab bar, so you get swipe-back on iOS, the system back button on Android, and native transitions.
- **Native push.** Notifications go through Apple Push Notification service on iOS and Firebase Cloud Messaging on Android, via `expo-notifications`. Local reminders scheduled on the phone use the same native APIs.
- **Offline logging.** Quick log saves to an on-device SQLite database first, and syncs when there's a connection (§4).
- **Native system features:** the Keychain / Keystore for the sign-in token, the system share sheet for check-in and invite links, Dynamic Type, VoiceOver / TalkBack, Reduce Motion, and one-time-code autofill.
- **No WebView wrapper.** No screen loads a lanternway.co page. Screens that aren't built yet simply aren't in the app until they're native (§4, M6). The only web page the app may ever open is in the system browser for something outside the app, like the privacy policy.

**Why Expo counts as native:**
- Expo is the framework React Native's own team recommends for new apps. It compiles to a normal Xcode project and a normal Android Studio (Gradle) project, and ships as a standard `.ipa` / `.aab` through the stores like any other app.
- The JavaScript only describes the screens. Rendering, gestures, storage, notifications and secure storage are the platforms' own code.
- One codebase covers both platforms. That roughly halves the work compared with separate Swift and Kotlin apps, and it shares types and validation with the website (`packages/shared`).

**Where Swift or Kotlin would go if we ever need it:**
- **Expo Modules** (`npx create-expo-module --local`): write a small Swift file for iOS and a Kotlin file for Android inside `apps/mobile/modules/<name>/`, then call it from the app like any other function. This is the place for anything Expo doesn't already cover.
- **Config plugins:** for changes to the native project settings (entitlements, `Info.plist`, `AndroidManifest.xml`) without hand-editing generated files.
- **Likely first candidates:** a Home Screen / lock-screen widget for quick log (WidgetKit in Swift; an App Widget in Kotlin), and Apple HealthKit / Android Health Connect if that's ever wanted (a separate decision).
- **Escape hatch:** `npx expo prebuild` writes out the full `ios/` and `android/` projects, so the app can always be opened and changed in Xcode or Android Studio. Nothing locks us in.

---

## 1. Repo layout: a pnpm workspace monorepo

### Target layout

```
lanternway/
├─ apps/
│  ├─ web/                  ← today's Next.js app (moved, not rewritten)
│  │  ├─ src/ public/ next.config.ts tsconfig.json eslint.config.mjs components.json
│  │  ├─ package.json       (name: "@lanternway/web")
│  │  └─ .env.local         (moved here; still git-ignored)
│  └─ mobile/               ← new Expo app (Milestone M3)
│     ├─ app/               (Expo Router screens)
│     ├─ app.json  eas.json  package.json (name: "@lanternway/mobile")
├─ packages/
│  └─ shared/               ← plain TypeScript, no React, no Node built-ins
│     ├─ src/ types.ts record-schemas.ts family-roles.ts labels.ts dates.ts
│     │       format.ts schedule.ts insights.ts child-profile.ts password-policy.ts
│     │       api.ts (the /api/v1 request + response types)
│     └─ package.json       (name: "@lanternway/shared")
├─ db/                      ← stays at the root: the database belongs to both apps
├─ scripts/                 ← db-setup.mjs, db-test-rls.mjs stay at the root
├─ brand/                   ← stays (source art for both apps)
├─ docs/ and the *.md plans ← stay at the root
├─ package.json             ← workspace root: scripts only
└─ pnpm-workspace.yaml      ← adds packages: ["apps/*", "packages/*"]
```

### What moves where

| Today | Goes to | Notes |
|---|---|---|
| `src/`, `public/` | `apps/web/src/`, `apps/web/public/` | `git mv` so history is kept |
| `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `components.json`, `next-env.d.ts` | `apps/web/` | `@/*` path alias still points to `./src/*` |
| `package.json` dependencies | `apps/web/package.json` | Same versions. The root keeps only scripts and `@neondatabase/serverless` (for the db scripts) |
| `src/lib/types.ts`, `record-schemas.ts`, `family-roles.ts`, `labels.ts`, `dates.ts` (done in M1); later `format.ts`, `schedule.ts`, `insights.ts`, `child-profile.ts`, `password-policy.ts` | `packages/shared/src/` | These import only each other and types, so they can run on a phone. I checked each file's imports |
| `src/lib/log-icons.ts` | stays in web | Uses `lucide-react`. Mobile gets its own icon map |
| `src/mock/` | stays in web | Sample family. Mobile shows it through the API later, or not at all at first |
| `src/lib/db.ts`, `records.ts`, `data.ts`, `sharing.ts`, `checkins.ts`, `families.ts`, `account.ts`, `consents.ts`, `auth/` | stay in web | Server-only. They must **never** be imported by mobile |
| `.env.local` | `apps/web/.env.local` | You move this file yourself (it holds secrets). I won't read or print it |
| `db/`, `scripts/`, `brand/`, docs | stay at the root | |

**How the shared package is used:** it's an "internal package" with TypeScript source and no build step.
- `packages/shared/package.json` has `"exports": { "./*": "./src/*.ts" }`.
- Web adds `transpilePackages: ["@lanternway/shared"]` to `next.config.ts`.
- Metro (Expo's bundler) reads TypeScript directly.
- Imports change from `@/lib/types` to `@lanternway/shared/types`, and the same for the other moved files. This is a mechanical search-and-replace. There are no re-export shims, so each file has one source of truth.
- **Keep React out of `packages/shared`.** Next uses React 19.3 and Expo pins its own React version. A React-free shared package means the two never clash.

### Keeping the commands working

Root `package.json` scripts (you keep typing the same commands):

```json
{
  "scripts": {
    "dev": "pnpm --filter @lanternway/web dev",
    "build": "pnpm --filter @lanternway/web build",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "mobile": "pnpm --filter @lanternway/mobile start",
    "db:setup": "node --env-file=apps/web/.env.local scripts/db-setup.mjs",
    "db:test-rls": "node --env-file=apps/web/.env.local scripts/db-test-rls.mjs"
  }
}
```

- `pnpm dev` and `pnpm dev --port 3123` still start the website. pnpm passes extra arguments through to `next dev`.
- `pnpm db:setup` and `pnpm db:test-rls` still run from the root against the same database. Only the path to `.env.local` changes.
- `pnpm lint` and `pnpm typecheck` run in every workspace package. `packages/shared` gets a `typecheck` of plain `tsc --noEmit`.
- `pnpm-workspace.yaml` keeps today's `allowBuilds` block and adds the `packages:` list.

**Vercel (a dashboard step for you; I'll walk you through it):**
1. Project `lanternway` → Settings → Build and Deployment → **Root Directory = `apps/web`**. Leave "Include files outside the root directory" on, so `packages/shared` is available.
2. Vercel detects the pnpm workspace and installs from the root. The env vars don't change.
3. **Order matters:** change the Root Directory setting first, then push the monorepo commit to `dev`. Otherwise one dev deploy fails. Production (`main`) isn't touched, but it uses the same project setting. When you later promote `dev` to `main`, the layout and the setting will match.
4. Optional: an "Ignored Build Step" (`git diff --quiet HEAD^ HEAD -- apps/web packages/shared`), so mobile-only commits don't redeploy the website.

**Expo in a pnpm monorepo:** current Expo SDKs support pnpm workspaces and set up Metro for monorepos by themselves. If a native library has trouble with pnpm's isolated `node_modules`, the fallback is `node-linker=hoisted` in `.npmrc`. That's a known, documented switch. Try without it first.

---

## 2. The API gap: `/api/v1` for the phone

Today, pages read data in server components (`src/lib/data.ts`), and writes go through server actions (`persistRecord`, `inviteToFamily`, `createLink`, and others). Both depend on the browser's cookies, and server actions aren't a public, stable API. The phone needs plain JSON over HTTPS.

### Rules for every `/api/v1` route

1. **Authenticate first.** `requireUser(request)` finds the user from the session (see §3) or returns `401`.
2. **Call the same lib functions as the web.** `saveRecord`, `loadChildRecords`, `createCheckInLink`, `getAccessForChild` and the rest all run inside `asUser()`. No route writes SQL of its own, so RLS applies the same way it does on the web.
3. **No cookie state.** The web picks the current child from `lw-child`, the sample family from `lw-sample` and the time zone from `lw-tz`. The API takes `childId` in the URL and `tz` as a query parameter or header instead.
4. **Validate with the shared schemas.** The phone runs `record-schemas.ts` before saving, for instant feedback. The server always runs it again.
5. **Typed responses.** Request and response shapes live in `packages/shared/src/api.ts`, so both apps compile against the same contract.
6. **`Cache-Control: no-store`** on every response, and no family data in server logs.
7. **Versioned.** Old app builds stay in people's phones for months. Breaking changes go to `/api/v2`, and `/api/v1` keeps working until the app's minimum version passes it.
8. Add `/api/v1/:path*` to the `src/proxy.ts` matcher only if the session check fits there. Otherwise every route checks the user itself, the way `/api/account/export` does today.

### A small refactor first

Some getters in `data.ts` read cookies (`getChildren`, `getCurrentChild`, `getCurrentAccess`, `getToday`). `saveRecord` also calls `getSignedInUser()` to fill in `loggedBy`.
- Split these into pure functions that take `(user, childId, today)` and are used by both the web wrappers and the API.
- The web pages keep calling the cookie-reading wrappers, so nothing changes on screen.
- This is the biggest web-side change, and it should go in its own commit with a full browser test.

### Endpoints by screen

All paths start with `/api/v1`. "Role" is the minimum family role. RLS enforces it, and the API returns `403` early with a friendly message. **As built in M2**, a few of these differ (screen endpoints return records rather than summaries, delete is `DELETE /records/:collection/:id`, family actions sit under `/families/:familyId/...`); see the notes under M2 in §6. The route files under `apps/web/src/app/api/v1/` are the source of truth.

**Session and account**

| Method + path | Role | Uses |
|---|---|---|
| `POST /auth/sign-up` | public | Neon Auth sign-up + `recordConsents` (the same 4 consents as the web) |
| `POST /auth/sign-in` | public | Neon Auth email + password |
| `POST /auth/verify-email` / `POST /auth/resend-code` | public | `auth.emailOtp.verifyEmail` / `sendVerificationOtp` |
| `POST /auth/forgot-password` / `POST /auth/reset-password` | public | same as `password-actions.ts` |
| `POST /auth/sign-out` | signed in | ends this device's session |
| `GET /me` | signed in | user, families + my role in each, children list, and the minimum app version |
| `POST /account/password` | signed in | `changePassword` |
| `POST /account/sign-out-everywhere` | signed in | `signOutEverywhere` |
| `GET /account/export` | signed in | `exportAccountData`. The phone saves it with the share sheet |
| `POST /account/delete` | signed in | password re-check + `deleteAccountData`. **Required by Apple and Google** |

**Home**

| Method + path | Role | Uses |
|---|---|---|
| `GET /children/:childId/today?tz=` | view | today's logs, week summary, coming up (IEP review, refills, reminders), teacher check-in stats |

**Log (quick log)**

| Method + path | Role | Uses |
|---|---|---|
| `GET /children/:childId/logs?from=&to=` | view | `getLogs` |
| `PUT /records/logs/:id` | log | `saveRecord("logs", …)`. The phone makes the UUID, so retrying is safe (upsert) |
| `PUT /records/milestones/:id` | log | `saveRecord("milestones", …)` |
| `DELETE /records/:id` | log (own kinds) / admin | `deleteRecord` |

**Timeline**

| Method + path | Role | Uses |
|---|---|---|
| `GET /children/:childId/timeline?zoom=week\|month\|year\|all` | view | the same event builder as `timeline/events.ts`. Move it to shared if it's pure |

**Medications**

| Method + path | Role | Uses |
|---|---|---|
| `GET /children/:childId/medications` | view | meds, changes, reminders, before/after check-in data for charts |
| `PUT /records/medications/:id`, `…/medicationChanges/:id`, `…/medicationReminders/:id` | admin | `saveRecord` |
| `GET /medications/search?q=` | signed in | `searchMedicationCatalog` (names only, no doses) |
| `GET /children/:childId/calendar?month=` | view | `schedule.ts` (doses, refills, changes, sessions, appointments) |

**Therapy**

| Method + path | Role | Uses |
|---|---|---|
| `GET /children/:childId/providers` | view | `getProviders` |
| `GET /providers/:providerId` | view | provider + goals + sessions |
| `PUT /records/{providers,therapyGoals,therapySessions}/:id` | admin | `saveRecord` |

**School**

| Method + path | Role | Uses |
|---|---|---|
| `GET /children/:childId/school` | view | IEP plan, goals + progress, supports + delivery log, messages |
| `PUT /records/{iepPlans,iepGoals,…}/:id` | admin | `saveRecord` (one route, the collection comes from the path) |
| `GET /children/:childId/check-ins` | view | respondents, links (without tokens), check-ins |
| `POST /children/:childId/check-in-links` | admin | `createCheckInLink` + `share_checkin` consent. Returns the token **once**. The phone shows the system share sheet |
| `POST /check-in-links/:id/revoke` | admin | `revokeCheckInLink` |

The public teacher form stays on the web at `/c/[token]`. Teachers don't need the app.

**About Me**

| Method + path | Role | Uses |
|---|---|---|
| `GET /children/:childId` | view | child profile |
| `PATCH /children/:childId` | admin | `updateChild` (per-section edits) |
| `POST /children` | admin of a family, or a new family | `insertChild` (the add-a-child wizard) |
| `DELETE /children/:childId` | admin | `deleteChild` |
| `POST /children/:childId/share-consent` | admin | `recordShareConsent`. Real share links come later, after the web builds them |

**Family sharing**

| Method + path | Role | Uses |
|---|---|---|
| `GET /families` | signed in | my families, members, invites (invites for admins only) |
| `POST /families/:id/invites` | admin | `inviteToFamily` + `share_family` consent. Token shown once, then the share sheet |
| `POST /invites/:id/cancel` | admin | `cancelInvite` |
| `PATCH /families/:id/members/:userId` | admin | `setMemberRole` (the last-admin trigger still applies) |
| `DELETE /families/:id/members/:userId` | admin, or yourself (leave) | `removeFromFamily` |
| `POST /join/:token` | signed in | `joinFamily`. Opened from a universal link (see §4) |

**Reports:** not in the first release. They come later as a native screen, plus a PDF from the PDF export task, shared with the system share sheet. The phone doesn't open the web report page.

### What the phone must never do

- Connect to Neon, or hold any `DATABASE_URL`, Neon key or Resend key.
- Call Neon Auth's URL directly with secrets. The phone only ever calls `https://<our domain>/api/...`.
- Store family data unencrypted outside the app's sandbox, or put it in push payloads, logs or crash reports.

---

## 3. Auth on mobile (Neon Auth / Better Auth)

### What I found (Nov 1, 2026)

- **Neon Auth has no Expo or React Native docs.** Its documented clients are Next.js and browser React, using HTTP-only cookies. Its roadmap lists separate frontend and backend deployments as "coming soon, not yet supported".
- **Better Auth's own Expo plugin doesn't fit.** That's `@better-auth/expo`, with `expo()` on the server and `expoClient` + `expo-secure-store` on the phone. It needs the server plugin, and Neon says server-side config is pre-set and can't be changed in the managed service.
- **Neon offers a JWT plugin** for "separate frontend and backend" setups:
  - tokens come from `authClient.token()`, or the `set-auth-jwt` header on a session response;
  - they're signed with EdDSA, last 15 minutes, and can be checked against `<NEON_AUTH_URL>/.well-known/jwks.json`;
  - getting one still needs a live session.
- **Email OTP is supported.** We already use `auth.emailOtp.verifyEmail` / `sendVerificationOtp` on the web, so codes work the same way through our API.

Sources: neon.com/docs/auth/roadmap, /docs/auth/about, /docs/auth/guides/plugins/jwt; better-auth.com/docs/integrations/expo, /plugins/bearer, /plugins/email-otp. Neon's API changes quickly (we're on `@neondatabase/auth` 0.7.0-beta). The spike below confirmed what works today.

### Settled: our server signs in for the phone (spike passed Nov 1, 2026)

The M0 spike (branch `spike/mobile-auth`) passed all 14 checks against the dev database with no new dependencies. The phone never talks to Neon Auth. Our `/api/v1/auth/*` routes call the Neon Auth server SDK, the same way the web's server actions do.

**How it works:**
- `apps/web/src/lib/api/auth.ts` (from the spike's `bearer.ts`) uses the SDK's framework-agnostic `createAuthServer()` from `@neondatabase/auth/server`, the same thing the Next.js adapter is built on, with a per-request context:
  - the bearer token goes in as the `__Secure-neon-auth.session_token` cookie;
  - cookies Neon Auth sets on sign-in are caught, so the route can return the token in JSON;
  - `Origin` is always our own origin, which is already trusted.
- Only the session token is passed upstream, never the cached `session_data` cookie. So every check asks Neon Auth, and revoking a session takes effect immediately.
- `/api/v1` isn't in the `apps/web/src/proxy.ts` matcher, so the web's cookie redirect doesn't touch it. The CSP, trusted domains and the web sign-in are unchanged.

**The steps:**
1. **Sign in.** The phone POSTs email + password to `/api/v1/auth/sign-in` and gets `{ token, user }` in JSON. No cookies are set. A wrong password returns `401`. An unverified email returns `403 { error: "needs_verification" }`: Neon Auth answers 422 `email_not_confirmed`, which the route maps.
2. **Store it.** The phone keeps the token in **`expo-secure-store`** (Keychain on iOS, Keystore on Android), with `keychainAccessible: AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`. Nothing goes in AsyncStorage, and nothing is backed up to iCloud.
3. **Use it.** Every request sends `Authorization: Bearer <token>`. `getBearerUser(request)` checks it with Neon Auth (`getSession` with the cookie cache off). A made-up, signed-out or revoked token returns `401`, and the phone goes back to sign-in. If Neon Auth is rate-limiting or down, the API answers `503` with `Retry-After` instead, and the phone retries without signing out.
4. **Sign out** (`POST /api/v1/auth/sign-out`) ends only this device's session; other devices stay signed in (tested). `POST /api/v1/account/sign-out-everywhere` ends every session, this one included (tested). Account deletion removes all sessions with the user.
5. **Email verification by code:**
   - sign-in or sign-up returns `needs_verification`;
   - the phone shows a 6-digit code screen with `textContentType="oneTimeCode"` / `autoComplete="sms-otp"` (Android), so the phone can offer to fill in the code;
   - it then calls `/auth/verify-email` and `/auth/resend-code`, which wrap `emailOtp.verifyEmail` / `sendVerificationOtp` like the web does.
   - Built in M2. If Neon Auth signs the person in when they verify, `/auth/verify-email` returns a token too; otherwise the app signs in next. Not tested with a real emailed code yet (QA accounts are verified with admin SQL).
6. **No OAuth, so no deep-link redirects.** Email + password and codes don't need `trustedOrigins` app schemes. If Google sign-in is ever added, Apple requires "Sign in with Apple" too. That's a separate decision.
7. **Optional later:** Face ID / fingerprint to unlock the app (`expo-local-authentication`), which keeps the token behind the device lock. **Ask first**: it's a new SDK, though it's free.

**Costs and open points:**
- **One Neon Auth round trip per API request** (no session cache). Neon's managed auth rate-limits these checks: the M2 test hit `429` after about a hundred quick calls. The API now answers that with `503` + `Retry-After`, so nobody gets signed out. **Decision for you before launch:** cache "token → user" in memory for 30–60 seconds, which cuts the calls but delays a revoke by the same amount. Or ask Neon about the limit. With a handful of calls per screen it may never matter.
- **Password change** signs out other devices and gives this device a new token (tested in M2); the app stores it.
- **Session lifetime** is Neon Auth's (Better Auth sessions expire after a period without use). The phone treats any `401` as "sign in again". M2 should check whether `/me` renews the session; if not, add a refresh step.
- **Not needed:** Neon's JWT plugin, `jose` and self-hosted Better Auth. They stay as fallbacks only if Neon changes how server-side sessions work.

## 4. Screens, offline, notifications

### First screens (mobile-first, quick log first)

Build in this order. Each is a small, testable step:

1. **Sign in / sign up / verify code / forgot password**, with the same 4 consents and the 10+ character password rule (`password-policy.ts` from shared).
2. **Child picker**, with the current child remembered on the device. The header shows the child's name and photo, as on the web.
3. **Quick log (the heart of the app):** mood, sleep, appetite, meltdown (trigger, intensity, duration, what helped), win, note.
   - Big cream tiles, one thumb, done in under 15 seconds.
   - It saves optimistically and works offline.
   - Hard days are logged without guilt, with the same gentle labels from `labels.ts`.
4. **Today (Home):** what's logged today, this week's summary, coming up.
5. **Timeline** (read-only first).
6. **Medications:** list, doses, changes, the calendar, and reminder settings (saved, not sent).
7. **Therapy, School, About Me, Family sharing, Account** in a later milestone, all as native screens. Until each one is built, it isn't in the app: no web pages inside the app as stand-ins. Internal test builds can ship without them. The **store release waits for at least Account (with delete account)**, because Apple and Google require in-app deletion.

**Look and feel:**
- Brand tokens as a small theme file (`amber`, `coral`, `teal`, `cream`, `paper`, `white`) and Nunito via `expo-font`.
- Rounded cards, and the same three surface levels as the web.
- Respect the device's **Reduce Motion** setting (`AccessibilityInfo.isReduceMotionEnabled`) and Dynamic Type / font scaling.
- Every tappable thing is at least 44×44 pt and has an accessibility label.
- Lumi art comes from `brand/` through one `brand.ts` map in the mobile app, so the SVGs can replace it later. Lumi is always "Lumi from Lanternway".

**Libraries (all free, from the Expo team; listed so you can approve them in one go):**
- `expo-router`, `expo-secure-store`, `expo-font`, `expo-sqlite`, `expo-crypto` (for UUIDs);
- later: `expo-notifications`, `expo-local-authentication`.

**Ask first:** a charts library for React Native (Recharts is web-only). The options are `victory-native` (needs Skia) or simple hand-drawn SVG with `react-native-svg`. My suggestion: `react-native-svg` for the first, simple charts.

### Offline behaviour

- **Writes:** every save goes into an on-device outbox (SQLite) with a phone-made UUID. A worker sends it when the connection is back. The server's `saveRecord` already upserts by id, so sending the same item twice is harmless.
- **Status:** each item shows "Saved" or "Waiting to sync". There's no scary error. If the server rejects an item (for example, the person's role changed to view), the app says so gently and keeps a copy the person can see.
- **Reads:** the last-loaded data for each child is cached on the device, so Today and Timeline open instantly on a plane. A small "Last updated 2 h ago" note shows the age.
- **Conflicts:** last write wins per record (`updated_at`). That's fine for logs, which are almost always one person's. Edits from two devices at once to the same IEP goal are rare. Revisit if it comes up.
- **Sign out or account deletion** wipes the outbox and cache.
- **Encryption:** SQLite lives in the app's private sandbox, which iOS and Android already encrypt while the phone is locked. Full database encryption (SQLCipher) is a later option. **Ask first** if wanted.

### Universal links

- `https://<domain>/join/[invite]` opens the app if it's installed (Apple App Site Association + Android `assetlinks.json`, served by the web app). Otherwise it opens the web page as today.
- Check-in links (`/c/[token]`) **always stay on the web**, so teachers never need the app.

### Push notifications for medication reminders (later; decisions first)

The reminder settings are already saved (migration 007). Sending them needs:

| Piece | Choice | Cost / decision |
|---|---|---|
| Delivery | Expo Push Service → APNs / FCM | The Expo push service is free. APNs comes with the Apple account. FCM needs a free Firebase project (**a new vendor, ask first**) |
| Scheduler | Something that runs every few minutes and finds due reminders | Vercel Cron that often needs **Vercel Pro (paid)**. Alternatives: Neon `pg_cron` calling a webhook, or a free external cron. **Your call** |
| Device tokens | New `push_devices` table (user, token, platform, last seen) | **RLS: a user sees only their own rows**, plus new `db:test-rls` checks |
| On-device alternative | Local notifications scheduled on the phone with `expo-notifications`; no server needed | Free and private. Downsides: it only reminds the phone that set it, and it must be rescheduled when settings change. **My suggestion for v1:** start here |
| Wording | Private by default ("Maya's 8:00 AM reminder") unless the parent opts in per reminder | Already designed |

- Ask for notification permission only when the parent turns a reminder on, never at first launch.
- Never put the medication name or dose in a push payload unless the parent opted in.
- Reminders are **reminders the parent set**, not advice. The app never suggests a time, dose or change.

### Refill reminders (push in the phone app, tap to text or call)

The user chose this design (Nov 1). It sits next to dose reminders and uses the same push setup and permission prompt. There's no SMS from Lanternway.

- **When:** N days before the refill is due. The due date is `lastFilledOn` + `daysSupply`, the same date `refillDueDate()` already shows on Home and the calendar.
  - N is set per medication: 3, 5, 7 or 10 days, default 5.
  - The reminder arrives at a fixed morning time in the family's time zone.
  - No reminder for a stopped medication (`stopDate` in the past) or one without both dates.
  - When the parent records a new `lastFilledOn`, the next reminder moves with it.
- **Data:** optional fields on the existing `medication` record, for example `refillReminderDays` (3 | 5 | 7 | 10) and `pharmacyPhone`. The prescriber's phone comes from their `provider` record (`prescriberId`). There's no new record kind and no migration.
  - The fields only need adding to the `medications` spec in `packages/shared/src/record-schemas.ts`. `PUT /api/v1/records/medications/:id` and the read endpoints pass record fields through that spec generically, so no endpoint changes are needed.
  - Fields not in the spec are dropped on save, so add them there first.
- **Delivery:** the same choice as dose reminders.
  - A local notification scheduled on the phone with `expo-notifications` is enough here, because the date is known days ahead. It's free, nothing leaves the phone, and it's rescheduled whenever the medication changes or the app syncs.
  - Server push through the Expo push service would reach every family member's phone. It needs the `push_devices` table and the scheduler decisions above.
- **Wording:** private by default ("Refill coming up for Maya in 5 days"). The medication name appears only if the parent opted in for that medication. Never a dose.
- **Tap to text or call:** the notification opens the medication's screen with buttons that hand off to the parent's own apps through `Linking.openURL`:
  - **Text the pharmacy / prescriber:** `sms:<number>` with a pre-written note. The parent reads, edits and sends it from their own Messages app.
    - The body syntax differs by platform: `sms:+15555550123&body=…` on iOS, `sms:+15555550123?body=…` on Android. Build it per `Platform.OS`, and URL-encode the body.
    - Example note: "Hi, this is Dana, Maya's parent. Could you please refill Maya's [medication] prescription? Thank you."
  - **Call:** `tel:+15555550123`.
  - Use `Linking.canOpenURL` first (an iPad or a phone with no SIM can't text or call), and fall back to showing the number with a Copy button.
  - Lanternway never sends the message or places the call. The note asks for a refill and nothing else: no dose, symptoms or advice (CLAUDE.md rule 2).
- **Web (built Nov 2):** the medication card shows "Refill due" and the reminder setting; Add/Edit have Pharmacy phone and Refill reminder; a Refill button opens the editable note with Text / Call / Copy. The fields are `pharmacyPhone` and `refillReminderDays` (unset = 5, 0 = off). Reuse `packages/shared/src/refills.ts` in the app: `refillReminderDate()`, `refillNote()`, `smsHref(phone, body, Platform.OS)`, `telHref()`, `dialable()`.

---

## 5. App Store and Google Play

### Accounts (yours to set up; I'll walk you through each step)

- **Apple Developer Program:** $99/year.
  - Enrol as an **organization** (needs a D-U-N-S number, which is free but takes days to weeks), so the store shows "NSoul Co" rather than your personal name.
  - Then App Store Connect → new app, bundle id `co.lanternway.app`.
- **Google Play Console:** $25 one time.
  - Organization account. Identity verification takes a few days.
  - New personal developer accounts must run a **closed test with at least 12 testers for 14 days** before production. Organization accounts are currently exempt, which is another reason to pick an organization.
- Never paste keys or passwords into chat. EAS stores the signing credentials.

### EAS Build and Submit

- **EAS (Expo Application Services)** builds the iOS and Android binaries in the cloud. You don't need a Mac with Xcode for every build.
  - The free tier has a monthly build quota with a slower queue, which is enough for us to start.
  - The paid tiers are faster. **Ask before upgrading.**
- `eas.json` profiles:
  - `development`: a dev client on your phone;
  - `preview`: internal testers via TestFlight and the Play internal track;
  - `production`: the store builds.
- `eas submit` uploads to App Store Connect and Play Console.
- **EAS Update** (over-the-air JavaScript updates) is useful for quick fixes. It must not change what the app does in a way reviewers didn't see.
- Each build profile points at an API base URL: `dev.lanternway.co` for development and preview, and production only after you promote `dev` to `main`.

### Privacy labels and Data safety (health data)

Answer these honestly, from what we actually collect. The draft answers, for counsel to check:

**Apple "App Privacy" nutrition label:**
- Data Linked to You:
  - **Health & Fitness → Health** (logs, medications, therapy, school plans, diagnoses in About Me);
  - **Contact Info → Name, Email Address**; Phone Number only once text reminders exist;
  - **User Content** (notes, messages log, photos if added);
  - **Identifiers → User ID**.
- **Used for:** App Functionality only. **Not** used for tracking, advertising or analytics.
- **"Data Used to Track You": none.** No App Tracking Transparency prompt is needed, because there are no trackers (CLAUDE.md rule 1).
- A **privacy manifest** (`PrivacyInfo.xcprivacy`) listing "required reason" APIs. Expo generates most of it; check the libraries' entries.

**Google Play Data safety form:**
- Collected:
  - **Health and fitness → Health info**;
  - **Personal info → Name, Email**;
  - **App activity → Other user-generated content**;
  - **Photos** if added.
- Shared with third parties: **No**. Service providers (Neon, Vercel, Resend) count as processing on our behalf, not sharing.
- Encrypted in transit: Yes.
- Users can request deletion: Yes, both in the app and through a **web deletion URL** (Play requires one, e.g. `https://lanternway.co/delete-account`; it needs a small web page).
- Also fill in Play's **Health apps declaration**. Lanternway is a personal health record / organizer, not a medical device.

**Both stores:** a public privacy policy URL (the `/privacy` draft must be final and counsel-reviewed first), a support URL and a contact email.

### Review risks (and how we handle them)

| Risk | Why | Mitigation |
|---|---|---|
| **Medical claims** (Apple 1.4.1, Play health policy) | Health apps that seem to diagnose or advise get extra scrutiny | No advice anywhere (CLAUDE.md rule 2). The store text says "records and organizes". Show the disclaimer on reports and in About: "Lanternway is a record-keeping tool and does not provide medical advice." |
| **Kids category / COPPA** | The app is *about* children | It's **for parents**. Pick Medical or Health & Fitness, **not** the Kids category. Age rating: 17+ or 18+ to match the adults-only sign-up. No child accounts |
| **Sign-in wall** | Reviewers need to get in | Give App Review a demo account with the fictional sample family. Never real data |
| **Account deletion** (Apple 5.1.1(v), Play) | Required when an app has sign-up | In-app delete is already built on the web. The mobile Account screen calls `/account/delete` |
| **"Just a website" (Apple 4.2)** | Apps that only wrap a website get rejected | Every screen is native, with native navigation, offline logging, push and the share sheet. No WebView pages anywhere |
| **Health data and sensitive permissions** | Camera, photos and notifications each need a clear purpose string | Ask only when used, with plain-English purpose strings. No HealthKit / Health Connect for now. Adding them brings more rules and a separate decision |
| **Data safety mismatches** | Play rejects or removes apps whose form doesn't match the SDKs inside | No analytics or crash SDKs without asking first. Re-check the form whenever a dependency is added |
| **Subscriptions later (Stage 3)** | Apple and Google require in-app purchase for digital subscriptions bought in the app | Decide later: in-app purchase, or a sign-in-only app with no purchase screens. Don't add Stripe screens to the app without that decision |

Also do before submitting:
- the WCAG / accessibility pass on mobile (VoiceOver, TalkBack);
- counsel review of the policies (already on your list in `COMPLIANCE.md`);
- removing the test-data notice for production builds.

---

## 6. Milestones (small steps)

Each step keeps `pnpm dev` working, passes `pnpm lint && pnpm typecheck`, and runs `pnpm db:test-rls` whenever the database changes. Add these as **Stage 4** in `BUILD_PLAN.md` once you approve the plan.

### M0. Auth spike (one throwaway branch, about a day)
- [x] One test route `GET /api/v1/me` that accepts `Authorization: Bearer <token>`. A tiny Node script signs in a QA account through a test `/api/v1/auth/sign-in`, then calls `/me`. Confirm the session token can be returned and verified server-side with the Neon SDK, and that sign-out everywhere kills it
- [x] ~~If that fails, try the JWT plugin route~~. Not needed: the session-token route passed 14/14 checks (Nov 1). The spike's code was carried into M2; §3 is settled

### M1. Monorepo (no behaviour change)
- [x] Add `packages:` to `pnpm-workspace.yaml`. Move the web app to `apps/web` with `git mv`. Add the root scripts. Move `.env.local` (you)
- [x] Create `packages/shared`, move the shared lib files, update imports, add `transpilePackages`. So far: `types`, `record-schemas`, `family-roles`, `labels`, `dates`. The other pure files (`format`, `schedule`, `insights`, `child-profile`, `password-policy`) move when mobile first needs them
- [x] `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm db:setup`, `pnpm db:test-rls` all pass. Browser smoke test done at 390px and 1280px
- [ ] You set Vercel's Root Directory to `apps/web`, then push to `dev` and check dev.lanternway.co

### M2. API v1 (web side only, testable with a script)
- [x] Data-layer refactor: cookie-free readers in `apps/web/src/lib/child-data.ts` take `(userId, childId, …)`; `data.ts` keeps its signatures. Web pages unchanged (separate commit; browser-checked at 390px and 1280px as an admin and a view-only member)
- [x] `withUser` (= `requireUser`) + `/api/v1/auth/*` (sign-up with consents, sign-in, verify code, resend, forgot password, sign-out) + `GET /me`
- [x] Home, logs + milestones (PUT/DELETE), Timeline endpoints
- [x] Medications, med search. The calendar is worked out on the phone from the Medications and Therapy data (`schedule.ts`)
- [x] Therapy and School endpoints, check-in links (create shows the token once, revoke)
- [x] About Me, add/remove child, Family sharing, join, account (password, sign out everywhere, export, delete)
- [x] `scripts/api-test.mjs` (`pnpm api:test <url>`): four QA accounts (admin, "can log", "can view", another family), 111 checks. Every route answers 401 signed out and with a made-up token, 403 for the wrong role, and 404 across families. Tokens are shown once. Cleans up its QA accounts

**Built differently from §2 (on purpose):**
- **Screen endpoints return the records, not finished summaries.** `/home` returns this week's logs, check-ins, plan, meds and providers. The phone works out the week stats and "coming up" with the shared code. So `insights.ts`, `format.ts` and `schedule.ts` move to `packages/shared` in M3.
- **Provider detail** is part of `GET /children/:id/therapy` (all providers' goals and sessions), with no separate `/providers/:id`.
- **Delete is `DELETE /records/:collection/:id`.** Next.js doesn't allow `records/[id]` next to `records/[collection]/[id]`. The server checks that the record really is of that collection.
- **Resetting a password** happens on the website's `/reset-password` page from the emailed link. The phone only asks for the email (`/auth/forgot-password`).
- **Neon Auth rate limits are 503, not 401** (see §3).
- **Saving over another family's record id now returns 404.** Before, the API answered 200 while the database (correctly) changed nothing. `saveRecord` now reports when the upsert touched no row.

### M3. Expo app skeleton (ask first: approve the Expo library list in §4)
- [x] `apps/mobile` with Expo Router, TypeScript, brand theme, Nunito, and an API client typed from `@lanternway/shared/api`. Expo SDK 58. Libraries: the approved `expo-router` (with its required peers `react-native-safe-area-context`, `react-native-screens`, `expo-linking`, `expo-constants`, `expo-status-bar`), `expo-secure-store` and `expo-font`, plus `@expo-google-fonts/nunito` (the Nunito font files). `expo-sqlite` and `expo-crypto` aren't installed until something uses them (M5)
- [x] Runs in the iOS Simulator (Expo Go, iPhone 18 Pro) against the website's dev server: the placeholder screen calls `GET /api/v1/me` and shows the signed-out answer. `pnpm mobile` starts it. **Android Emulator not tried:** no Android SDK on this Mac yet. iOS and Android bundles both build (`expo export`)
- [x] Lint (`eslint-config-expo`) and typecheck for mobile are included in the root `pnpm lint` and `pnpm typecheck`
- [ ] Move `insights.ts`, `format.ts` and `schedule.ts` to `packages/shared`, so the phone can work out Home's week stats, "coming up" and the calendar (needed by M5–M6)

### M4. Sign-in on the phone
- [x] Sign in, sign up (4 consents, the website's wording, in `@lanternway/shared/api`), verify by code, forgot password (the reset itself happens on the website's page from the email), sign out. Token in SecureStore (`AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`), never AsyncStorage
- [x] Expired or revoked session → back to sign-in with "You've been signed out. Please sign in again." No connection or a 503 never signs anyone out: the app says it can't reach Lanternway, keeps the token, and offers Try again
- [x] Checked in the iOS Simulator (Expo Go, iPhone 18 Pro) with a QA account:
  - sign up → code → signed in;
  - the token survives an app restart;
  - sign out → wrong password (gentle error) → sign in;
  - sessions revoked in the database → back to sign-in with the note;
  - website stopped → "can't reach" while staying signed in → Try again → signed in;
  - forgot password.
  - The code step used a known code written into the QA account's pending verification with admin SQL (codes are stored hashed).

### M5. Quick log + Today
- [ ] Child picker and header
- [ ] Quick log tiles and forms, validated with shared `record-schemas`
- [ ] Offline outbox (SQLite) + sync + "Waiting to sync" status
- [ ] Today screen with a cached last load
- [ ] Test on a real phone in airplane mode (dev build)

### M6. Read screens
- [ ] Timeline (week / month / year / all)
- [ ] Medications list, dose history, calendar, simple charts (ask first: chart library)
- [ ] "More" tab lists only the native screens built so far. No web pages inside the app

### M7. First internal build
- [ ] **You:** Apple Developer + Google Play accounts (organization). Then `eas.json` profiles and the first `preview` builds to TestFlight / Play internal testing
- [ ] Universal links for `/join/[invite]` (AASA + `assetlinks.json` from the web app)
- [ ] App icon + splash from `brand/` (Lumi from Lanternway)

### M8. Remaining native screens
- [ ] Therapy (providers, goals, sessions)
- [ ] School (IEP, goals, supports, messages, check-in links with the share sheet)
- [ ] About Me (view + per-section edit)
- [ ] Family sharing (invite via share sheet, roles, leave)
- [ ] Account (password, sign out everywhere, export, **delete account**)

### M9. Store submission
- [ ] Final privacy policy (counsel), a support page, and a web account-deletion page
- [ ] App Privacy label, privacy manifest, Play Data safety + Health apps declaration (from §5)
- [ ] Store listing text (no medical claims), screenshots of the fictional sample family, App Review demo account
- [ ] Accessibility pass (VoiceOver, TalkBack, large text, Reduce Motion)
- [ ] Production API base URL. This **requires you to decide on promoting `dev` → `main` first**

### M10. Medication reminders (after your decisions in §4)
- [ ] Decide: local notifications only (free), or server push (FCM project + a scheduler, maybe Vercel Pro)
- [ ] Local: schedule from the saved reminder settings and reschedule on change, sign-out and pause. Use private wording by default
- [ ] Server push (if chosen): `push_devices` table **with RLS + `db:test-rls` checks**, a scheduler, Expo push. Skip stopped meds and paused reminders, and respect time zones
- [ ] Refill reminders (§4): schedule N days before `lastFilledOn` + `daysSupply` from the medication's `refillReminderDays`. Opening it shows tap-to-text (`sms:`, per-platform body syntax) and tap-to-call (`tel:`) buttons for the pharmacy and prescriber, with a Copy fallback. The web side and the record fields are built first in the main checkout

### Later (Stage 4 extras, each needs its own decision)
- Home-screen widgets and quick log from the lock screen (iOS WidgetKit / Android widgets need native code via config plugins)
- Face ID / fingerprint unlock
- The sample family in the app
- PDF reports on the phone
- Teacher accounts in the app (after `APP_MAP.md` teacher accounts ship on the web)

---

## Decisions for you

1. **Approve the monorepo move** (M1). It touches every import of the shared files, but changes no behaviour.
2. **Approve the free Expo libraries** in §4 (`expo-router`, `expo-secure-store`, `expo-font`, `expo-sqlite`, `expo-crypto`).
3. **Chart library on mobile:** `react-native-svg` (my suggestion) or `victory-native`.
4. **Reminders v1:** local notifications on the phone (free, my suggestion) or server push (Firebase + a scheduler, maybe Vercel Pro).
5. **Store accounts:** organization accounts under NSoul Co (my suggestion). You'll need a D-U-N-S number for Apple.
6. **When the app talks to production:** it needs `dev` promoted to `main` first.
