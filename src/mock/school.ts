import { addDays, dayOfWeek, eachDay } from "@/lib/dates";
import type {
  Accommodation,
  CheckIn,
  CheckInLink,
  CheckInRespondent,
  DeliveryLogEntry,
  IepGoal,
  IepPlan,
  SchoolMessage,
} from "@/lib/types";
import {
  CHILD_ID,
  DATA_START,
  PROTOTYPE_TODAY,
  isSchoolDay,
  periodOn,
  schoolYearOn,
} from "./calendar";
import { createRandom, toRating } from "./random";

const rand = createRandom(1717);

// ---------------------------------------------------------------------------
// Check-in respondents & links
// ---------------------------------------------------------------------------

export const respondents: CheckInRespondent[] = [
  { id: "resp-rivera", childId: CHILD_ID, name: "Ms. Rivera", role: "classroom-teacher", email: "a.rivera@maplegrove.example" },
  { id: "resp-okafor", childId: CHILD_ID, name: "Mr. Okafor", role: "classroom-teacher", email: "d.okafor@maplegrove.example" },
  { id: "resp-lindqvist", childId: CHILD_ID, name: "Ms. Lindqvist", role: "classroom-teacher", email: "k.lindqvist@maplegrove.example" },
  { id: "resp-abernathy", childId: CHILD_ID, name: "Ms. Abernathy", role: "special-ed-teacher", email: "j.abernathy@maplegrove.example" },
];

/** Token for the demo check-in page (`/c/[token]`). Saved links use random 32-byte tokens. */
export const DEMO_CHECKIN_TOKEN = "q7Rm2xV9pL4tT8wZcK3n";

export const checkInLinks: CheckInLink[] = [
  {
    id: "link-rivera",
    token: "aB4kP9sW2mQ7xR1vYt6e",
    childId: CHILD_ID,
    respondentId: "resp-rivera",
    createdAt: "2024-09-03T15:20:00Z",
    expiresAt: "2025-06-13T23:59:00Z", // expired at end of 3rd grade
  },
  {
    id: "link-okafor",
    token: "Hn3cZ8uL5dF0gJ6wEo2s",
    childId: CHILD_ID,
    respondentId: "resp-okafor",
    createdAt: "2025-08-27T14:05:00Z",
    expiresAt: "2026-06-30T23:59:00Z",
    revokedAt: "2026-06-15T18:30:00Z", // revoked after 4th grade ended
  },
  {
    id: "link-lindqvist",
    token: DEMO_CHECKIN_TOKEN,
    childId: CHILD_ID,
    respondentId: "resp-lindqvist",
    createdAt: "2026-08-26T16:10:00Z",
    expiresAt: "2027-06-11T23:59:00Z",
  },
  {
    id: "link-abernathy",
    token: "Ws8eT1yN6bV3kM9qXa5r",
    childId: CHILD_ID,
    respondentId: "resp-abernathy",
    createdAt: "2025-11-13T13:00:00Z",
    expiresAt: "2027-06-11T23:59:00Z",
  },
];

// ---------------------------------------------------------------------------
// Check-ins (weekly from the classroom teacher, every other week from the
// special-ed teacher once the current IEP started)
// ---------------------------------------------------------------------------

const teacherNotes: Record<string, string[]> = {
  "resp-rivera": [
    "Great job in reading group today!",
    "Needed a break after lunch, came back ready.",
    "Helped a friend with a drawing in art.",
    "Fire drill was tough. She used her headphones.",
    "Finished her math worksheet on her own.",
  ],
  "resp-okafor": [
    "Shared her horse comic with the class. Everyone loved it.",
    "Had a hard time settling after recess.",
    "Asked for help with words this week — great self-advocacy.",
    "Focus faded in the afternoons this week.",
    "Wrote a whole paragraph in science!",
    "Used her break card twice and came back each time.",
  ],
  "resp-lindqvist": [
    "Lovely start to 5th grade. She's settling in.",
    "Volunteered to read aloud!",
    "Worked well with her lab partner.",
    "Needed extra time on the spelling test (used her accommodation).",
    "Great focus during independent work.",
  ],
  "resp-abernathy": [
    "Reading comprehension practice went well.",
    "Used her checklist to start work without prompts.",
    "A bit tired today, but stuck with it.",
    "Answered 4 of 5 'why' questions correctly.",
  ],
};

