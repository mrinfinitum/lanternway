import { addDays, dayOfWeek } from "@/lib/dates";
import type { IsoDate } from "@/lib/types";

/**
 * The prototype is pinned to a fixed "today" so the sample data always looks
 * fresh and screenshots stay consistent. Screens should use this instead of
 * `new Date()` while we're on mock data.
 */
export const PROTOTYPE_TODAY: IsoDate = "2026-10-21";

/** Start of the ~2 years of detailed daily data. */
export const DATA_START: IsoDate = addDays(PROTOTYPE_TODAY, -730);

export const CHILD_ID = "child-maya";
export const PARENT_NAME = "Dana";
export const CO_PARENT_NAME = "Chris";

/** Dates of the three medication changes inside the data window. */
export const MED_DATES = {
  methylphenidateStart: "2023-08-21",
  methylphenidateTo27: "2025-02-10",
  guanfacineStart: "2025-09-15",
  methylphenidateTo36: "2026-03-03",
} as const;

/** Therapy switch: ABA ends, speech + OT begin. */
export const THERAPY_DATES = {
  abaEnd: "2025-06-27",
  speechStart: "2025-07-15",
  otStart: "2025-07-17",
} as const;

type SchoolYear = {
  label: string;
  grade: string;
  teacherId: string;
  start: IsoDate;
  end: IsoDate;
  breaks: { from: IsoDate; to: IsoDate }[];
};

export const SCHOOL_YEARS: SchoolYear[] = [
  {
    label: "2024–25",
    grade: "3rd grade",
    teacherId: "resp-rivera",
    start: "2024-08-26",
    end: "2025-06-13",
    breaks: [
      { from: "2024-11-25", to: "2024-11-29" },
      { from: "2024-12-23", to: "2025-01-03" },
      { from: "2025-03-24", to: "2025-03-28" },
    ],
  },
  {
    label: "2025–26",
    grade: "4th grade",
    teacherId: "resp-okafor",
    start: "2025-08-25",
    end: "2026-06-12",
    breaks: [
      { from: "2025-11-24", to: "2025-11-28" },
      { from: "2025-12-22", to: "2026-01-02" },
      { from: "2026-03-30", to: "2026-04-03" },
    ],
  },
  {
    label: "2026–27",
    grade: "5th grade",
    teacherId: "resp-lindqvist",
    start: "2026-08-24",
    end: "2027-06-11",
    breaks: [
      { from: "2026-11-23", to: "2026-11-27" },
      { from: "2026-12-21", to: "2027-01-01" },
    ],
  },
];

export function schoolYearOn(date: IsoDate): SchoolYear | undefined {
  return SCHOOL_YEARS.find((y) => date >= y.start && date <= y.end);
}

/** True on weekdays during the school year, outside breaks. */
export function isSchoolDay(date: IsoDate): boolean {
  const year = schoolYearOn(date);
  if (!year) return false;
  const dow = dayOfWeek(date);
  if (dow === 0 || dow === 6) return false;
  return !year.breaks.some((b) => date >= b.from && date <= b.to);
}

/**
 * How Maya's days tend to go in each period. Used to shape the generated
 * logs and check-ins so charts tell a believable story:
 * - steadier after the Feb 2025 dose change
 * - better sleep after guanfacine (Sep 2025)
 * - a rough stretch in Jan–Feb 2026 (new seating, winter), then clear
 *   improvement in school focus after the Mar 3, 2026 change, with less
 *   lunchtime appetite.
 */
export type Period = {
  focus: number;
  mood: number;
  sleepHours: number;
  nightWakings: number;
  appetite: number;
  meltdownsPerWeek: number;
};

export function periodOn(date: IsoDate): Period {
  if (date < MED_DATES.methylphenidateTo27) {
    return { focus: 2.6, mood: 3.2, sleepHours: 8.8, nightWakings: 1.2, appetite: 3.1, meltdownsPerWeek: 2.2 };
  }
  if (date < "2025-08-25") {
    return { focus: 3.2, mood: 3.5, sleepHours: 8.7, nightWakings: 1.1, appetite: 2.9, meltdownsPerWeek: 1.6 };
  }
  if (date < MED_DATES.guanfacineStart) {
    // New grade and new therapists: a bumpy start.
    return { focus: 2.9, mood: 3.2, sleepHours: 8.6, nightWakings: 1.3, appetite: 3.0, meltdownsPerWeek: 2.0 };
  }
  if (date < "2026-01-05") {
    return { focus: 3.0, mood: 3.5, sleepHours: 9.3, nightWakings: 0.5, appetite: 3.1, meltdownsPerWeek: 1.4 };
  }
  if (date < MED_DATES.methylphenidateTo36) {
    return { focus: 2.1, mood: 3.0, sleepHours: 9.2, nightWakings: 0.6, appetite: 3.2, meltdownsPerWeek: 2.1 };
  }
  if (date < "2026-08-24") {
    return { focus: 3.8, mood: 3.7, sleepHours: 9.2, nightWakings: 0.5, appetite: 2.4, meltdownsPerWeek: 1.0 };
  }
  return { focus: 3.7, mood: 3.8, sleepHours: 9.3, nightWakings: 0.4, appetite: 2.7, meltdownsPerWeek: 0.9 };
}
