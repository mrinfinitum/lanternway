# Lanternway — Handoff for the next chat

_Last updated: Oct 24, 2026. Written at the end of the first build chat._

## Prompt to start a new chat

> Read `CLAUDE.md`, `PRD.md`, `BUILD_PLAN.md`, and `HANDOFF.md`. Stage 1 sections 1–4 are done.
> Also read `APP_MAP.md` (parent + teacher sign-in). Start Stage 1, section 5 (Parent & teacher sign-in prototype). Check off tasks as you finish them and stop after section 5 so I can review.

## Where things stand

| Stage 1 section | Status |
|---|---|
| 1. Project setup | Done, committed (`2e3fdee`) and pushed to `origin/main` |
| 2. Mock data | Done, committed (`2e3fdee`) and pushed |
| 3. App shell | Done, **not committed yet** |
| 4. Screens (all 10) | Done, **not committed yet** |
| 5. Polish & ship | Not started |

- Repo: https://github.com/mrinfinitum/lanternway (`origin`, branch `main`).
- Sections 3–4 are sitting in the working tree. The user hasn't approved a commit yet. Ask before committing or pushing.
- `pnpm lint`, `pnpm typecheck`, and `pnpm build` all passed at the end of section 4.
- The user reviews after each section. Stop there and summarize in plain language.

## What the user asked for, in order

1. Read the docs and do Stage 1 sections 1–2, then stop for review.
2. Mid-task: "we are running next.js - git - vercel" → git was initialized. Then they gave the GitHub URL → added as `origin`.
3. "need transparent logo" → brand crops got transparent backgrounds.
4. "push to git" → first commit pushed.
5. "build the UI" → sections 3 and 4 built.
6. "write the chat and pickup to a md file" → this file.

## What's built

### Routes
| Route | What it is |
|---|---|
| `/` | Welcome: Lumi peeking + 3 intro cards → `/home` (no app chrome) |
| `/home` | Quick-log buttons, this week's stats, coming up (therapy, refills, IEP review), wins, Lumi tip |
| `/log?kind=mood\|sleep\|appetite\|meltdown\|win\|note` | Quick log. Saves to in-memory state (see below) |
| `/timeline` | Zoom levels week / month / year / all. Newest first. "Coming up" box for future events |
| `/medications` | Med cards with refill countdown. 3 stacked charts (dose, teacher focus, sleep). Before/after table per change |
| `/therapy`, `/therapy/[providerId]` | Providers (current/past) → goals with progress + session notes |
| `/school` | IEP stats + tabs: Goals, Supports (services week-strip + accommodations), Check-ins (links + recent), Messages, Team |
| `/about-me` | Profile + "Preview & share" dialog with the one-pager and include toggles |
| `/reports` → `/reports/view?type=doctor\|iep\|therapist&from=&to=` | Picker → printable report with insights + disclaimer |
| `/more` | Phone-only menu for Medications, Therapy, About Me, Reports, Welcome tour |
| `/c/[token]` | Public teacher check-in form. Outside the app shell. `noindex`, `no-referrer` |

Demo check-in link: `/c/q7Rm2xV9pL4tT8wZcK3n` (Ms. Lindqvist, active). Revoked: `Hn3cZ8uL5dF0gJ6wEo2s`. Expired: `aB4kP9sW2mQ7xR1vYt6e`.

### Key files
- `src/lib/types.ts`: all data types.
- `src/lib/data.ts`: **the only data access screens use.** Async functions filtered by child/plan/provider id, so each can become a Supabase query in Stage 2. Screens never import `@/mock` directly.
- `src/lib/insights.ts`: averages, weekly series, `compareAround` (before/after a date), `describeComparison` (factual sentence), `rollingAverage` (bridges gaps ≤2 weeks), refill dates.
- `src/lib/format.ts`: date formatting (always UTC), relative days, times. `src/lib/dates.ts` holds date math on `YYYY-MM-DD` strings.
- `src/lib/labels.ts`: UI wording (gentle rating labels, check-in questions, provider types…).
- `src/lib/brand.ts`: all brand image paths + `brandColors`. Swap in SVGs here later.
- `src/lib/log-icons.ts`: icon per log kind.
- `src/mock/`: fictional data for Maya. `calendar.ts` pins `PROTOTYPE_TODAY = 2026-10-21` and defines school years, med change dates, and `periodOn()`, which shapes the generated story. Data is generated from fixed seeds (`random.ts`), so it's identical every load.
- `src/app/(app)/layout.tsx`: shell (sidebar, header, bottom nav, `LogProvider`). Shell pieces live in `src/app/(app)/_components/`.
- `src/components/`: shared bits (`page-header`, `stat`, `lumi-tip` + `EmptyState`, `disclaimer` with the required `DISCLAIMER` text, `charts/trend-charts`). `src/components/ui/` holds shadcn components.

