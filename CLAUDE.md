# Lanternway — Agent Instructions

Read `PRD.md` for the product and `BUILD_PLAN.md` for the current task list. Brand rules are in `brand/BRAND.md`.

## Stack
- **pnpm workspace monorepo:** `apps/web` is the Next.js website, `packages/shared` (`@lanternway/shared`) holds plain TypeScript shared with the future mobile app (types, `record-schemas`, `labels`, `dates`, `family-roles`), and `db/`, `scripts/`, `brand/` and the docs stay at the repo root. Run commands from the root (`pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm db:setup`, `pnpm db:test-rls`). Keep `packages/shared` free of React, Node built-ins and database code. Paths below without a prefix are in `apps/web/`.
- **Next.js** (App Router, TypeScript, `apps/web/src/`) deployed on **Vercel** (project Root Directory `apps/web`).
- **Tailwind CSS** + **shadcn/ui** components (customized to the Lanternway palette).
- **Neon** Postgres (project `lanternway`, aws-us-east-1) with **Neon Auth** (Managed Better Auth; users and sessions in the `neon_auth` schema) and Row Level Security. Sign-in is required for the app (email + password). Each account has its own family: families, members, children (About Me), and all their records (logs, milestones, medications and changes, medication reminders (settings only; not sent yet), care team, therapy goals and sessions, IEP plans, goals, supports, school messages) are saved in Neon (`records` table, validated by `packages/shared/src/record-schemas.ts`). Teacher check-ins (respondents, links stored as SHA-256 token hashes, check-ins) are saved in Neon too (migration 006); family sharing (invite links as token hashes, roles admin / log / view) is migration 008, with roles enforced by RLS and mirrored in the UI via `useAccess()` (`src/components/access.tsx`); the public `/c/[token]` page only goes through the `checkin_form_context` and `submit_checkin` database functions. A sample family (Maya and Theo) can be explored from the header menu. File storage: not chosen yet. Secrets live in `apps/web/.env.local` (git-ignored) and Vercel env vars; the website connects with the read-only `lanternway_app` role. `pnpm db:setup` runs migrations and seeds.
- **Stripe** for subscriptions (Stage 3).
- Charts: **Recharts**.
- Package manager: **pnpm**.
- Later: **Expo** (React Native) for iOS/Android in `apps/mobile`, reusing the same backend through `/api/v1` (see `MOBILE_PLAN.md`).

## How to work
- Work through `BUILD_PLAN.md` one task at a time. Check off tasks (`- [x]`) as they're completed.
- Keep changes small and runnable; the app must start with `pnpm dev` after every task.
- Run `pnpm lint` and `pnpm typecheck` (add the script if missing) before calling a task done.
- Mobile-first: design for a ~390px-wide phone first, then scale up.
- Prefer simple, readable code over clever abstractions. Co-locate components with their routes when only used once.
- Ask the user before adding paid services, new third-party SDKs, or analytics.

## Non-negotiable rules
1. **No ad trackers or marketing pixels** (no Meta Pixel, Google Ads tags, etc.). If analytics are ever added, use privacy-friendly, cookieless options and ask first.
2. **No medical, legal, or therapeutic advice** in UI copy, AI features, or reports. The app records and organizes. Never suggest doses, diagnoses, or treatments. Reports include a disclaimer: "Lanternway is a record-keeping tool and does not provide medical advice."
3. **Data isolation:** every database table holding family data must have RLS policies restricting access to members of that family. Never ship a table without RLS. Run family queries through `asUser()` (`src/lib/db.ts`), which sets `app.user_id` for the policies, and extend `pnpm db:test-rls` for every new table.
4. **Check-in links:** random unguessable tokens, scoped to one child + one respondent, with expiry and revoke. Link respondents see only the check-in form — never the child's record.
5. **Parent-owned.** No child accounts. Teachers may have free accounts, but only see children a parent connected them to, and only what the parent shared (check-in form, About Me, accommodations list). Never logs, medications, therapy, IEP progress, messages, or reports. Teachers can't create student records. Don't collect data about other students. See `APP_MAP.md`.
6. **Mock data must be fictional.** Never use real names of real children.
7. **Language:** supportive, non-judgmental, plain English. Hard days are logged without guilt. No "fixing" language, no puzzle-piece imagery.
8. **Mascot:** Lumi is always "Lumi from Lanternway". Never create a feature or product named "Lumi AI", "Lumi Plus", etc.

## Brand tokens (use as Tailwind theme colors)
| Token | Hex | Use |
|---|---|---|
| `amber` | `#F7B341` | Lumi, heart, highlights, positive progress |
| `coral` | `#F4825B` | Accents, sparkles, celebrations; missed/alert markers |
| `teal` | `#034251` | Text, outlines, primary buttons, headers, selected state |
| `cream` | `#F7E7CD` | **Tappable** fills: quick-log tiles, option cards, chips, segmented tracks, hover |
| `paper` | `#FDF3E6` | Cards and panels (`bg-card` is frosted paper, `rgb(255 249 241 / 0.82)`) |
| `white` | `#FFFFFF` | Dialogs, boxes nested inside cards, inputs (the page itself is warm white `#FFFAF4` under the wash) |
| `peach` / `butter` | `#FFD8BD` / `#FFE8A3` | Decoration only: the background wash, gradient tiles and hero cards. Never text |

**Look:** soft and warm, like a modern healthcare app: a fixed peach/butter wash behind every page (`body::before` in `globals.css`), frosted cards with a soft warm shadow, and a floating pill tab bar on phones.

**Surfaces (keep these consistent):**
- Three levels: warm page wash → frosted paper card (`bg-card ring-1 ring-border`, or the `Card` component; the shadow and blur come from `globals.css` automatically) → white boxes nested inside a card. Never nest a box in the same color as its parent.
- A stronger fill means "you can tap this": cream, or the cream gradient tile (`bg-gradient-to-b from-white/90 to-cream` + `shadow-soft`). Information containers stay paper.
- Hero cards (one per screen at most, e.g. Home's "Next up"): `bg-gradient-to-br from-butter via-peach to-[#ffc09f]`, `rounded-3xl`, `shadow-lift`, teal text, white inner box for the details.
- Shadows: `shadow-soft` (resting) and `shadow-lift` (hero, floating nav, hover). Warm-tinted; no hard dark shadows.
- One border color (`border` / `ring-border`). Selected = teal fill or teal border. Amber = highlight/progress. Coral = alert.
- Keep text at WCAG AA: body text is teal, secondary text `text-muted-foreground` (#42636b, ≥ 5:1 on white, paper, cream and the wash). Never put text in white on amber, peach or butter.

Font: a rounded, friendly sans-serif — **Nunito** (Google Fonts via `next/font`).
Corners: generous rounding (`rounded-2xl` on cards). Calm UI: no flashing animations; respect `prefers-reduced-motion`.

## Assets
Brand images are in `brand/` (raster, AI-generated). Copy needed images into `apps/web/public/brand/` for use in the app. Vector (SVG) versions will replace them later — keep image references centralized in one file (e.g., `src/lib/brand.ts`) so they're easy to swap.
