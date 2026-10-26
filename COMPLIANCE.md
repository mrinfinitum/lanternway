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
| Separate consent before sharing | ✅ Built for About Me | Link appears only after consent; recorded with the sections shared. Teacher check-in invites need the same when they're built |
| Adult parent / guardian confirmation | ✅ Built | Checkbox at sign-up |
| Data export | ✅ Built | Account & privacy → Download my data (JSON) |
| Delete my account | ✅ Built | Password + "DELETE"; one transaction deletes family data (or just membership if others share the family), consents, and the sign-in account (sessions cascade); signs out. Neon's managed auth has no self-service delete endpoint, so the sign-in account is removed by `delete_my_auth_account()` (migration 004), which can only delete the caller. Revisit if Neon adds the endpoint |
| Backup retention | ✅ Documented | Neon restore history is 6 hours; stated in the Privacy Policy. Keep it in sync if the plan changes |
| Own email sender (Resend) | ✅ Built | Neon Auth sends via Resend SMTP as `Lanternway <noreply@send.lanternway.co>` (domain verified; restricted sending-only key). Email verification by 6-digit code is required for new accounts; forgot/reset password works. Sign Resend's DPA |
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