function makeCheckIn(respondentId: string, date: string): CheckIn {
  const p = periodOn(date);
  return {
    id: `ci-${respondentId.replace("resp-", "")}-${date}`,
    childId: CHILD_ID,
    respondentId,
    date,
    ratings: {
      focus: toRating(rand.around(p.focus, 0.9)),
      mood: toRating(rand.around(p.mood, 0.9)),
      behavior: toRating(rand.around((p.focus + p.mood) / 2 + 0.2, 0.9)),
      participation: toRating(rand.around(p.focus + 0.3, 0.9)),
    },
    note: rand.chance(0.4) ? rand.pick(teacherNotes[respondentId]) : undefined,
  };
}

function generateCheckIns(): CheckIn[] {
  const out: CheckIn[] = [];
  let abernathyWeek = 0;
  for (const date of eachDay(DATA_START, addDays(PROTOTYPE_TODAY, -1))) {
    if (!isSchoolDay(date)) continue;
    const dow = dayOfWeek(date);
    const year = schoolYearOn(date);
    // Classroom teacher: Fridays, missing about 1 week in 10.
    if (dow === 5 && year && rand.chance(0.9)) out.push(makeCheckIn(year.teacherId, date));
    // Special-ed teacher: every other Wednesday under the current IEP.
    if (dow === 3 && date >= "2025-11-12" && abernathyWeek++ % 2 === 0) {
      out.push(makeCheckIn("resp-abernathy", date));
    }
  }
  return out;
}

export const checkIns: CheckIn[] = generateCheckIns();

// ---------------------------------------------------------------------------
// IEP
// ---------------------------------------------------------------------------

export const iepPlan: IepPlan = {
  id: "iep-2025",
  childId: CHILD_ID,
  type: "iep",
  school: "Maple Grove Elementary",
  grade: "4th grade (continues into 5th)",
  startDate: "2025-11-12",
  annualReviewDate: "2026-11-10",
  reevaluationDate: "2027-10-05",
  caseManager: "Joy Abernathy",
  team: [
    { name: "Dana", role: "Parent" },
    { name: "Chris", role: "Parent" },
    { name: "Joy Abernathy", role: "Special education teacher (case manager)", email: "j.abernathy@maplegrove.example" },
    { name: "Karin Lindqvist", role: "5th grade teacher", email: "k.lindqvist@maplegrove.example" },
    { name: "Rosa Kim", role: "School speech-language pathologist" },
    { name: "Marcus Webb", role: "School occupational therapist" },
    { name: "Dr. Alan Pierce", role: "School psychologist" },
    { name: "Tanya Brooks", role: "Principal" },
  ],
};

const progressDates = ["2026-01-23", "2026-04-10", "2026-06-05", "2026-10-16"];

function progress(values: number[], notes: (string | undefined)[] = []) {
  return values.map((value, i) => ({
    date: progressDates[i],
    value,
    reportedBy: "Joy Abernathy",
    ...(notes[i] ? { note: notes[i] } : {}),
  }));
}

