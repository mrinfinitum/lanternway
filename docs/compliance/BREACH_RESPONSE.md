# Lanternway — Data Breach Response Plan

_Draft, Oct 26, 2026. For review by counsel. Keep it short enough to use under stress._

Lanternway stores sensitive information about children (health, school, therapy). Treat any
suspected exposure as urgent. **Clocks start when we discover (or reasonably should have
discovered) the breach.**

## Who does what
| Role | Person | Backup |
|---|---|---|
| Incident lead (decides, coordinates, keeps the log) | [name] | [name] |
| Technical lead (contain, investigate, fix) | [name] | [name] |
| Privacy / legal counsel | [firm, contact] | |
| Communications (users, regulators, press) | [name] | |

Keep this table current. Store a copy outside Lanternway's own systems.

## What counts as a breach
Any unauthorized access to, or disclosure of, family information, including:
- someone outside a family seeing that family's data (e.g. a row-level security failure);
- leaked database credentials, auth secrets, or API keys (`DATABASE_URL*`, `NEON_AUTH_*`, `RESEND_API_KEY`);
- data sent to a third party without the user's authorization (e.g. an analytics or ad SDK
  added by mistake). **Under the FTC Health Breach Notification Rule this is a breach even
  without a hack.**

## First hour: contain
1. Open an incident log (time-stamped notes: what we saw, what we did, who decided).
2. Stop the leak:
   - rotate exposed secrets (Neon role passwords, `NEON_AUTH_COOKIE_SECRET`, Resend key) and
     update Vercel env vars, then redeploy;
   - revoke sessions if accounts may be compromised;
   - roll back the offending deploy in Vercel, or take the app offline if needed.
3. Preserve evidence: Vercel logs, Neon query/audit info, the deploy and commit involved.
   Don't delete anything that shows what happened.

## First 72 hours: assess
- What data, whose, how many families, which states/countries they live in.
- Was it health data? (Almost certainly yes for child records.)
- Call counsel. Decide which laws apply and the deadlines.

## Notify (counsel confirms the exact list and wording)
| Who | When (outer limit) | Rule |
|---|---|---|
| Affected users | Without unreasonable delay, **no later than 60 days** | FTC Health Breach Notification Rule; many state laws are faster (often 30–45 days) |
| FTC | Within 60 days if **500+** people; otherwise in the annual log | FTC HBNR |
| Media in a state | Within 60 days if **500+** residents of one state | FTC HBNR |
| State attorneys general | Per state law (often when 500+ or 1,000+ residents) | State breach laws |
| Vendors involved | Immediately | Contracts / DPAs |

User notices must say, in plain English: what happened, when, what information, what we're
doing, what they can do, and how to reach us.

## After
- Fix the root cause and add a test (e.g. extend `pnpm db:test-rls`) so it can't recur.
- Write a short blameless review: timeline, cause, what worked, what to change.
- Update this plan.

## Prevention already in place
- Row-level security on every family table, tested (`pnpm db:test-rls`).
- Website uses a least-privilege database role; owner credentials are only used locally for migrations.
- No ad trackers or third-party analytics (CLAUDE.md rule 1).
- Secrets only in `.env.local` (git-ignored) and Vercel env vars.
- Security headers and a Content-Security-Policy allowing only our own origin.
