# About Me — Assessment & Plan

_Oct 24, 2026. Review of `/about-me` in the Stage 1 prototype (code + dev.lanternway.co at 390px and 1280px), and a plan for growing it into a living profile. Nothing here is built yet except where marked "exists"._

Related: `APP_MAP.md` (parent + teacher roles), `UX_MAP.md` (every screen), `PRD.md`.

---

## 1. Current state

### What's on the page (exists)

| Order (phone) | Section | Source |
|---|---|---|
| 1 | Header card: avatar initial, name, age, birthday, pronouns, intro paragraph | `Child.firstName`, `birthDate`, `pronouns`, `aboutMe` |
| 2 | "Share a one-page About Me" → **Preview & share** dialog | `share-panel.tsx` |
| 3 | Communication (style + notes) | `communicationStyle`, `communicationNotes` |
| 4 | Things that are hard | `triggers: string[]` |
| 5 | What helps | `calmingStrategies: string[]` |
| 6 | Sensory needs | `sensoryNeeds: string[]` |
| 7 | Loves | `likes: string[]` |
| 8 | Not a fan of | `dislikes: string[]` |
| 9 | Diagnoses | `diagnoses[]` (name, date, by whom) |
| 10 | Medications | **Derived live** from Medications records (name + latest dose + schedule) |
| 11 | Emergency contacts (tap to call) | `emergencyContacts[]` |

**Share dialog (exists, partly faked):** 3 switches (Diagnoses ✓, Medications ✗, Emergency contacts ✓ by default) → live preview of the one-pager (`one-pager.tsx`, first person: "Things that are hard for me", "What helps me", "Things I love") → a placeholder link with Copy and "Turn off link". The link and the on/off state aren't real. `/a/[token]` doesn't exist yet.

### How it's built

- One server component (`about-me/page.tsx`) reads `getCurrentChild()` and the medication records through `src/lib/data.ts`, then builds an `OnePagerData` object for the share dialog.
- The profile is **one wide `Child` object** with plain `string[]` lists (`src/lib/types.ts`), and the fictional data is in `src/mock/child.ts`.
- **No editing at all.** There are no write functions in the data layer. The only client state in the app is the quick-log store (`log-store.tsx`, in memory).

### Where About Me already connects to other screens (exists)

| From | Uses | How |
|---|---|---|
| Header (every page) | name, age, avatar → links to About Me | read |
| Quick log → Meltdown | `triggers` and `calmingStrategies` as the tap-to-pick options | read; logs store the **text** of what was picked |
| Mock logs | `whatHelped` picked from `calmingStrategies` | text copy |
| Reports | diagnoses (header), communication (therapist report) | read |
| About Me ← Medications | current meds and doses | **derived, not copied** (a good pattern to keep) |
| Timeline | builds itself from milestones, med changes, IEP, therapy, logs at read time | derived view (same good pattern) |

There's no connection to School accommodations, therapy "To try at home" notes, or check-ins.

### Findings

**Hierarchy and tone**
1. **Challenges come before strengths.** On a phone, "Things that are hard" is the first list (~1 screen down). "Loves" is ~2 screens down. There's no **Strengths** section at all.
2. The intro is strong: first person, personal ("Hi! I'm Maya… I love horses, drawing, and swimming"). Keep it.
3. Health info (diagnoses, meds, contacts) sits in the same grid as interests, with no sign that it's more sensitive.
4. The page is ~3 phone screens (2,485px) of equal-weight cards. Nothing is collapsed, and nothing says what matters most.

**Sharing (privacy issues, confirmed on dev.lanternway.co)**

5. **Turning off "Diagnoses" doesn't hide the diagnoses.** The intro paragraph says *"I'm autistic and have ADHD."* It's always included, so the diagnosis is shared either way. I confirmed this in the live share dialog.
6. **Defaults aren't minimal.** Diagnoses and Emergency contacts start **on**. Sharing should start from the least information.
7. **On a phone, the link controls are buried.** The dialog content is 1,686px inside a 760px box, so Copy and Turn off are ~2 screens down, below the full preview.
8. There's one link for everyone. A teacher, a sitter, and an ER doctor need different things.
9. "Not a fan of" is on the page but missing from the one-pager. That's minor, but the two can drift apart.

**Data and editing**

10. The intro hardcodes age ("I'm 10"), so it goes stale on her birthday.
11. Lists are bare strings. There's no date added, source, who added it, still-true vs. past, or sensitivity. The profile can't show history or "where this came from".
12. Logs reference calming strategies **by text**, so renaming a strategy would split its history in two.
13. **No allergies field anywhere**, which a medical or camp profile needs.
14. Single child (`getCurrentChild`), although every other data function already takes `childId`.