export const iepGoals: IepGoal[] = [
  {
    id: "iepg-reading",
    planId: iepPlan.id,
    area: "Reading comprehension",
    description:
      "Given a grade-level passage, Maya will answer who, what, and why questions with 80% accuracy in 4 of 5 trials.",
    baseline: "50% accuracy",
    target: "80% accuracy",
    unit: "% accuracy",
    targetValue: 80,
    progress: progress([52, 64, 70, 74], ["Harder after winter break.", "Big jump this spring."]),
  },
  {
    id: "iepg-writing",
    planId: iepPlan.id,
    area: "Written expression",
    description:
      "Maya will write a paragraph with a topic sentence, 3 supporting details, and a closing sentence, meeting 80% of checklist items.",
    baseline: "40% of checklist items",
    target: "80% of checklist items",
    unit: "% of checklist items",
    targetValue: 80,
    progress: progress([45, 55, 62, 68]),
  },
  {
    id: "iepg-self-advocacy",
    planId: iepPlan.id,
    area: "Self-advocacy",
    description:
      "Maya will ask for a break or help, using words, AAC, or her break card, in 4 of 5 opportunities.",
    baseline: "40% of opportunities",
    target: "80% of opportunities",
    unit: "% of opportunities",
    targetValue: 80,
    progress: progress([55, 68, 76, 82], [undefined, undefined, undefined, "Goal met — keep practicing."]),
  },
  {
    id: "iepg-task-initiation",
    planId: iepPlan.id,
    area: "Starting independent work",
    description:
      "Using a visual checklist, Maya will start independent work within 2 minutes in 80% of tasks.",
    baseline: "30% of tasks",
    target: "80% of tasks",
    unit: "% of tasks",
    targetValue: 80,
    progress: progress([28, 58, 66, 72], ["Seating change in January made this harder."]),
  },
];

// Weekly delivery log for services, plus occasional notes on accommodations.
function serviceLog(missed: Record<string, string> = {}, missChance = 0.05): DeliveryLogEntry[] {
  const log: DeliveryLogEntry[] = [];
  for (const date of eachDay(iepPlan.startDate, addDays(PROTOTYPE_TODAY, -1))) {
    if (dayOfWeek(date) !== 5 || !schoolYearOn(date)) continue;
    // Skip break weeks: if no school day this week, no entry.
    const week = [0, 1, 2, 3, 4].map((d) => addDays(date, -d));
    if (!week.some(isSchoolDay)) continue;
    if (missed[date]) {
      log.push({ date, status: "missed", note: missed[date] });
    } else if (rand.chance(missChance)) {
      log.push({ date, status: "partial", note: "One session this week was cancelled (assembly)." });
    } else {
      log.push({ date, status: "delivered" });
    }
  }
  return log;
}

