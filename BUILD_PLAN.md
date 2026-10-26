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
- [x] Simple data-access functions (`getChild`, `getLogs(range)`, etc.) so swapping to the database later is easy

### 3. App shell
- [x] Mobile-first layout with bottom tab bar: Home, Log, Timeline, School, More
- [x] Desktop: sidebar navigation
- [x] Header with child name/photo and Lanternway logo

### 4. Screens
- [x] **Welcome/onboarding** — Lumi peeking from the lantern, 3 short intro cards
- [x] **Home** — today's quick-log buttons, this week's summary, upcoming (IEP review, refills), a Lumi tip
- [x] **Quick log** — mood, sleep, appetite, meltdown (trigger, intensity, duration, what helped), win, note; saves to local state
- [x] **Timeline** — scrollable lifelong timeline (diagnoses, med changes, IEP events, milestones) with zoom: week / month / year / all
- [x] **Medication timeline** — dose history chart with teacher focus ratings and sleep overlaid (Recharts)
- [x] **Therapy hub** — providers list → provider detail with goals and session notes
- [x] **School / IEP** — plan dates, goals with progress, accommodations with delivered log, school message log
- [x] **About Me** — profile view + "share" preview of the public one-pager
- [x] **Teacher check-in (public page)** — `/c/[token]`: a 15-second form for a teacher, styled simply, no app chrome
- [x] **Reports** — pick type (doctor / IEP / therapist) and date range → printable report page with insights and disclaimer

### 5. Parent & teacher sign-in (prototype, see `APP_MAP.md` §7)
- [ ] `/sign-in` with demo buttons: "Try as a parent (Dana)" / "Try as a teacher (Ms. Lindqvist)"; cookie holds the demo role
- [ ] Mock data: teacher access for Ms. Lindqvist (Maya + one more fictional student) with share settings
- [ ] Teacher shell (Students / Settings) and `/teacher` "Your students" list
- [ ] `/teacher/students/[childId]`: Check in, About (shared one-pager), Supports, My check-ins
- [ ] Parent School tab: "Teachers" section with invite dialog and per-teacher share toggles
- [ ] Header switcher for someone who is both a parent and a teacher

### 5b. More than one child (prototype)
- [x] Second fictional child (Theo, 5: newly diagnosed, speech only, no meds or IEP yet) with ~10 weeks of data
- [x] Header child switcher; current child kept in a cookie and checked against the family's own list
- [x] Every screen follows the selected child; gentle empty states for children with less data
- [x] "Add a child" intake (basics, school & plan status, interests, strengths, communication, what's hard / what helps, drafted intro); prototype keeps added kids in cookies on the device, with Remove

### 6. Polish & ship
- [ ] Lumi moments: cheering on wins, comforting on hard-day logs, sleeping on sleep log, thinking on empty states
- [ ] Respect `prefers-reduced-motion`; check color contrast (WCAG AA)
- [ ] Test at 390px and desktop widths
- [x] Deploy to Vercel; add a "Prototype — sample data" banner (dev.lanternway.co, from the `dev` branch)

## Stage 2: Working MVP (real accounts)
- [x] Neon Postgres project `lanternway` (NSoul Co org, aws-us-east-1) with `medication_catalog` (type-ahead for medication names) and a read-only `lanternway_app` role. `pnpm db:setup` runs migrations + seed.
- [x] Neon Auth: sign-in required for the app; email + password (sign up, sign in, sign out); dev.lanternway.co trusted; Google turned off
- [x] Family tables (families, family_members, children) with RLS tied to `neon_auth` users (`pnpm db:test-rls`: 10 checks); new accounts start on /start with their own empty family; Add a child, About Me edits, and Remove save to Neon; sample family available from the header menu
- [ ] Logs, medications, therapy, and school records in Neon (same RLS pattern)
- [ ] Family invites with roles (view / log / admin) and teacher access
- [ ] Replace mock data layer with Neon queries
- [ ] Custom email sender (verification codes, password reset) before real users
- [ ] File storage choice (documents, photos)
- [ ] Real check-in links (tokens, expiry, revoke) + email delivery (Resend)
- [ ] PDF export for reports and About Me
- [ ] Family invites with roles (view / log / admin)
- [ ] Teacher accounts: `school_contacts.user_id`, `teacher_access`, `invites`; teacher reads only via narrow Postgres functions (`APP_MAP.md` §6)
- [ ] `/join/[invite]` flow and post-sign-in routing (family / students / both / neither)
- [x] Data export + delete account (Account & privacy page; sessions removed with the account)
- [x] Draft privacy policy, terms, consumer health data policy; opt-in consents (recorded with versions); adult confirmation; share consent; security headers; password policy; breach plan (see COMPLIANCE.md)
- [ ] Counsel review of the drafts; fill placeholders in src/lib/policies.ts; then remove the test-data notice and checkbox
- [ ] Privacy policy + terms (plain English)

## Stage 3: Paid version
- [ ] Stripe subscriptions (free vs Family plan)
- [ ] IEP meeting prep tools
- [ ] Multi-child support for real accounts: add/edit a child, per-child sharing and teacher access (switcher already in the prototype)
- [ ] Security & privacy review before charging

## Stage 4: Mobile apps
- [ ] Expo app sharing the Neon backend
- [ ] Widgets, quick-log from lock screen, push notifications
