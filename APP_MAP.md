# Lanternway — App Map (parents + teachers)

_Drafted Oct 24, 2026. Adds teacher sign-in alongside parent sign-in._

## 1. The idea in one paragraph

Each family owns its child's record. **Parents** sign in to see and manage everything.
**Teachers** can sign in too, with a free account, but they only see children a parent has
connected them to, and only the parts the parent chose to share. A teacher can never open the
full record. The no-account check-in link (`/c/[token]`) stays, so a teacher who doesn't want
an account can keep using the 15-second form.

## 2. Who signs in

| Role | Account? | Pays? | How they get in | What they see |
|---|---|---|---|---|
| **Parent (admin)** | Yes | Family plan (Stage 3) | Signs up, creates a family + child | Everything |
| **Family member** (co-parent, grandparent, sitter) | Yes | No, covered by the family | Invited by a parent; role = view / log / admin | Depends on role |
| **Teacher** (teacher, special-ed teacher, aide) | Yes, optional | Never | Invited by a parent, per child | Check-in form, plus About Me and supports if the parent shares them, plus their own past check-ins |
| **Check-in link respondent** | No | Never | Link from a parent | The check-in form only |

**One account per person, not per role.** A teacher who is also a parent uses one email.
After signing in they see a small switcher: "Your family" / "Your students". The role comes from
what the account is connected to, not from a button on the sign-in page.

## 3. Sign-in and onboarding

Sign-in uses an email magic link (already planned for Stage 2). There are no passwords.

```
/sign-in ──▶ "Check your email" ──▶ /auth/callback ──▶ where do they go?
                                                    ├─ has a family only    → /home
                                                    ├─ has students only    → /teacher
                                                    ├─ has both             → last used (switcher in header)
                                                    └─ has neither          → /welcome/setup (parent onboarding)
```

**Parent onboarding:** welcome cards → sign in → name the family → add the child (name, birthday,
communication style; the rest can wait) → land on Home with a Lumi tip.

**Teacher onboarding (always starts from a parent):**
1. Parent: School → Teachers → **Invite a teacher** (name, role, email, child).
2. Teacher gets an email: "Dana invited you to share quick check-ins about Maya."
   The email holds a check-in link and an optional "Create a free teacher account" button.
3. Either path works:
   - **No account:** tap the link → `/c/[token]` → done. Same as today.
   - **Account:** `/join/[invite]` → sign in with the invited email → Maya appears under "Your students".
4. On the check-in thank-you screen, a teacher without an account sees one soft prompt:
   "Check in on all your Lanternway students from one place. Free for teachers."

Teachers can't add students themselves. A student shows up only when that child's parent invites them.
This keeps us from collecting data about other students.

## 4. Site map

```
PUBLIC (no sign-in)
/                       Welcome: Lumi + 3 intro cards (exists)
/sign-in                Email magic link, one page for everyone
/sign-in/check-email
/auth/callback          Routes the person by what they're connected to (see §3)
/join/[invite]          Accept an invite (family member or teacher)
/c/[token]              No-account check-in form (exists)
/a/[token]              Shared About Me one-pager (placeholder today)
/privacy, /terms

PARENT APP  (route group: (app), today's shell)
/home                   Quick log, week summary, coming up, Lumi tip (exists)
/log                    Quick log (exists)
/timeline               Lifelong timeline (exists)
/medications            Med timeline + charts (exists)
/therapy, /therapy/[id] Providers, goals, sessions (exists)
/school                 IEP + tabs (exists). Changes:
                          Check-ins tab → "Teachers" tab: connected teachers, invite,
                          what each one can see, pause / remove, links, recent check-ins
/about-me               Profile + share (exists)
/reports, /reports/view Reports (exists)
/more                   Phone menu (exists) + Settings
/settings               NEW: your profile, family members + roles, connected teachers,
                          export my data, delete account, plan & billing (Stage 3)
/welcome/setup          NEW: first-run family + child setup

TEACHER APP  (NEW route group: (teacher), its own simpler shell)
/teacher                     Your students: one card per child, "Check in" button,
                               "Checked in today ✓" when done
/teacher/students/[childId]  One student, tabs:
                               Check in    – same form as /c/[token]
                               About       – the parent's About Me one-pager, if shared
                               Supports    – accommodations list, read-only, if shared
                               My check-ins – only this teacher's own past entries
/teacher/settings            Name, school, email, weekly reminder on/off,
                               "Stop getting check-ins for a student"
```