export const accommodations: Accommodation[] = [
  {
    id: "acc-extended-time",
    planId: iepPlan.id,
    kind: "accommodation",
    title: "Extended time",
    details: "1.5× time on tests and longer assignments.",
    deliveryLog: [
      { date: "2025-12-12", status: "delivered", note: "Used on the math unit test." },
      { date: "2026-02-27", status: "missed", note: "Timed reading quiz — extra time wasn't offered. Emailed Mr. Okafor." },
      { date: "2026-03-06", status: "delivered", note: "Mr. Okafor let Maya retake the quiz with extra time." },
      { date: "2026-09-25", status: "delivered", note: "Spelling test, per Ms. Lindqvist's check-in." },
    ],
  },
  {
    id: "acc-breaks",
    planId: iepPlan.id,
    kind: "accommodation",
    title: "Breaks on request",
    details: "Maya can use her break card or AAC to take a short break in the calm corner.",
    deliveryLog: [
      { date: "2025-12-05", status: "delivered", note: "Used twice this week, came back both times." },
      { date: "2026-04-17", status: "delivered" },
      { date: "2026-10-02", status: "delivered", note: "Calm corner set up in the new classroom." },
    ],
  },
  {
    id: "acc-seating",
    planId: iepPlan.id,
    kind: "accommodation",
    title: "Preferential seating",
    details: "Near the teacher and away from the door and hallway noise.",
    deliveryLog: [
      { date: "2026-01-09", status: "missed", note: "New seating chart put Maya next to the door." },
      { date: "2026-02-13", status: "partial", note: "Moved one row in, still near the hallway." },
      { date: "2026-02-27", status: "delivered", note: "Moved near the front after we asked at the Feb 24 meeting." },
      { date: "2026-08-28", status: "delivered", note: "Front table in 5th grade." },
    ],
  },
  {
    id: "acc-headphones",
    planId: iepPlan.id,
    kind: "accommodation",
    title: "Noise-reducing headphones",
    details: "Available in the cafeteria, assemblies, and during fire drills.",
    deliveryLog: [
      { date: "2026-01-30", status: "delivered", note: "Used during the fire drill." },
      { date: "2026-09-18", status: "delivered" },
    ],
  },
  {
    id: "acc-visual-schedule",
    planId: iepPlan.id,
    kind: "accommodation",
    title: "Visual schedule and transition warnings",
    details: "Daily picture schedule on her desk; 5-minute warning before transitions.",
    deliveryLog: [
      { date: "2025-11-21", status: "delivered" },
      { date: "2026-05-08", status: "partial", note: "Substitute teacher didn't use the schedule on Tuesday." },
    ],
  },
  {
    id: "svc-speech",
    planId: iepPlan.id,
    kind: "service",
    title: "Speech-language therapy",
    details: "Small group and 1:1 sessions with the school SLP.",
    frequency: "2 × 30 min/week",
    provider: "Rosa Kim",
    deliveryLog: serviceLog({
      "2026-01-16": "School SLP out — sessions to be made up.",
      "2026-01-23": "School SLP out — sessions to be made up.",
    }),
  },
  {
    id: "svc-ot",
    planId: iepPlan.id,
    kind: "service",
    title: "Occupational therapy",
    details: "Handwriting and sensory regulation with the school OT.",
    frequency: "1 × 30 min/week",
    provider: "Marcus Webb",
    deliveryLog: serviceLog({}, 0.08),
  },
  {
    id: "svc-reading",
    planId: iepPlan.id,
    kind: "service",
    title: "Specialized reading instruction",
    details: "Small-group reading in the resource room.",
    frequency: "4 × 45 min/week",
    provider: "Joy Abernathy",
    deliveryLog: serviceLog({}, 0.06),
  },
];

// ---------------------------------------------------------------------------
// School message log
// ---------------------------------------------------------------------------

