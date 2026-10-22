import { dayOfWeek, eachDay } from "@/lib/dates";
import type { LogEntry, MeltdownLog } from "@/lib/types";
import {
  CHILD_ID,
  CO_PARENT_NAME,
  DATA_START,
  PARENT_NAME,
  PROTOTYPE_TODAY,
  isSchoolDay,
  periodOn,
} from "./calendar";
import { child } from "./child";
import { createRandom, toRating } from "./random";

// ~2 years of daily logs, generated from a fixed seed so they never change.
// The shape of the data follows `periodOn()` in calendar.ts.

const rand = createRandom(20161014);

const schoolTriggers = [
  "Loud cafeteria",
  "Fire drill",
  "Hard homework",
  "Tired after school",
  "Change in the school schedule",
  "Substitute teacher",
];
const homeTriggers = [
  "Ending tablet time",
  "Change in plans",
  "Itchy clothes",
  "Waiting in a long line",
  "Playdate ended early",
  "Hair brushing",
  "Noisy restaurant",
];

const wins = [
  "Tried a new food (pasta with pesto)",
  "Asked for a break using her break card",
  "Got ready for school with only one reminder",
  "Drew a whole comic about Biscuit",
  "Said hi to a neighbor on her own",
  "Swam two laps without stopping",
  "Finished homework without a meltdown",
  "Told me she felt worried instead of shutting down",
  "Played a board game with Grandma and lost gracefully",
  "Used her AAC app to tell her teacher she was hungry",
  "Went to the grocery store with headphones and stayed calm",
  "Read a chapter book page out loud",
  "Helped make dinner (stirred the mac and cheese)",
  "Brushed teeth with no reminders",
  "Waited her turn at the playground",
  "Invited a classmate to sit with her at lunch",
];

const notes = [
  "Rainy day, lots of drawing.",
  "Grandma Ruth visited.",
  "Haircut today — went better with headphones.",
  "Biscuit knocked over her art cup; she laughed it off.",
  "Early dismissal. Quiet afternoon at home.",
  "Busy weekend, lots of driving.",
  "Swim lesson moved to Saturday.",
  "Daylight saving time change — slow morning.",
];

const appetiteNotes = ["Small lunch, big snack after school", "Only ate the crackers at lunch", "Ate seconds at dinner"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Clock time `hours` before/after a base time, as "HH:MM". */
function clock(baseMinutes: number, offsetHours: number) {
  const total = Math.round(baseMinutes + offsetHours * 60 + 24 * 60) % (24 * 60);
  return `${pad(Math.floor(total / 60))}:${pad(Math.round(total % 60))}`;
}

function generateLogs(): LogEntry[] {
  const logs: LogEntry[] = [];

  for (const date of eachDay(DATA_START, PROTOTYPE_TODAY)) {
    const p = periodOn(date);
    const school = isSchoolDay(date);
    const weekend = [0, 6].includes(dayOfWeek(date));
    const isToday = date === PROTOTYPE_TODAY;
    const by = () => (rand.chance(0.3) ? CO_PARENT_NAME : PARENT_NAME);
    let n = 0;
    const base = () => ({ id: `log-${date}-${++n}`, childId: CHILD_ID, date, loggedBy: by() });

    // Sleep (logged in the morning for the night before).
    if (rand.chance(0.92)) {
      const hours = Math.round(rand.around(p.sleepHours + (weekend ? 0.3 : 0), 0.5) * 4) / 4;
      const wakeMinutes = school ? 6 * 60 + 45 : 7 * 60 + 45;
      const nightWakings = Math.max(0, Math.round(rand.around(p.nightWakings, 0.8)));
      logs.push({
        ...base(),
        kind: "sleep",
        time: clock(wakeMinutes, 0.25),
        hours,
        bedtime: clock(wakeMinutes, -hours),
        wakeTime: clock(wakeMinutes, 0),
        nightWakings,
        quality: toRating(2 + (hours - 8) - nightWakings * 0.6 + rand.around(0.8, 0.6)),
      });
    }

    // The rest of the day hasn't happened yet "today".
    if (isToday) continue;

    // Meltdowns.
    const meltdowns: MeltdownLog[] = [];
    if (rand.chance(p.meltdownsPerWeek / 7)) {
      const trigger = school && rand.chance(0.6) ? rand.pick(schoolTriggers) : rand.pick(homeTriggers);
      meltdowns.push({
        ...base(),
        kind: "meltdown",
        time: school ? `${15 + rand.int(0, 3)}:${pad(rand.int(0, 59))}` : `${10 + rand.int(0, 9)}:${pad(rand.int(0, 59))}`,
        trigger,
        intensity: toRating(rand.around(2.8, 1.2)),
        durationMinutes: 5 * rand.int(1, 8),
        whatHelped: rand.sample(child.calmingStrategies, rand.int(1, 2)),
        note: rand.chance(0.2) ? "Calm and cuddly afterward." : undefined,
      });
    }
    logs.push(...meltdowns);

    // Appetite.
    if (rand.chance(0.75)) {
      const rating = toRating(rand.around(p.appetite, 0.8));
      logs.push({
        ...base(),
        kind: "appetite",
        time: "19:00",
        rating,
        note: rating <= 2 && school && rand.chance(0.4) ? appetiteNotes[0] : rand.chance(0.05) ? rand.pick(appetiteNotes) : undefined,
      });
    }

    // Wins.
    if (rand.chance(0.3)) {
      logs.push({ ...base(), kind: "win", time: `${16 + rand.int(0, 4)}:${pad(rand.int(0, 59))}`, text: rand.pick(wins) });
    }

    // Notes.
    if (rand.chance(0.06)) {
      logs.push({ ...base(), kind: "note", time: "20:30", text: rand.pick(notes) });
    }

    // Mood, logged at bedtime. A hard moment pulls the day down a little,
    // but plenty of hard days still end well.
    if (rand.chance(0.88)) {
      const mood = p.mood + (weekend ? 0.2 : 0) - meltdowns.length * 0.6;
      logs.push({ ...base(), kind: "mood", time: "20:45", rating: toRating(rand.around(mood, 0.9)) });
    }
  }

  return logs;
}

export const logs: LogEntry[] = generateLogs();