**Accessibility (quick check, not a full audit)**

- Good: one `h1`, then `h2`/`h3` in order. The dialog traps focus and closes with Escape. Switches have labels. Phone numbers are `tel:` links. No sideways scrolling at 390px.
- To verify: contrast of `text-teal/80` on `amber/20` (share card) and of `muted-foreground` text. Also how screen readers announce the switches ("Diagnoses, on").

---

## 2. About Me UX recommendations

### 2.1 New order (strengths first, private info last)

```
┌ Header: photo · preferred name · age · pronouns
│  Intro in first person (no diagnoses, no age in the text)
├ ⭐ My strengths            ← NEW (abilities, things I'm proud of, can do on my own, getting better at)
├ 💛 Things I love           (likes, now higher up)
├ 💬 How I communicate       (style + "how to talk with me")
├ 🌿 What helps me           (calming, routines, supports)
├ 🌀 Sensory                 (needs, seeks, avoids)
├ ⛅ Things that are hard    (incl. "Not a fan of")
├ 🏠 Daily life              ← NEW, optional (routines, eating, sleep, care, safety)
├ 🔒 Health & safety — private unless you share it
│     Diagnoses · Medications (live from Meds) · Allergies (NEW) · Emergency contacts
└ Share card (sticky "Share" button on phone)
```

- **Progressive disclosure:** on phones, each section shows its first 3 items and "Show all (6)". Health & safety starts collapsed.
- **Edit in place:** every section gets a small "Edit" button that opens just that section in a sheet (add / reword / remove / mark "not true anymore"). It saves per section, so a parent can stop any time and nothing is lost.
- **Gentle empty states:** e.g. *"What is Maya good at? Teachers and sitters connect faster when they know. Add one thing — you can come back anytime."* Lumi uses the "thinking" pose. No progress bars and no "profile 40% complete".
- **Language:** keep "Things that are hard" and "What helps me". Avoid "triggers", "deficits", and "behaviors" on screen, even though the code calls the field `triggers`.

### 2.2 Sharing

- **Pick who it's for first:** Teacher · Caregiver/sitter · Medical provider · Camp/activity · Custom. Each preset only pre-sets the switches, and the parent can change any of them.
- **Default minimum:** every preset starts with Health & safety **off**, except Medical, which turns on Diagnoses, Medications, and Allergies. Contacts are on for Caregiver and Camp.
- **Phone layout:** audience → section switches → **Share** buttons (Copy link · Print/PDF), with "See preview" as a collapsible block or a second step.
- **Diagnosis guard (cheap fix for finding 5):** if Diagnoses is off and the intro mentions a diagnosis name or tag, show a gentle note with an "Edit intro" shortcut: *"Your intro mentions autism. It'll still show. Edit the intro?"*
- Each preset gets its **own link**, with an optional expiry (none / 30 days / end of school year) and revoke. Later: "Last opened Oct 21".

---

## 3. Architecture assessment

### What already helps

- **`src/lib/data.ts` is a clean seam.** Screens never import mock data, and every function is async and takes `childId`. Swapping in Supabase won't touch the screens.
- **Derived views already exist** (Timeline, About Me medications, Reports). That's the right pattern for "reference, don't duplicate".
- **`insights.ts` writes only factual sentences** from numbers ("averaged 3.8, was 2.1"). That's the right base for future summaries.
- **Types are flat with foreign keys**, already shaped like database rows.

### What limits the vision

| Limit | Why it matters | Change (Stage 2) |
|---|---|---|
| Profile is one wide object with `string[]` lists | No history, source, sensitivity, or per-item edit | `profile_items` table (below) |
| No write path anywhere | Can't edit, accept suggestions, or audit | Data-layer write functions + server actions |
| Logs store strategy **text** | Renames break patterns | Store `profile_item_id` + a text snapshot |
| No family, user, or membership model | Roles, sharing, and teacher access all depend on it | `families`, `family_members` (see `APP_MAP.md` §6) |
| Single child | Siblings | Already `childId`-scoped. Add a child switcher + `children.family_id` |
| No allergies, no strengths, no daily life | Presets need them | New `section` values, not new tables |
| Share options = 3 booleans in client state | No presets, no real links | `share_profiles` + `share_links` |

### Proposed data model (Stage 2, Supabase; every table gets RLS = family members only)