### The mock data story (what the charts should show)
- Maya, 10, autistic + ADHD, speaking + AAC. Parents Dana (logs as "Dana") and Chris.
- Methylphenidate ER: 18 mg (Aug 2023) → 27 mg (Feb 10, 2025) → 36 mg (Mar 3, 2026). Guanfacine ER 1 mg added Sep 15, 2025.
- After Mar 3, 2026: teacher focus ~1.8 → ~3.7, lunch appetite down. After guanfacine: sleep ~8.75 → ~9.4 hrs.
- ABA ended Jun 27, 2025 → speech (Priya, Tue) + OT (Sam, Thu) from July 2025.
- IEP (Maple Grove Elementary): started Nov 12, 2025. Annual review **Nov 10, 2026**. 4 goals. In Jan 2026 her IEP seat ended up by the door and two speech sessions were missed.

## Decisions made (and why)

- **Medication chart is stacked small charts, not overlaid.** The build plan says "overlaid", but two y-scales on one chart suggest correlations that aren't there. The charts share one timeline and hover (`syncId`). Numbered coral lines mark med changes. There's a table view under "See the numbers as a table".
- **Teacher focus is a 4-week rolling average** on charts (weekly single ratings were too jumpy). Gaps of 1–2 missed weeks are bridged. School breaks stay as gaps.
- **Calm UI:** chart animations are off. Global `prefers-reduced-motion` rule in `globals.css`. Light theme only.
- **Wording:** "Meltdown" is the log label. Confirmation copy after logging one is supportive. Low ratings read "Hard" / "Very hard", never "bad". Insights only state recorded numbers; there's no advice anywhere.
- **Radius:** `--radius: 0.75rem`. Cards use `rounded-2xl` (edited in `src/components/ui/card.tsx`).
- **Brand images:** cropped from `brand/brand-sheet-final.webp` and backgrounds made transparent (Python/Pillow, outside the repo). Originals are copied in `public/brand/*.webp` too. Favicon is `src/app/icon.png` (Lumi head).
- Did **not** add any analytics, trackers, or paid services. Recharts is the only new runtime dependency besides shadcn's own (`radix-ui`, `cn`, `lucide-react`, `class-variance-authority`, `tw-animate-css`).

## Prototype-only behavior (fake for now, real in Stage 2)
- Quick-log entries live in React context (`src/app/(app)/_components/log-store.tsx`) and are lost on reload.
- Check-in form submissions aren't saved, just a thank-you screen.
- "Revoke" on check-in links and "Turn off link" in About Me only change local state.
- About Me share link is a placeholder (`lanternway.co/a/…`). No PDF export yet; reports use the browser's print / Save as PDF.
- "Hi Dana" and the logged-by name are hardcoded.

## Gotchas

- **Next.js 16.4 with `cacheComponents` + `partialPrefetching` on.** Read `node_modules/next/dist/docs/` before using unfamiliar APIs (see `AGENTS.md`).
  - Anything reading `params` or `searchParams` must sit inside `<Suspense>` (see `/c/[token]`, `/reports/view`, `/therapy/[providerId]`). Client components using `useSearchParams` too (`/log`, `/reports`).
  - `/therapy/[providerId]` uses `generateStaticParams`.
  - The dev overlay's "Insight" badge flags these; fix them, don't ignore them.
- Screens use `getToday()` (pinned date), never `new Date()`. The quick-log time stamp is the one exception, using the real clock.
- After replacing an image in `public/`, clear `.next/cache/images` or the old one keeps being served.
- **zsh:** don't name a shell variable `path`, because it overwrites `PATH`.
- pnpm was installed globally with `npm install -g --allow-scripts=pnpm pnpm` (without the flag the binary is broken).
- Headless Chrome screenshots: Chrome has a ~500px minimum window width, and charts don't render inside iframes. Use the DevTools-protocol approach (set `Emulation.setDeviceMetricsOverride` to 390 wide). The helper scripts were in `/tmp/lw-tools/` and may be gone; they're easy to recreate.

## How to verify
```bash
pnpm dev          # last session ran it on port 3123: pnpm dev --port 3123
pnpm lint
pnpm typecheck    # next typegen && tsc --noEmit
pnpm build        # catches Suspense/cacheComponents problems dev mode misses
```
Check at 390px wide and at desktop (~1280px).

## Next up: Stage 1, section 5 (Polish & ship)
- [ ] **Lumi moments:** cheering on wins, comforting on hard-day logs (calm, never sad), sleeping on sleep log, thinking on empty states. Only one Lumi pose image per mood exists so far (full, head, peeking). Other moods may need new art; ask the user before inventing Lumi variations (brand rule: don't restyle Lumi's shape).
- [ ] **Accessibility:** reduced motion is already handled globally, so verify it. Run a real WCAG AA contrast check: `--muted-foreground #42636b` on cream/paper was hand-calculated at ~5.3:1. Check amber-on-cream chips and badge text too.
- [ ] **Test at 390px and desktop** for every route, including dialogs and the printed report.
- [ ] **Deploy to Vercel** and add a "Prototype — sample data" banner. The sidebar and More page already carry a small fictional-data note. Vercel setup needs the user (account, import repo). Ask before connecting anything.
- Also pending: get approval to commit and push sections 3–4.