**Teacher navigation.** Phone: bottom tabs **Students** and **Settings**. Desktop: same two items
in a slim sidebar. No Log, Timeline, Medications, Therapy, or Reports, and no way to reach them.

## 5. Who can see what

✓ = yes, ✎ = can add/edit, — = never, "shared" = only if the parent turns it on for that teacher.

| Area | Parent (admin) | Family: log | Family: view | Teacher account | Check-in link |
|---|---|---|---|---|---|
| Daily logs | ✎ | ✎ | ✓ | — | — |
| Timeline | ✓ | ✓ | ✓ | — | — |
| Medications | ✎ | ✓ | ✓ | — | — |
| Therapy hub | ✎ | ✓ | ✓ | — | — |
| IEP goals & progress | ✎ | ✓ | ✓ | — | — |
| Accommodations list | ✎ | ✓ | ✓ | shared (read-only) | — |
| School messages | ✎ | ✓ | ✓ | — | — |
| About Me | ✎ | ✓ | ✓ | shared (parent's include toggles apply) | — |
| Check-ins | ✓ all | ✓ all | ✓ all | ✎ own only | ✎ submit only |
| Reports | ✓ | ✓ | ✓ | — | — |
| Family members & teachers | ✎ | — | — | — | — |
| Billing, export, delete | ✎ | — | — | — | — |

Defaults when a parent invites a teacher: **check-ins on, About Me on (diagnoses, medications and
emergency contacts off), supports off.** The parent can change these any time, and removing a teacher
takes effect right away.

## 6. Data changes (Stage 2, Supabase)

New or changed tables. Every one gets RLS (CLAUDE.md rule 3).

| Table | Key columns | Who can read |
|---|---|---|
| `profiles` | `user_id`, `display_name` | Self |
| `families` | `id`, `name` | Family members |
| `family_members` | `family_id`, `user_id`, `role` (admin / log / view) | Family members |
| `children` | `family_id`, …today's `Child` fields | Family members |
| `school_contacts` | today's `CheckInRespondent` + `user_id` (null until they sign in), `invite_email` | Family members; the teacher can see their own row |
| `teacher_access` | `child_id`, `school_contact_id`, `share_about_me`, `share_supports`, `about_me_options`, `granted_by`, `revoked_at` | Family members; the teacher can see their own rows |
| `invites` | `token`, `kind` (family / teacher), `email`, `expires_at`, `accepted_at` | Family admins |
| `check_in_links` | as today | Family members |
| `check_ins` | as today + `submitted_via` (link / account), `submitted_by` (user id, nullable) | Family members; the teacher sees only rows they submitted |

**Teachers never query the family tables directly.** RLS filters rows, not columns, and a `children`
row holds diagnoses and emergency contacts. So the family tables stay family-only, and teachers get
data through a few narrow Postgres functions that return only what's shared:

- `teacher_students()`: child first name, photo, last check-in date, for active `teacher_access` rows.
- `teacher_student_about(child_id)`: About Me fields, honoring the parent's toggles.
- `teacher_student_supports(child_id)`: accommodation title + details only (no delivery log).
- `submit_check_in(child_id, ratings, note)`: checks access is active, writes the row.

The no-account link keeps working the same way, through a server route that checks the token.

## 7. Prototype first (Stage 1, mock data)

Before real auth, we can show the teacher side to the parents and teachers giving feedback:

- `/sign-in` with two demo buttons: **"Try as a parent (Dana)"** and **"Try as a teacher (Ms. Lindqvist)"**.
  A cookie holds the demo role. No real accounts.
- Teacher shell + `/teacher` + `/teacher/students/[childId]` on mock data.
- Ms. Lindqvist sees Maya and one more fictional student (e.g. "Theo", 8), so the list feels real.
- Parent School tab: "Teachers" section with a mock invite dialog and share toggles.

## 8. Decisions for you

1. **Can teachers mark services as delivered?** That would make the IEP "delivered?" log far more
   accurate, but some teachers may not want to write it. My suggestion: not at first. Add it later
   as a per-teacher share setting the parent turns on.
2. **Therapists and sitters:** should they get the same kind of account later? The tables above
   allow it (`school_contacts.role` already includes therapist and sitter). My suggestion: teachers
   first, then the same thing for therapists.
3. **Can teachers and parents message each other?** Not in this map. Check-in notes go from teacher
   to parent only. Two-way messages are a bigger feature (notifications, moderation, school policy).
4. **School policy.** Some districts restrict teachers from using apps the district hasn't approved.
   That's one reason to keep the no-account link. Before launching teacher accounts, get the privacy
   review (already in Stage 3) to look at this.
