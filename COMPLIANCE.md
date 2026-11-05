# Lanternway — Compliance Tracker

_Not legal advice. Status of the privacy and security work; counsel should confirm the list._
Last updated: Oct 26, 2026.

## Before real families (blockers)
| Item | Status | Notes |
|---|---|---|
| Privacy Policy | 🟡 Draft at `/privacy` | Plain-English draft of actual practices. **Needs counsel review**; fill placeholders in `src/lib/policies.ts` (`LEGAL`) |
| Terms of Use | 🟡 Draft at `/terms` | Warranty disclaimer, liability, governing law to be written by counsel |
| Consumer Health Data Privacy Policy (WA MHMDA, NV, CT) | 🟡 Draft at `/health-data-privacy` | Needs counsel review |
| Opt-in consent at sign-up | ✅ Built | Four required boxes (adult guardian, terms + privacy, health data collection, test data), recorded in `consents` with policy versions. Wording needs counsel approval |
| Separate consent before sharing | ✅ Built | About Me: link appears only after consent, recorded with the sections shared. Teacher check-ins: parent ticks a consent box before each link is created (`share_checkin`, recorded with child and expiry) |
| Adult parent / guardian confirmation | ✅ Built | Checkbox at sign-up |
| Data export | ✅ Built | Account & privacy → Download my data (JSON) |
| Delete my account | ✅ Built | Password + "DELETE"; one transaction deletes family data (or just membership if others share the family), consents, and the sign-in account (sessions cascade); signs out. Neon's managed auth has no self-service delete endpoint, so the sign-in account is removed by `delete_my_auth_account()` (migration 004), which can only delete the caller. Revisit if Neon adds the endpoint |
| Backup retention | ✅ Documented | Neon restore history is 6 hours; stated in the Privacy Policy. Keep it in sync if the plan changes |
| Own email sender (Resend) | ✅ Built | Neon Auth sends via Resend SMTP as `Lanternway <noreply@send.lanternway.co>` (domain verified; restricted sending-only key). Email verification by 6-digit code is required for new accounts (real delivery confirmed by the owner, Oct 26); forgot/reset password works. Sign Resend's DPA |
| Vendor data agreements | ⬜ You | See below |
| Breach response plan | 🟡 Draft | `docs/compliance/BREACH_RESPONSE.md`. Fill in names; counsel review |
| Security headers + CSP | ✅ Built | `next.config.ts` |
| Password policy | ✅ Built | 10+ characters, blocks common passwords and your email (`src/lib/password-policy.ts`) |
| Two-step sign-in | ⬜ Not available | Neon's managed auth has no 2FA plugin yet. Revisit, or use passkeys/2FA when offered |
| Remove the test-data notice | ⬜ Later | Only after counsel signs off on the documents above |

## Vendor data agreements (you sign; mostly click-through)
| Vendor | What they handle | Action |
|---|---|---|
| Neon | Database and sign-in (all family data) | Accept Neon's DPA in the console/legal pages. HIPAA BAA only needed if HIPAA ever applies (paid plan) |
| Vercel | Hosting (data passes through) | Accept Vercel's DPA. BAA only on Enterprise, only if HIPAA applies |
| Resend | Account emails (email addresses) | Accept Resend's DPA |
| Stripe (later) | Payments | Accept Stripe's DPA; use Stripe Checkout so card data never touches us |

Keep a copy of each signed agreement outside Lanternway's systems.

