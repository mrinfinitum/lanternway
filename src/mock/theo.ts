import { addDays, dayOfWeek, eachDay } from "@/lib/dates";
import type { Child, LogEntry, Milestone, Provider, TherapyGoal, TherapySession } from "@/lib/types";
import { CO_PARENT_NAME, PARENT_NAME, PROTOTYPE_TODAY } from "./calendar";
import { createRandom, toRating } from "./random";

// A second fictional child, so the prototype shows a family with more than one kid.
// Theo is earlier in his journey: newly diagnosed, just started kindergarten,
// speech therapy only, no medications and no IEP yet (evaluation in progress).
// Any resemblance to a real child is coincidental.

export const THEO_ID = "child-theo";

/** Theo's records start when the family began using Lanternway for him. */
const THEO_START = addDays(PROTOTYPE_TODAY, -70);

export const theo: Child = {
  id: THEO_ID,
  firstName: "Theo",
  birthDate: "2021-03-02",
  pronouns: "he/him",
  diagnoses: [
    {
      name: "Autism",
      tag: "autism",
      diagnosedOn: "2025-11-04",
      diagnosedBy: "Dr. Helen Park, developmental pediatrician",
    },
  ],
  communicationStyle: "limited-speech",
  communicationNotes:
    "Theo uses single words and short phrases, plus picture cards for bigger needs. He leads you by the hand to show you what he wants. Use short sentences and show him a picture of what's next.",
  sensoryNeeds: ["Loves to spin and swing", "Covers his ears for hand dryers", "Prefers soft, stretchy pants"],
  triggers: ["Hand dryers and vacuums", "Waiting without something to hold", "Stopping a favorite video"],
  calmingStrategies: ["Swinging", "Squishy toy in his pocket", "First-then picture card", "Singing his train song"],
  likes: ["Trains (especially the blue one)", "Bubbles", "Swinging at the park", "Pancakes", "Big sister Maya"],
  dislikes: ["Loud hand dryers", "Socks with seams"],
  strengths: [
    "Knows every train on the shelf by color and number",
    "Puts together 24-piece puzzles on his own",
    "Very affectionate; loves hugs from people he knows",
    "Getting better at using picture cards to ask for snack",
  ],
  dailyLife: [
    "Bedtime is 7:45, with the same two train books",
    "Eats best when foods don't touch",
    "Needs help with buttons and zippers",
    "Holds a hand in parking lots; may run toward trains",
  ],
  allergies: [],
  school: { name: "Maple Grove Elementary", grade: "Kindergarten", planStatus: "evaluating" },
  emergencyContacts: [
    { name: "Dana (Mom)", relationship: "Parent", phone: "(555) 014-2231" },
    { name: "Chris (Dad)", relationship: "Parent", phone: "(555) 014-2298" },
  ],
  aboutMe:
    "I'm Theo! I love trains, bubbles, and swinging really high. I talk with a few words and my picture cards. Loud machines like hand dryers hurt my ears. Showing me a picture of what's next helps me get ready.",
  aboutMeHealth: "I'm autistic.",
};

export const theoMilestones: Milestone[] = [
  { id: "theo-ms-01", childId: THEO_ID, date: "2021-03-02", category: "life", title: "Theo was born" },
  {
    id: "theo-ms-02",
    childId: THEO_ID,
    date: "2024-06-12",
    category: "development",
    title: "Speech evaluation",
    description: "Pediatrician suggested an evaluation at the 3-year checkup.",
  },
  { id: "theo-ms-03", childId: THEO_ID, date: "2025-11-04", category: "diagnosis", title: "Autism diagnosis", description: "Evaluation with Dr. Helen Park." },
  { id: "theo-ms-04", childId: THEO_ID, date: "2026-01-12", category: "therapy", title: "Started speech therapy" },
  {
    id: "theo-ms-05",
    childId: THEO_ID,
    date: "2026-08-24",
    category: "school",
    title: "Started kindergarten",
    description: "Maple Grove Elementary. School evaluation for an IEP is in progress.",
  },
];

export const theoProviders: Provider[] = [
  {
    id: "prov-theo-speech",
    childId: THEO_ID,
    type: "speech",
    name: "Morgan Reyes",
    credentials: "M.A., CCC-SLP",
    practice: "Harbor Speech & Language",
    phone: "(555) 010-4472",
    email: "morgan@harborspeech.example",
    schedule: "Mondays 3:30pm, weekly",
    startDate: "2026-01-12",
  },
];