const messages: Omit<SchoolMessage, "id" | "childId">[] = [
  { date: "2024-11-13", type: "meeting", direction: "both", person: "Joy Abernathy", role: "Case manager", subject: "Annual IEP meeting (3rd grade)", summary: "Reviewed progress. Kept speech services, added extended time on tests.", attachments: [{ name: "IEP-2024-signed.pdf" }] },
  { date: "2025-01-17", type: "email", direction: "from-school", person: "Ms. Rivera", role: "3rd grade teacher", subject: "Focus after lunch", summary: "Maya is having trouble focusing late morning and after lunch. Asked whether anything changed at home.", attachments: [] },
  { date: "2025-01-20", type: "email", direction: "to-school", person: "Ms. Rivera", role: "3rd grade teacher", subject: "Re: Focus after lunch", summary: "Thanked her and said we'd share her check-ins at Maya's doctor visit in February.", attachments: [] },
  { date: "2025-03-14", type: "note-home", direction: "from-school", person: "Ms. Rivera", role: "3rd grade teacher", subject: "Great week!", summary: "Maya finished all her reading log pages and helped set up the art station.", attachments: [] },
  { date: "2025-06-10", type: "email", direction: "to-school", person: "Joy Abernathy", role: "Case manager", subject: "Therapy changes this summer", summary: "Let the school know Maya is finishing ABA and starting private speech and OT in July.", attachments: [] },
  { date: "2025-08-27", type: "email", direction: "to-school", person: "Mr. Okafor", role: "4th grade teacher", subject: "Hello from Maya's family", summary: "Shared Maya's About Me page and the weekly check-in link.", attachments: [{ name: "About-Maya.pdf" }] },
  { date: "2025-09-19", type: "call", direction: "from-school", person: "Mr. Okafor", role: "4th grade teacher", subject: "Rough first weeks", summary: "Maya has had a few hard afternoons. Talked through what helps at home (heads-up before transitions, calm corner).", attachments: [] },
  { date: "2025-10-20", type: "portal", direction: "from-school", person: "Joy Abernathy", role: "Case manager", subject: "IEP meeting invite", summary: "Annual IEP meeting scheduled for Nov 12 at 3:15pm.", attachments: [{ name: "Meeting-notice.pdf" }] },
  { date: "2025-11-12", type: "meeting", direction: "both", person: "Joy Abernathy", role: "Case manager", subject: "Annual IEP meeting (4th grade)", summary: "New plan with 4 goals. Added school OT (30 min/week). Kept speech and reading services.", attachments: [{ name: "IEP-2025-draft.pdf" }, { name: "IEP-2025-signed.pdf" }] },
  { date: "2026-01-12", type: "email", direction: "to-school", person: "Mr. Okafor", role: "4th grade teacher", subject: "New seat by the door", summary: "Maya mentioned her new seat is next to the door. Asked about preferential seating from her IEP.", attachments: [] },
  { date: "2026-01-26", type: "email", direction: "to-school", person: "Joy Abernathy", role: "Case manager", subject: "Missed speech sessions", summary: "Asked how the missed speech sessions from Jan 12–23 will be made up.", attachments: [] },
  { date: "2026-01-28", type: "email", direction: "from-school", person: "Joy Abernathy", role: "Case manager", subject: "Re: Missed speech sessions", summary: "Make-up sessions scheduled for February (two extra sessions per week).", attachments: [] },
  { date: "2026-02-24", type: "meeting", direction: "both", person: "Mr. Okafor", role: "4th grade teacher", subject: "Check-in meeting", summary: "Talked about a hard January. Maya will move near the front. Shared her check-in trends.", attachments: [] },
  { date: "2026-02-27", type: "email", direction: "to-school", person: "Mr. Okafor", role: "4th grade teacher", subject: "Extended time on reading quiz", summary: "Asked about extended time on Friday's timed reading quiz.", attachments: [] },
  { date: "2026-04-10", type: "portal", direction: "from-school", person: "Joy Abernathy", role: "Case manager", subject: "Q3 IEP progress report", summary: "Progress on all 4 goals. Self-advocacy close to target.", attachments: [{ name: "Progress-report-Q3.pdf" }] },
  { date: "2026-06-05", type: "portal", direction: "from-school", person: "Joy Abernathy", role: "Case manager", subject: "End-of-year progress report", summary: "Steady progress. Plan continues into 5th grade until the November review.", attachments: [{ name: "Progress-report-Q4.pdf" }] },
  { date: "2026-08-26", type: "email", direction: "to-school", person: "Ms. Lindqvist", role: "5th grade teacher", subject: "Hello from Maya's family", summary: "Shared Maya's About Me page and a new check-in link.", attachments: [{ name: "About-Maya.pdf" }] },
  { date: "2026-10-09", type: "portal", direction: "from-school", person: "Joy Abernathy", role: "Case manager", subject: "Annual review scheduling", summary: "Annual IEP review proposed for Nov 10 at 3:15pm. Asked parents to confirm.", attachments: [] },
  { date: "2026-10-16", type: "portal", direction: "from-school", person: "Joy Abernathy", role: "Case manager", subject: "Q1 IEP progress report", summary: "Self-advocacy goal met. Reading and writing still growing.", attachments: [{ name: "Progress-report-2026-Q1.pdf" }] },
];

export const schoolMessages: SchoolMessage[] = messages.map((m, i) => ({
  id: `msg-${String(i + 1).padStart(2, "0")}`,
  childId: CHILD_ID,
  ...m,
}));
