# Lanternway — Product Requirements

> *Your child's whole journey, in one place.*
> Store subtitle: **Lanternway: Autism & ADHD Log**

## 1. What it is

Lanternway is a lifelong record for families of neurodivergent kids — autistic, ADHD, or both. Parents log daily life, medications, therapies, and school (IEP/504) in one timeline that follows the child from early childhood into adulthood, then can be handed to the young adult.

Lumi, a small friendly flame who lives in the Lanternway lantern, is the in-app mascot.

## 2. Who it's for

- **Primary user:** parents and caregivers (the app is parent-facing; children are not account holders).
- **Contributors without accounts:** teachers, therapists, babysitters — they respond to secure check-in links.
- **Later:** the teen (own check-in mode, ~13+) and the young adult (receives the record at 18).

## 3. Problems we solve

1. Information is scattered across apps, notebooks, emails, portals, and memory.
2. Medication changes are hard to evaluate — parents and doctors lack a clear before/after picture that includes school observations.
3. IEP meetings are stressful; parents arrive without data and can't easily see whether agreed services are delivered.
4. Every new teacher, sitter, camp, or ER has to be told the same things about the child.
5. Multiple therapy providers each have their own goals and notes.
6. At 16–18, families face transition planning, decision-rights changes, guardianship/supported decision-making, SSI, and adult services — with no organized history.

## 4. Life stages the product supports

| Stage | Ages | Key needs |
|---|---|---|
| Early signs & early intervention | 0–3 | Milestones, evaluations, EI services, therapy sessions |
| Diagnosis & preschool | 3–5 | Diagnosis docs, first IEP, starting therapies, About Me profile |
| School years | 5–12 | IEP/504 tracking, medication adjustments, coordinating therapies, behavior patterns |
| Teen years | 13–17 | Teen input, mood/anxiety, transition planning (IEP transition by 16) |
| Adulthood | 18+ | Handoff to young adult or continued guardian access, document vault for applications |

## 5. Core features (MVP scope)

### 5.1 Child profile & "About Me"
- Child name, birthday, photo, diagnoses (free text + common tags), communication style (speaking / limited speech / AAC / nonverbal), sensory needs, triggers, calming strategies, likes, medications, emergency contacts.
- **Shareable "About Me" page**: one-page summary as a private link or PDF, for teachers, sitters, camps, ER. Link can be revoked.

### 5.2 Daily log (10-second logging)
- Quick entries: mood, sleep, appetite, behavior/meltdown (trigger, intensity 1–5, duration, what helped), wins, notes.
- Customizable per child (e.g., AAC use, focus, toileting).
- Supportive tone — logging a hard day is never framed as failure.

### 5.3 Medication timeline
- Medication, dose, schedule, start/stop dates, prescriber, reason for change, observed side effects.
- Visual timeline across years with home/school data overlaid.
- Refill countdown (later: pharmacy-stock notes).
- **Never** recommends doses or changes.

### 5.4 Therapy hub
- Providers (ABA, speech, OT, PT, feeding, counseling, psychiatry), contact info, schedule.
- Each provider's goals, session notes, progress.

### 5.5 Teacher & therapist check-ins
- Parent creates a check-in link for a specific person and child (expires, revocable, scoped to one child).
- Respondent taps a few ratings (e.g., focus, mood, behavior, participation) + optional note. ~15 seconds. No account.
- Responses flow into the child's timeline.

### 5.6 IEP / 504 tracker
- Plan dates (start, annual review, re-evaluation), team members.
- Goals with progress entries.
- Accommodations/services with a "delivered?" log.
- Meeting prep: agenda, questions, data summary.
- Communication log with the school (date, person, summary, attachments).

### 5.7 Reports
- Date-range reports for: doctor visit, IEP meeting, therapist.
- Example insight: "Since the dose change on Mar 3, teacher focus ratings averaged 3.8 (was 2.1); appetite down; sleep unchanged."
- Export as PDF. Every report carries a "record-keeping only, not medical advice" disclaimer.

### 5.8 Family sharing
- Invite co-parent, grandparent, caregiver with role-based access (view / log / admin).

## 6. Later (post-MVP)
- Multi-child support.
- Document vault (evaluations, report cards, IEP PDFs).
- Teen check-in mode and teen-visible record.
- Transition-to-adulthood toolkit (links to official resources on guardianship, supported decision-making, SSI — no legal advice).
- Handoff at 18.
- Professional dashboard for therapists/advocates.
- iOS/Android app via Expo sharing the same Supabase backend.

## 7. Lumi (mascot) in the product
- Welcome/onboarding: Lumi peeking out of the lantern.
- Celebrations: Lumi cheering for wins and milestones.
- Empty states and tips: Lumi thinking.
- Sleep log: Lumi sleeping.
- Hard days: Lumi calm and comforting — never sad or disappointed.
- Glow brightness can gently reflect the day (brighter = celebration).
- Always "Lumi from Lanternway"; never a separate product name (no "Lumi AI").

## 8. Non-negotiable principles
1. **Parent-facing.** No child accounts (avoids COPPA scope).
2. **Privacy first.** No ad trackers, no data selling, no third-party marketing pixels. Parents can export and delete everything. Treat all data as sensitive health data (FTC Health Breach Notification Rule).
3. **No medical, legal, or therapeutic advice.** Record and organize only. No diagnosis/treatment claims.
4. **Strict data isolation.** A family can only ever see its own data.
5. **Respectful language.** Support and understanding, not "fixing." Ask early users about identity-first vs person-first language. No puzzle-piece imagery.
6. **Calm UI.** Soft palette, no flashing, no clutter — many users are tired, stressed parents on a phone.

## 9. Business model (planned)
- **Free:** daily log, medication timeline, About Me profile.
- **Family plan (~$8–10/mo or $70–90/yr):** teacher/therapist check-ins, IEP tracker, reports, multiple caregivers.
- Payments via Stripe on the web.

## 10. Competitive landscape (Oct 2026)
- Guiding Growth (autism tracker, AI summaries, IEP reports; ~29 App Store ratings, ~$80–100/yr).
- MeltdownMap (new AI meltdown tracker).
- Autism Tracker Pro (older, one-time purchase).
- Joon (ADHD kids chore game, ~18k paying subs).
- Goally (routine tablet + subscription).

**Our differentiation:** lifelong timeline (early childhood → adulthood), teacher/therapist input via no-account links, medication timeline correlated with school data, shareable About Me profile, transition-to-adulthood support.

## 11. Success metrics (prototype → MVP)
- Prototype: 20–30 parents react; ≥50% say they'd use it weekly.
- MVP: 30–50 families active weekly for 4 weeks; ≥1 teacher check-in per family per week.
