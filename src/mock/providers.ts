import { addDays, dayOfWeek, eachDay } from "@/lib/dates";
import type { GoalProgress, Provider, TherapyGoal, TherapySession } from "@/lib/types";
import { CHILD_ID, DATA_START, MED_DATES, PROTOTYPE_TODAY, THERAPY_DATES } from "./calendar";
import { createRandom } from "./random";

// Fictional providers. Phone numbers use the 555-01xx range reserved for fiction.

export const providers: Provider[] = [
  {
    id: "prov-speech",
    childId: CHILD_ID,
    type: "speech",
    name: "Priya Natarajan",
    credentials: "M.S., CCC-SLP",
    practice: "Harbor Speech & Language",
    phone: "(555) 010-4471",
    email: "priya@harborspeech.example",
    schedule: "Tuesdays 4:00pm, weekly",
    startDate: THERAPY_DATES.speechStart,
  },
  {
    id: "prov-ot",
    childId: CHILD_ID,
    type: "ot",
    name: "Sam Delgado",
    credentials: "OTR/L",
    practice: "Kite Pediatric Therapy",
    phone: "(555) 010-8820",
    email: "sam@kitetherapy.example",
    schedule: "Thursdays 3:30pm, weekly",
    startDate: THERAPY_DATES.otStart,
  },
  {
    id: "prov-psychiatry",
    childId: CHILD_ID,
    type: "psychiatry",
    name: "Dr. Elena Marsh",
    credentials: "MD",
    practice: "Lakeside Children's Clinic",
    phone: "(555) 010-3300",
    email: "frontdesk@lakesidechildrens.example",
    schedule: "Every 3 months",
    startDate: "2022-08-09",
  },
  {
    id: "prov-pediatrics",
    childId: CHILD_ID,
    type: "pediatrics",
    name: "Dr. Lucia Ferreira",
    credentials: "MD",
    practice: "Maple Family Pediatrics",
    phone: "(555) 010-2215",
    schedule: "Yearly checkup in May",
    startDate: "2016-05-16",
  },
  {
    id: "prov-aba",
    childId: CHILD_ID,
    type: "aba",
    name: "Jordan Hale",
    credentials: "BCBA",
    practice: "Bright Steps ABA",
    phone: "(555) 010-6142",
    email: "jordan@brightsteps.example",
    schedule: "Mondays & Thursdays 3:30pm",
    startDate: "2019-07-08",
    endDate: THERAPY_DATES.abaEnd,
  },
];

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

const rand = createRandom(4242);

/** Monthly progress that climbs from `startPct` toward `endPct` with some wobble. */
function monthlyProgress(
  from: string,
  to: string,
  startPct: number,
  endPct: number,
  notes: (string | undefined)[] = [],
): GoalProgress[] {
  const points: GoalProgress[] = [];
  const months = Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / (30 * 864e5)));
  for (let i = 0; i <= months; i++) {
    const date = addDays(from, i * 30);
    if (date > to) break;
    const trend = startPct + ((endPct - startPct) * i) / months;
    const percent = Math.round(Math.min(100, Math.max(0, trend + rand.around(0, 6))));
    points.push(notes[i] ? { date, percent, note: notes[i] } : { date, percent });
  }
  return points;
}

const abaEnd = THERAPY_DATES.abaEnd;
const nowish = addDays(PROTOTYPE_TODAY, -5);

