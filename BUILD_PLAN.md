# Lanternway — Build Plan

## Stage 1: Clickable prototype (mock data, no backend)
Goal: something real enough to show 20–30 parents and teachers for feedback. Deploy to Vercel with a shareable link.

Sample family (fictional): **Maya**, age 10, autistic + ADHD. Diagnosed autism at 3, ADHD at 6. Uses some speech plus AAC when overwhelmed. Has ~2 years of mock data: 3 medication changes, ABA → speech + OT, an IEP with 4 goals, weekly teacher check-ins.

### 1. Project setup
- [x] Create Next.js app (App Router, TypeScript, Tailwind, ESLint, `src/`) with pnpm
- [x] Install and configure shadcn/ui
- [x] Add brand tokens to Tailwind theme and Nunito font (see `CLAUDE.md`)
- [x] Copy brand images to `public/brand/`, create `src/lib/brand.ts`
- [x] Add `typecheck` script; confirm `pnpm dev`, `pnpm lint`, `pnpm typecheck` all pass

### 2. Mock data
- [x] Define TypeScript types: Child, LogEntry, Medication, MedicationChange, Provider, TherapyGoal, CheckIn, IepPlan, IepGoal, Accommodation, SchoolMessage
- [x] Create `src/mock/` with ~2 years of realistic, fictional data for Maya
- [x] Simple data-access functions (`getChild`, `getLogs(range)`, etc.) so swapping to Supabase later is easy

### 3. App shell
- [ ] Mobile-first layout with bottom tab bar: Home, Log, Timeline, School, More
- [ ] Desktop: sidebar navigation
- [ ] Header with child name/photo and Lanternway logo

### 4. Screens
- [ ] **Welcome/onboarding** — Lumi peeking from the lantern, 3 short intro cards
- [ ] **Home** — today's quick-log buttons, this week's summary, upcoming (IEP review, refills), a Lumi tip
- [ ] **Quick log** — mood, sleep, appetite, meltdown (trigger, intensity, duration, what helped), win, note; saves to local state
- [ ] **Timeline** — scrollable lifelong timeline (diagnoses, med changes, IEP events, milestones) with zoom: week / month / year / all
- [ ] **Medication timeline** — dose history chart with teacher focus ratings and sleep overlaid (Recharts)
- [ ] **Therapy hub** — providers list → provider detail with goals and session notes
- [ ] **School / IEP** — plan dates, goals with progress, accommodations with delivered log, school message log
- [ ] **About Me** — profile view + "share" preview of the public one-pager
- [ ] **Teacher check-in (public page)** — `/c/[token]`: a 15-second form for a teacher, styled simply, no app chrome
- [ ] **Reports** — pick type (doctor / IEP / therapist) and date range → printable report page with insights and disclaimer

### 5. Polish & ship
- [ ] Lumi moments: cheering on wins, comforting on hard-day logs, sleeping on sleep log, thinking on empty states
- [ ] Respect `prefers-reduced-motion`; check color contrast (WCAG AA)
- [ ] Test at 390px and desktop widths
- [ ] Deploy to Vercel; add a "Prototype — sample data" banner

## Stage 2: Working MVP (real accounts)
- [ ] Supabase project: auth (email magic link), schema, RLS on every table
- [ ] Replace mock data layer with Supabase queries
- [ ] Real check-in links (tokens, expiry, revoke) + email delivery (Resend)
- [ ] PDF export for reports and About Me
- [ ] Family invites with roles (view / log / admin)
- [ ] Data export + delete account
- [ ] Privacy policy + terms (plain English)

## Stage 3: Paid version
- [ ] Stripe subscriptions (free vs Family plan)
- [ ] IEP meeting prep tools
- [ ] Multi-child support
- [ ] Security & privacy review before charging

## Stage 4: Mobile apps
- [ ] Expo app sharing Supabase backend
- [ ] Widgets, quick-log from lock screen, push notifications
