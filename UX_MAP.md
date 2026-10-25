# Lanternway — UX Map (what's built so far)

_Oct 24, 2026. Covers the Stage 1 prototype as it stands in the code. The planned teacher side is
in `APP_MAP.md`._

**Status key:** ✅ works in the prototype · 🟡 looks real but is faked (resets on reload) · ⬜ not built

## 1. The whole thing at a glance

```
                         ┌──────────────────────────────┐
                         │ /  Welcome                   │
                         │ Lumi peeking + 3 intro cards │
                         └──────────────┬───────────────┘
                     "Get started" / "Skip" (no sign-in or setup yet)
                                        ▼
┌───────────────────────────── PARENT APP SHELL ──────────────────────────────┐
│ Header: Lanternway logo · "Maya, Age 10" + avatar (taps → About Me)          │
│                                                                              │
│ Phone bottom tabs:  Home · Log · Timeline · School · More                    │
│ Desktop sidebar:    Home · Log · Timeline · Medications · Therapy · School · │
│                     About Me · Reports                                       │
│                                                                              │
│  Home ──┬─ quick-log buttons ──────────▶ Log (?kind=…)                       │
│         ├─ "See timeline" ─────────────▶ Timeline                            │
│         ├─ Coming up items ────────────▶ School / Medications / Therapy/[id] │
│         └─ Lumi tip (IEP soon) ────────▶ Reports (?type=iep)                 │
│                                                                              │
│  More (phone) ─▶ Medications · Therapy · About Me · Reports · Welcome tour   │
│  Therapy ─▶ Therapy/[provider]                                               │
│  Reports ─▶ Reports/view (printable)                                         │
│  School › Check-ins tab ─▶ "Open" a link ─▶ /c/[token]                       │
└──────────────────────────────────────────────────────────────────────────────┘

OUTSIDE THE SHELL (no app chrome)
  /c/[token]   Teacher's 15-second check-in form (active / expired / revoked states)
```

## 2. Screen by screen

### Welcome `/` ✅
- Lanternway logo, Lumi peeking from the lantern, "Hi! I'm Lumi from Lanternway."
- 3 cards with Next / Back and dots: *whole journey in one place* → *teachers can check in* → *walk into meetings prepared*.
- **Get started** or **Skip** goes straight to Home.

### Home `/home` ✅
1. Date + **"Hi Dana"** (hardcoded name).
2. **How's Maya's day?**: 6 big buttons: Mood, Sleep, Appetite, Meltdown, Win, Note → Log. Under them, "Logged today: ✓ Mood ✓ Sleep…" chips.
3. **This week**: 4 tiles: Mood avg, Sleep hrs (+ wake-ups), Teacher focus (last 2 weeks), Meltdowns (+ appetite).
4. **Coming up** (next 30 days): IEP review, refills, therapy sessions, each linking to its page.
5. **Wins this week**: up to 4 starred wins.
6. **Lumi tip** (only within 45 days of the IEP review): points to the IEP report.

### Quick log `/log` 🟡 (saves, but only until reload)
- Pick a type at the top (same 6), then one short form:

| Type | What you fill in |
|---|---|
| Mood | 1–5 rating + optional note |
| Sleep | Bedtime, woke up, hours (stepper), wake-ups (stepper), restful? (optional) |
| Appetite | "How much did they eat today?" 1–5 + note |
| Meltdown | What set it off (common chips + "something else"), how big (1–5), about how long, what helped (from Maya's calming list), note |
| Win | "What went well for Maya?" |
| Note | "What would you like to remember?" |

- After saving: a gentle confirmation ("Hard moments happen — thank you for noting it…", "Win saved! Worth celebrating.") + "log another".
- A "Today" list shows what's already logged.

### Timeline `/timeline` ✅
- Zoom: **Week · Month (default) · Year · All**. The zoom bar sticks to the top on phones.
- More detail as you zoom in: *All* = diagnoses and big events, grouped by year with Maya's age · *Year* = + med changes, school, therapy, grouped by month · *Month* = + wins, meltdowns, check-ins, notes · *Week* = + daily summaries.
- **Coming up** box for future events. Newest first.

### Medications `/medications` ✅
- One card per current med: name, purpose, dose, prescriber, start date, **refill countdown**.
- **The last two years**: 3 stacked charts sharing one timeline (dose · teacher focus · sleep), with numbered lines at each change. "See the numbers as a table" under them.
- **Changes and what was recorded around them**: each change has its reason, what was noticed, and a before/after table (focus, sleep, appetite, meltdowns). An "Earlier" list for older changes.

### Therapy `/therapy` → `/therapy/[provider]` ✅
- List: **Current** and **Past** providers, each with type and last visit date.
- Provider page: contact + schedule → **Goals** (status, progress bar) → **Session notes** (summary, "To try at home", "Show more").

### School `/school` ✅ (read-only)
- Header: school · IEP · grade. 3 tiles: Annual review (countdown), Re-evaluation due, Plan started.
- Tabs:
  - **Goals**: 4 IEP goals, progress vs. target, "Target reached" badge.
  - **Supports**: Services with a week-by-week delivered / partial / missed strip; Accommodations with notes.
  - **Check-ins**: teacher rating averages, **Check-in links** (Open · Copy · Revoke 🟡), Recent check-ins.
  - **Messages**: log of emails / calls / meetings with the school.
  - **Team**: IEP team members.

### About Me `/about-me` ✅
- Profile: name, age, intro, Communication, Things that are hard, What helps, Sensory needs, Loves, Not a fan of, Diagnoses, Medications, Emergency contacts.
- **Share a one-page About Me** → dialog: live preview + include toggles (Diagnoses / Medications / Emergency contacts) + link Copy / Turn off 🟡. The link is a placeholder.

### Reports `/reports` → `/reports/view` ✅
- Pick **What's it for?** (Doctor visit · IEP meeting · Therapist) + **Which dates?** (30 days / 3 / 6 / 12 months / Custom) → **Make report**.
- Printable page with plain-fact insights and the required disclaimer. **Print / Save as PDF** uses the browser.
  - Doctor: at a glance, med changes, this period vs. before, week-by-week charts, meltdown triggers + what helped, school contact.
  - IEP: plan, goal progress, services delivered, accommodations not fully provided, teacher check-ins.
  - Therapist: per-provider goals + home practice, communication, what's hard / what helps, recent wins.

### More `/more` (phone only) ✅
- Medications · Therapy · About Me · Reports · Welcome tour, each with a one-line description. Fictional-data note.

### Teacher check-in `/c/[token]` 🟡 (submits to a thank-you screen, nothing saved)
- No app chrome. "How was Maya's day?" + date → 4 rows of 1–5: Focus, Mood, Behavior, Participation → optional note → Send.
- "Thank you, Ms. Lindqvist!" screen.
- If the link is expired or revoked: "This link isn't active."
- Demo links: active `q7Rm2xV9pL4tT8wZcK3n`, revoked `Hn3cZ8uL5dF0gJ6wEo2s`, expired `aB4kP9sW2mQ7xR1vYt6e`.

## 3. Main journeys today

| Journey | Steps | Taps | Status |
|---|---|---|---|
| Log a mood | Home → Mood → pick 1–5 → Save | 3 | ✅ 🟡 |
| Log a meltdown | Home → Meltdown → trigger, size, length, what helped → Save | ~6 | ✅ 🟡 |
| "Did the new dose help?" | More → Medications → scroll to the change's before/after | 3 | ✅ |
| Get ready for the IEP meeting | Home Lumi tip → IEP report → Print | 3 | ✅ |
| "Were services delivered?" | School → Supports | 2 | ✅ |
| Send About Me to a new sitter | Header avatar → Share → toggles → Copy link | 4 | 🟡 |
| Teacher sends a check-in | Opens link → 4 ratings → Send | 5 | 🟡 |

## 4. Gaps: things a real parent would expect that aren't there

**No accounts or setup**
- ⬜ Sign-in, family setup, add a child. Welcome goes straight to Maya's data.
- ⬜ Settings: profile, family members, connected teachers, export, delete.

**Mostly read-only.** Quick log is the only way to add anything. There's no add or edit for:
- ⬜ Medications and dose changes, refills
- ⬜ Providers, goals, session notes
- ⬜ IEP plan, goals and progress, the services "delivered?" log, accommodations
- ⬜ School messages
- ⬜ About Me profile fields
- ⬜ Milestones on the timeline
- ⬜ **New check-in link / invite a teacher** (you can only see and revoke existing ones)
- ⬜ Editing or deleting a log entry

**Other**
- ⬜ Lumi moments (cheering, comforting, sleeping, thinking): build plan Stage 1 §6.
- ⬜ Empty states for a brand-new family (everything assumes 2 years of data).
- ⬜ "Prototype — sample data" banner.
- ⬜ Teacher side: sign-in, Your students, student page (see `APP_MAP.md`).

## 5. Things worth a second look

- **Welcome card 2** says teachers need "no account". That stays true, but once teacher accounts exist it could add "or a free teacher account".
- **School is crowded.** 5 tabs, with check-in links hidden under the 3rd. When "Invite a teacher" arrives, it may be better as its own **Teachers** tab or a School section on Home.
- **Phone "More" hides 4 of the 9 sections**, including Medications and Reports, which drive two of the main journeys. That's fine if Home links to them at the right moments (it does for the IEP report, not for meds).
- **Home has no "add" path** except logging. Once editing exists, a single "+" button (log, med change, school note, milestone) may beat separate buttons on each page.
- **Check-in thank-you screen** is a dead end. It's the natural spot for the optional "create a free teacher account" prompt.