export const therapyGoals: TherapyGoal[] = [
  // ABA (ended June 2025)
  {
    id: "goal-aba-break",
    providerId: "prov-aba",
    title: "Ask for a break",
    description: "Use her break card, AAC, or words to ask for a break before she gets overwhelmed.",
    startDate: "2023-09-11",
    status: "met",
    progress: monthlyProgress(DATA_START, abaEnd, 62, 92, [
      "Using the card about half the time.",
      undefined,
      "Asked for a break at the dentist!",
    ]),
  },
  {
    id: "goal-aba-transitions",
    providerId: "prov-aba",
    title: "Smoother transitions",
    description: "Move from a preferred activity to the next thing with a 5-minute warning and a visual timer.",
    startDate: "2024-01-08",
    status: "ended",
    progress: monthlyProgress(DATA_START, abaEnd, 45, 70),
  },
  // Speech
  {
    id: "goal-speech-conversation",
    providerId: "prov-speech",
    title: "Back-and-forth conversation",
    description: "Keep a conversation going for 4 or more turns on a topic someone else picks.",
    startDate: THERAPY_DATES.speechStart,
    status: "active",
    progress: monthlyProgress(THERAPY_DATES.speechStart, nowish, 25, 70, [
      "Baseline: about 2 turns before switching to horses.",
    ]),
  },
  {
    id: "goal-speech-feelings",
    providerId: "prov-speech",
    title: "Naming feelings and needs",
    description: "Tell an adult how she feels and what she needs, by voice or AAC, when she's upset.",
    startDate: THERAPY_DATES.speechStart,
    status: "active",
    progress: monthlyProgress(THERAPY_DATES.speechStart, nowish, 30, 75),
  },
  {
    id: "goal-speech-figurative",
    providerId: "prov-speech",
    title: "Figures of speech",
    description: 'Explain what common sayings mean (like "it\'s raining cats and dogs").',
    startDate: "2026-01-13",
    status: "active",
    progress: monthlyProgress("2026-01-13", nowish, 20, 60),
  },
  // OT
  {
    id: "goal-ot-handwriting",
    providerId: "prov-ot",
    title: "Writing stamina",
    description: "Write 3–4 readable sentences before needing a break.",
    startDate: THERAPY_DATES.otStart,
    status: "active",
    progress: monthlyProgress(THERAPY_DATES.otStart, nowish, 20, 65),
  },
  {
    id: "goal-ot-regulation",
    providerId: "prov-ot",
    title: "Choosing a calming tool",
    description: "Pick a calming strategy from her menu on her own when her body feels \"too fast\".",
    startDate: THERAPY_DATES.otStart,
    status: "active",
    progress: monthlyProgress(THERAPY_DATES.otStart, nowish, 35, 80),
  },
  {
    id: "goal-ot-morning",
    providerId: "prov-ot",
    title: "Morning routine",
    description: "Get through the morning routine with a picture checklist and two or fewer reminders.",
    startDate: THERAPY_DATES.otStart,
    status: "met",
    progress: monthlyProgress(THERAPY_DATES.otStart, "2026-05-28", 30, 95),
  },
];

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

const sessionTemplates: Record<
  string,
  { goalId: string; summary: string; practiceAtHome?: string }[]
> = {
  "prov-aba": [
    { goalId: "goal-aba-break", summary: "Practiced using the break card during a tricky puzzle. Used it twice on her own.", practiceAtHome: "Keep the break card on the fridge and praise every use." },
    { goalId: "goal-aba-break", summary: "Role-played asking for a break at school. Maya made up her own script." },
    { goalId: "goal-aba-transitions", summary: "Worked on ending tablet time with the visual timer. One protest, then moved on." , practiceAtHome: "Use the same 5-minute timer at home before dinner." },
    { goalId: "goal-aba-transitions", summary: "Transitions went smoothly today. Tired at the end of the session." },
    { goalId: "goal-aba-break", summary: "Short session — Maya was tired after an assembly. Mostly calm play and drawing." },
  ],
  "prov-speech": [
    { goalId: "goal-speech-conversation", summary: "Played a conversation board game. Kept a 5-turn chat about weekend plans.", practiceAtHome: "At dinner, take turns asking one follow-up question." },
    { goalId: "goal-speech-conversation", summary: "Talked about a classmate's favorite movie. Needed a few prompts to stay on topic." },
    { goalId: "goal-speech-feelings", summary: "Built a feelings page in her AAC app with her own drawings.", practiceAtHome: "Point to the feelings page together at bedtime." },
    { goalId: "goal-speech-feelings", summary: "Practiced 'I feel ___ because ___' with comic strips. Great effort." },
    { goalId: "goal-speech-figurative", summary: "Drew funny pictures of idioms ('break a leg'). Explained 3 of 5." },
    { goalId: "goal-speech-figurative", summary: "Figurative language bingo. Laughed a lot at 'piece of cake'." },
  ],
  "prov-ot": [
    { goalId: "goal-ot-handwriting", summary: "Wrote 3 sentences about Biscuit using a slant board. Took one break.", practiceAtHome: "Try the pencil grip for homework." },
    { goalId: "goal-ot-handwriting", summary: "Hand-strengthening with putty, then copied a short poem." },
    { goalId: "goal-ot-regulation", summary: "Obstacle course, then practiced choosing a tool from her calm-down menu.", practiceAtHome: "Keep the calm-down menu in her backpack." },
    { goalId: "goal-ot-regulation", summary: "Talked about her 'engine speed'. She picked the weighted lap pad on her own." },
    { goalId: "goal-ot-morning", summary: "Made a new picture checklist for mornings with her drawings." },
    { goalId: "goal-ot-regulation", summary: "Swing and heavy work. Calm and chatty afterward." },
  ],
};