```
profile_items          one row per thing on the About Me page
  id, child_id, section            -- strengths | likes | communication | helps | sensory | hard | daily_life | safety | allergies
  text, detail?                    -- "Five-minute heads-up before transitions"
  sensitivity                      -- general | private   (private = health/safety, off in every share by default)
  status                           -- current | past      ("not true anymore" keeps history)
  source_type?, source_id?         -- manual | therapy_session | accommodation | log_pattern  (where it came from)
  created_by, created_at, updated_at

profile_item_history   old text/status for each edit (who, when). Or a general audit_log via triggers.

profile_suggestions    rules-based, never applied automatically
  id, child_id, section, proposed_text, reason       -- "Picked as 'what helped' 6 times since Sep 1"
  source_type, source_ids[]                          -- links back to the exact log / session / accommodation
  fingerprint UNIQUE (child_id, section, normalized text)   -- no duplicates, ever
  status                                             -- pending | accepted | edited | dismissed | snoozed
  decided_by, decided_at

share_profiles         an audience version: child_id, audience, name, included sections, included/excluded item ids
share_links            token_hash (store a hash, never the raw token), share_profile_id, expires_at?, revoked_at?, created_by
share_link_views       link_id, viewed_at (coarse; no IP stored, or a hashed one)
child_stage_settings   child_id, stage (parent-chosen), enabled sections/modules
```

- **Live vs. snapshot:** links show **current** info filtered by the preset, so they're always up to date. A PDF is a **dated snapshot** ("as of Oct 24, 2026").
- **Public link route `/a/[token]`:** rendered on the server, looks up the hash, checks expiry and revoke, returns only the preset's allowed fields, `noindex` + `no-referrer` (same as `/c/[token]`). No data goes in the URL, and the browser never queries the database directly.

### Suggestions without AI (Phase 3)

Simple rules that run when a record is saved (or once a night), using data we already have:

| Rule | Source data (exists) | Suggestion |
|---|---|---|
| A strategy picked in "What helped" ≥ 4 times in 30 days but not in What helps me | `MeltdownLog.whatHelped` | "Add to What helps me?" |
| The same "Something else" trigger typed ≥ 3 times | `MeltdownLog.trigger` | "Add to Things that are hard?" |
| A therapist adds a "To try at home" note | `TherapySession.practiceAtHome` | "Add to Communication / What helps me?" |
| A therapy goal is marked **met** | `TherapyGoal.status` | "Add to My strengths?" |
| An IEP accommodation is added or changed | `Accommodation` | "Review About Me?" (links to the record, doesn't copy it) |

- **Where they show:** one "Lumi noticed" card at the top of About Me, at most 3 at a time. Each has **Add · Edit first · Not now · Dismiss**, and a "From: 6 meltdown logs" link that opens the source records.
- **No push notifications** for suggestions. A dismissed fingerprint never comes back.
- **Never auto-applied.** Suggestions about private info (meds, diagnoses) aren't generated at all.

### Stages (Phase 5)

- `child_stage_settings.stage` is **chosen by the parent** (suggested from age, never forced). It only changes which empty-state prompts, sections, and modules are shown.
- Data is never hidden or deleted because the stage changed. Past items stay with `status = past` and show on the timeline.

### Connected modules (Phase 6)

- Keep the **derived-view** pattern. The Timeline, Reports, and About Me "At school" should read from the source tables rather than copy them.
- The one shared concept to add is a **record reference** (`source_type` + `source_id`), used by profile items, suggestions, and, later, Lumi's citations.
- **IEP prep later = a report preset:** IEP goals + services delivered + check-ins + therapy goals + parent notes. That's mostly already in `reports/view`.

### Lumi foundation (Phase 7, don't build yet)

The decisions to make now so it's possible later:
1. **Every record keeps its source** (who recorded it, when, from where). Lumi can then cite records, and anything without a source isn't treated as fact.
2. **Facts and interpretations are kept apart.** `insights.ts` produces facts. Any future summary is saved as a **draft** marked "Draft from your records", with a link per sentence, and is never written into the record itself.
3. **Permission-filtered context:** Lumi only sees what the person asking could see. A teacher's Lumi, if one ever exists, sees what's shared with that teacher.
4. **Brand rule:** it stays *Lumi from Lanternway helping you prepare*. There's no product called "Lumi AI" (CLAUDE.md rule 8).
5. **Sending child health data to an AI vendor** is a new third-party processor. It needs your approval, a data agreement with no retention or training, consent, and legal review.

---

## 4. Prioritized plan

### Priority 1 — Now, in the prototype (mock data, no backend, no new dependencies)
1. Reorder the page strengths-first; group **Health & safety** and mark it private.
2. Add **My strengths** (+ optional **Daily life**, **Allergies**) to the `Child` type and Maya's mock data. Show them on the page and in the one-pager.
3. **Share dialog:** audience presets, minimal defaults, controls-first phone layout, diagnosis guard.
4. Rewrite Maya's intro without diagnoses or age. Add "Not a fan of" to the one-pager.
5. **Edit one section in place** (local state, like quick log, resets on reload).
6. Contrast check + screen-reader pass on the page and dialog.

### Priority 2 — With Stage 2 (real accounts)
- `profile_items` + history, real editing, save and resume.
- `share_profiles` / `share_links` / `/a/[token]` / PDF / expiry / revoke / views.
- Rules-based suggestions + the "Lumi noticed" card.
- Logs reference profile items by id.
- "At school" on About Me reads live from IEP accommodations.
- Multi-child switcher. Teacher view reuses the Teacher preset (`APP_MAP.md`).

### Priority 3 — Later (shapes the design now, built later)
- Parent-chosen stages and stage-specific sections (teen self-advocacy, adult transition).
- Lumi drafts: IEP prep, doctor-visit prep, progress summaries, all with citations.
- Long-term trends, teen's own voice in their About Me, handoff at 18.

---

## 5. Risks and dependencies

| Area | Risk | Mitigation / who decides |
|---|---|---|
| Over-sharing | Free text (intro, notes) can contain things a toggle can't hide | Diagnosis guard now; per-section preview; "private" sensitivity on items |
| Share links | Guessable or leaked links, forwarded links | 128-bit random tokens stored hashed, expiry, revoke, view log, minimal presets, no data in URLs |
| Data model | Retrofitting history and sources later is painful | Build `profile_items` with `source` + `status` from day one of Stage 2 |
| Suggestion fatigue | Parents ignore a noisy feed | Max 3 visible, no push, dedupe by fingerprint, permanent dismiss |
| AI | Made-up facts, implied causes, advice | Facts/drafts split, citations, never writes records, no advice (rule 2), vendor review |
| Teacher access | Teachers seeing more than intended | Teacher view = Teacher preset, served by narrow server functions (`APP_MAP.md` §6) |

### Needs qualified legal and security review (flagged, not answered here)
- **FTC Health Breach Notification Rule:** likely applies to a consumer health record app like this (the PRD already says so). It shapes breach response and any third-party sharing.
- **HIPAA:** usually doesn't apply to a direct-to-parent app, but could if Lanternway contracts with providers or health plans (for example, provider portals). Get a ruling before any provider integration.
- **COPPA:** today children aren't users. The planned **teen check-in mode**, or any child-facing screen, changes that analysis (for under-13s especially).
- **FERPA and state student-privacy laws** (e.g. California SOPIPA): parent-held records generally aren't education records, but **teacher accounts** and any school or district partnership could change that.
- **State consumer health data laws** (e.g. Washington My Health My Data Act, Nevada, Connecticut) and **CCPA/CPRA:** these may require specific consent, privacy notices, and deletion rights for health data, regardless of HIPAA.
- **Security review before real data:** encryption at rest for Storage files, RLS tests for every table, audit log, full export and delete, backups and retention.

---

## 6. Recommended first implementation

The smallest set that makes a visible difference for parents, touching only `about-me/`, `types.ts`, `mock/child.ts`, and the existing UI components:

1. **Strengths first:** add `strengths: string[]` and reorder the page (Strengths → Loves → Communication → What helps → Sensory → Hard). Health & safety goes in its own collapsed "Private" group.
2. **Safer sharing:** audience presets (Teacher / Caregiver / Medical / Camp) that set the switches, defaults with every private section off, a controls-first dialog on phones, and the diagnosis-in-intro note.
3. **Data fixes:** Maya's intro without diagnoses or age, and "Not a fan of" in the one-pager.

**Not in this pass:** in-place editing (#5 in Priority 1). It's the next step, and it needs a profile store like `log-store`, so it's better as its own change. Also out: anything needing a backend (real links, PDF, suggestions, history).

**Done means:** `pnpm lint`, `pnpm typecheck`, and `pnpm build` pass; checked at 390px and 1280px; turning off Diagnoses leaves no diagnosis anywhere in the preview, or shows the note.

### Status (Oct 24, 2026): first implementation done, on dev.lanternway.co
- Page order: intro → My strengths → Loves (+ Not a fan of) → Communication → What helps → Sensory needs → Things that are hard → Daily life → **Health & safety** (private; collapsed on phones, open on desktop).
- Sharing: `about-me/share.ts` builds the shared version from only the switched-on sections. The diagnosis part of the intro lives in its own field (`Child.aboutMeHealth`) and is added only when Diagnoses is on. There's no keyword filtering.
- Presets: Teacher / Caregiver / Medical / Camp. Every private section starts off in every preset, including Medical.
- Controls come before the preview in the dialog. The link is still a labeled prototype placeholder.
- Also, at the user's request: cards, panels, and dialogs are white across the whole app (`--card`/`--popover` = white). Cream is kept for small accents.
- Still to do from Priority 1: edit one section in place (#5) and a full contrast + screen-reader pass (#6).