## Family sharing (built)
- An admin invites a co-parent, grandparent or sitter with a role: view, log (daily logs and milestones only), or admin. Roles are enforced by row-level security, not just the UI (migration 008, `pnpm db:test-rls`).
- Invites are private links: only a SHA-256 hash is stored, shown once, single use, 7 or 30 days, revocable. Anyone holding an unused link can accept it (the owner's choice), so the dialog says to send it only to that person.
- The admin ticks a consent box before each invite (`share_family`, recorded with role and expiry).
- A family always keeps an admin (database trigger). The only admin of a shared family can't delete their account until they hand off; data export covers only families you're an admin of.
- Privacy Policy draft now says family members see each other's names and emails.

## Medication reminders (settings saved, not sending yet)
- Lock-screen privacy: reminders don't name the medication unless the parent opts in per reminder.
- Before turning on **texts**: SMS vendor DPA, confirm the number (one-time code), clear opt-in wording, STOP/HELP replies, US carrier (10DLC) registration. Texts with a medication name count as health data leaving Lanternway; keep the private wording as the default.
- Before turning on **push**: ask permission on the device only when the parent turns reminders on; push payloads should carry the private wording only.
- Privacy Policy draft now lists reminder settings and phone numbers.

## Website security (checked Nov 4, 2026)

**In place:**
- **Headers** (`apps/web/next.config.ts`):
  - CSP limited to our own origin, with `frame-ancestors 'none'`, `object-src 'none'`, `base-uri` and `form-action 'self'`;
  - HSTS for 2 years including subdomains;
  - nosniff, `X-Frame-Options: DENY` and a strict Referrer-Policy;
  - a Permissions-Policy that turns off camera, microphone, location, payment and device APIs;
  - COOP and CORP set to same-origin;
  - no `X-Powered-By` header;
  - `noindex` everywhere except production.
- **Authorization:**
  - every server action and `/api/v1` route checks the signed-in user itself, not only the proxy;
  - row-level security is the final guard (`pnpm db:test-rls`, `pnpm api:test`);
  - the phone API uses bearer tokens only (no cookies, so no cross-site request forgery) and sends no CORS headers.
- **Server-only code:** database, auth, cookie and data modules import `server-only`, so a mistaken import into browser code fails the build.
- **Redirects:** sign-in only returns to `/home` or `/join/<valid invite>`, never to a URL from the request, so there's no open redirect.
- **Secrets:**
  - `.env*` files are git-ignored, and no `NEXT_PUBLIC_` variables are used;
  - the website reads only `DATABASE_URL` (the limited `lanternway_app` role), `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET`;
  - `DATABASE_URL_ADMIN` is used only by local scripts.
- **Public tokens:** check-in and invite links are 256-bit, stored only as SHA-256 hashes, and expire and can be revoked. Check-in notes are capped at 600 characters in the database.
- **Dependencies:** `pnpm audit --prod` shows no critical or high advisories.
  - `pnpm-workspace.yaml` overrides `better-auth` to 1.7.14, because `@neondatabase/auth` 0.7.0-beta pins the vulnerable 1.7.6. Remove the overrides when Neon's SDK ships a patched version.
  - What's left is 1 low and 2 moderate, in Expo build tooling and an email-template helper, not in the deployed site.

**Known trade-off:** the CSP still allows inline scripts (`'unsafe-inline'`).
- Next.js streams pages with inline scripts, and nonce-based CSP doesn't work with Partial Prerendering / Cache Components (Next.js CSP guide).
- React escapes all output and the code has no `dangerouslySetInnerHTML`, which keeps the cross-site scripting risk low.
- Revisit if Next.js ships hash-based CSP for streamed scripts.

**Settings only the owner can change (Vercel, GitHub, Neon):**
- **Two-factor authentication** on Vercel, GitHub, Neon, Resend and the domain registrar.
- **Vercel → Deployment Protection:** keep Vercel Authentication on for preview deployments.
- **Vercel → Firewall:**
  - turn on Bot Protection;
  - add a rate-limit rule for `POST` to `/sign-in`, `/sign-up`, `/forgot-password` and `/api/v1/auth/*`, for example 10 requests a minute per IP;
  - Attack Challenge Mode is the switch to flip during an attack.
- **Vercel → Spend Management:** set a cap, so a traffic flood can't run up a bill.
- **Vercel → Environment Variables:** mark secrets as Sensitive, and never add `DATABASE_URL_ADMIN`.
- **GitHub:**
  - branch protection on `main` (no force pushes; changes through pull requests);
  - Dependabot alerts and secret scanning turned on.
- **Neon:** rotate the admin role's password if it was ever shared, and keep the website on `lanternway_app`.
- **HSTS preload** (optional): add `preload` and submit the domain at hstspreload.org, once every subdomain is HTTPS-only for good.

## Before a wider launch
- Real sharing links (hashed tokens, expiry, revoke, view log)
- Audit log of who viewed or changed a child's record
- Privacy-safe error monitoring (no child details in logs)
- Accessibility audit (WCAG 2.2 AA)
- Security review / penetration test (BUILD_PLAN Stage 3)
- App store health-data disclosures (mobile)

## Only if the product goes there
- Clinician/therapist dashboard → HIPAA (BAAs, HIPAA plans)
- Selling to schools → FERPA, state student-privacy laws, district DPAs
- Teen mode / child-facing screens → COPPA, state teen laws
- Users outside the US → GDPR / UK GDPR / Canada
- Lumi / AI summaries → no-retention AI vendor, strict no-diagnosis wording (FDA)
