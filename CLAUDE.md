# Lanternway — Agent Instructions

Read `PRD.md` for the product and `BUILD_PLAN.md` for the current task list. Brand rules are in `brand/BRAND.md`.

## Stack
- **Next.js** (App Router, TypeScript, `src/` directory) deployed on **Vercel**.
- **Tailwind CSS** + **shadcn/ui** components (customized to the Lanternway palette).
- **Supabase** (Postgres, Auth, Row Level Security, Storage) — from Stage 2 onward. Stage 1 uses local mock data only.
- **Stripe** for subscriptions (Stage 3).
- Charts: **Recharts**.
- Package manager: **pnpm**.
- Later: **Expo** (React Native) for iOS/Android, reusing the Supabase backend.

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
3. **Data isolation:** every Supabase table holding family data must have RLS policies restricting access to members of that family. Never ship a table without RLS.
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
| `paper` | `#FDF3E6` | Cards and panels (`bg-card`), sidebar |
| `white` | `#FFFFFF` | Page background (`bg-background`), dialogs, boxes nested inside cards, inputs |

**Surfaces (keep these consistent):**
- Three levels: white page → paper card with a warm outline (`bg-card ring-1 ring-border`, or the `Card` component) → white boxes nested inside a card. Never nest a box in the same color as its parent.
- A stronger fill (cream) means "you can tap this". Information containers stay paper.
- One border color (`border` / `ring-border`). Selected = teal fill or teal border. Amber = highlight/progress. Coral = alert.
- Keep text at WCAG AA: body text is teal, secondary text `text-muted-foreground` (#42636b, ≥ 5:1 on white, paper, and cream).

Font: a rounded, friendly sans-serif — **Nunito** (Google Fonts via `next/font`).
Corners: generous rounding (`rounded-2xl` on cards). Calm UI: no flashing animations; respect `prefers-reduced-motion`.

## Assets
Brand images are in `brand/` (raster, AI-generated). Copy needed images into `public/brand/` for use in the app. Vector (SVG) versions will replace them later — keep image references centralized in one file (e.g., `src/lib/brand.ts`) so they're easy to swap.