function weeklySessions(
  providerId: string,
  from: string,
  to: string,
  weekdays: number[],
  minutes: number,
  skipChance: number,
): TherapySession[] {
  const templates = sessionTemplates[providerId];
  const goalIds = new Set(therapyGoals.filter((g) => g.providerId === providerId).map((g) => g.id));
  const sessions: TherapySession[] = [];
  for (const date of eachDay(from, to)) {
    if (!weekdays.includes(dayOfWeek(date))) continue;
    if (rand.chance(skipChance)) continue; // sick days, holidays, cancellations
    // Only use templates for goals that had started by this date.
    const options = templates.filter((t) => {
      const goal = therapyGoals.find((g) => g.id === t.goalId);
      return goal && goalIds.has(goal.id) && goal.startDate <= date;
    });
    const t = rand.pick(options.length > 0 ? options : templates);
    sessions.push({
      id: `sess-${providerId.replace("prov-", "")}-${date}`,
      providerId,
      date,
      durationMinutes: minutes,
      goalIds: [t.goalId],
      summary: t.summary,
      practiceAtHome: rand.chance(0.5) ? t.practiceAtHome : undefined,
    });
  }
  return sessions;
}

const psychiatryVisits: TherapySession[] = [
  { date: "2024-11-18", summary: "Check-in visit. Sleep and appetite steady. No changes." },
  { date: MED_DATES.methylphenidateTo27, summary: "Shared teacher check-ins. Dr. Marsh increased methylphenidate ER to 27 mg." },
  { date: "2025-05-12", summary: "Follow-up. Teacher focus ratings up. Talked about trouble falling asleep." },
  { date: MED_DATES.guanfacineStart, summary: "Talked about evening meltdowns and long bedtimes. Dr. Marsh added guanfacine ER 1 mg." },
  { date: "2025-12-08", summary: "Sleep much better. Noted a hard stretch might come with the new seating chart." },
  { date: MED_DATES.methylphenidateTo36, summary: "Shared Jan–Feb check-ins. Dr. Marsh increased methylphenidate ER to 36 mg." },
  { date: "2026-06-01", summary: "Follow-up. Focus ratings up; lunch appetite smaller. Plan to keep tracking weight at checkups." },
  { date: "2026-09-14", summary: "Back-to-school visit. Things going well in 5th grade. No changes." },
].map((v, i) => ({
  id: `sess-psychiatry-${i + 1}`,
  providerId: "prov-psychiatry",
  date: v.date,
  durationMinutes: 30,
  goalIds: [],
  summary: v.summary,
}));

const pediatricVisits: TherapySession[] = [
  { date: "2025-05-20", summary: "Yearly checkup. Growth on track. Vaccines up to date." },
  { date: "2026-05-19", summary: "Yearly checkup. Weight and height checked; doctor will share with Dr. Marsh." },
].map((v, i) => ({
  id: `sess-pediatrics-${i + 1}`,
  providerId: "prov-pediatrics",
  date: v.date,
  durationMinutes: 30,
  goalIds: [],
  summary: v.summary,
}));

export const therapySessions: TherapySession[] = [
  ...weeklySessions("prov-aba", DATA_START, THERAPY_DATES.abaEnd, [1, 4], 60, 0.12),
  ...weeklySessions("prov-speech", THERAPY_DATES.speechStart, addDays(PROTOTYPE_TODAY, -1), [2], 45, 0.1),
  ...weeklySessions("prov-ot", THERAPY_DATES.otStart, addDays(PROTOTYPE_TODAY, -1), [4], 45, 0.1),
  ...psychiatryVisits,
  ...pediatricVisits,
].sort((a, b) => a.date.localeCompare(b.date));