export const theoTherapyGoals: TherapyGoal[] = [
  {
    id: "goal-theo-requests",
    providerId: "prov-theo-speech",
    title: "Ask for things with words or pictures",
    description: "Theo will ask for a wanted item using a word or picture card in 4 of 5 chances.",
    startDate: "2026-01-12",
    status: "active",
    progress: [
      { date: "2026-03-02", percent: 20 },
      { date: "2026-05-04", percent: 35 },
      { date: "2026-07-06", percent: 45 },
      { date: "2026-09-07", percent: 55, note: "Using 'more' and 'all done' on his own." },
    ],
  },
  {
    id: "goal-theo-turns",
    providerId: "prov-theo-speech",
    title: "Take turns in play",
    description: "Theo will take 3 back-and-forth turns in a simple game with an adult.",
    startDate: "2026-04-06",
    status: "active",
    progress: [
      { date: "2026-06-01", percent: 25 },
      { date: "2026-09-07", percent: 40 },
    ],
  },
];

const sessionNotes: { goalId: string; summary: string; practiceAtHome?: string }[] = [
  { goalId: "goal-theo-requests", summary: "Bubbles game. Said 'more' 6 times with a little help.", practiceAtHome: "Pause before giving bubbles so he can ask." },
  { goalId: "goal-theo-turns", summary: "Rolled a train back and forth. Two turns before wandering off." },
  { goalId: "goal-theo-requests", summary: "Used the snack picture card twice on his own." },
  { goalId: "goal-theo-turns", summary: "Took three turns stacking blocks. Lots of smiles." },
];

export const theoTherapySessions: TherapySession[] = eachDay("2026-08-03", addDays(PROTOTYPE_TODAY, -1))
  .filter((d) => dayOfWeek(d) === 1)
  .map((date, i) => {
    const note = sessionNotes[i % sessionNotes.length];
    return { id: `sess-theo-${date}`, providerId: "prov-theo-speech", date, durationMinutes: 45, goalIds: [note.goalId], ...note };
  });

// About 10 weeks of daily logs, generated from a fixed seed.
const rand = createRandom(20210302);
const pad = (n: number) => String(n).padStart(2, "0");
const at = (h: number, m: number) => `${pad(h)}:${pad(m)}`;

const wins = [
  "Said 'more' at dinner without a prompt",
  "Let us brush his teeth the whole two minutes",
  "Waved bye to his teacher",
  "Used his snack picture card at school",
  "Played trains next to a classmate",
  "Tried a bite of banana",
  "Walked through the grocery store holding the cart",
];
const notes = ["Grandma Ruth visited.", "Rainy day, lots of trains.", "Haircut went okay with the train video."];

function generateTheoLogs(): LogEntry[] {
  const logs: LogEntry[] = [];
  for (const date of eachDay(THEO_START, PROTOTYPE_TODAY)) {
    const weekend = [0, 6].includes(dayOfWeek(date));
    let n = 0;
    const base = () => ({
      id: `theo-log-${date}-${++n}`,
      childId: THEO_ID,
      date,
      loggedBy: rand.chance(0.4) ? CO_PARENT_NAME : PARENT_NAME,
    });

    if (rand.chance(0.85)) {
      const hours = Math.round(rand.around(10.4, 0.6) * 4) / 4;
      const nightWakings = Math.max(0, Math.round(rand.around(1, 0.9)));
      logs.push({
        ...base(),
        kind: "sleep",
        time: at(6, 45),
        hours,
        bedtime: "19:45",
        wakeTime: weekend ? "07:15" : "06:30",
        nightWakings,
        quality: toRating(3 + (hours - 10) - nightWakings * 0.5),
      });
    }
    if (date === PROTOTYPE_TODAY) continue;

    if (rand.chance(0.7)) logs.push({ ...base(), kind: "mood", time: at(18, rand.int(0, 59)), rating: toRating(rand.around(3.6, 1)) });
    if (rand.chance(0.5)) logs.push({ ...base(), kind: "appetite", time: at(18, 30), rating: toRating(rand.around(2.8, 0.9)) });
    if (rand.chance(weekend ? 0.15 : 0.22)) {
      logs.push({
        ...base(),
        kind: "meltdown",
        time: at(rand.pick([8, 15, 17]), rand.int(0, 59)),
        trigger: rand.pick(theo.triggers),
        intensity: toRating(rand.around(2.6, 1)),
        durationMinutes: rand.pick([5, 10, 10, 15, 20]),
        whatHelped: rand.sample(theo.calmingStrategies, rand.int(1, 2)),
      });
    }
    if (rand.chance(0.18)) logs.push({ ...base(), kind: "win", time: at(19, rand.int(0, 59)), text: rand.pick(wins) });
    if (rand.chance(0.05)) logs.push({ ...base(), kind: "note", time: at(20, 15), text: rand.pick(notes) });
  }
  return logs;
}

export const theoLogs: LogEntry[] = generateTheoLogs();
