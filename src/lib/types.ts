/**
 * Core Lanternway data types.
 *
 * Shapes are kept close to how they'll look as Supabase rows later:
 * flat objects with string ids and foreign keys (`childId`, `providerId`, ...).
 *
 * Dates are ISO strings: `IsoDate` = "YYYY-MM-DD", `IsoDateTime` = full ISO 8601.
 */

export type IsoDate = string;
export type IsoDateTime = string;

/** A 1–5 rating. 1 = hardest / lowest, 5 = best / highest. */
export type Rating = 1 | 2 | 3 | 4 | 5;

// ---------------------------------------------------------------------------
// Child profile & About Me
// ---------------------------------------------------------------------------

export type CommunicationStyle =
  | "speaking"
  | "limited-speech"
  | "aac"
  | "nonverbal"
  | "speaking-and-aac";

export type Diagnosis = {
  name: string;
  /** Common tag for filtering, e.g. "autism", "adhd". */
  tag: string;
  diagnosedOn: IsoDate;
  diagnosedBy?: string;
  notes?: string;
};

export type EmergencyContact = {
  name: string;
  relationship: string;
  phone: string;
};

/** Where things stand with school, from the parent's point of view. */
export type SchoolPlanStatus = "iep" | "504" | "evaluating" | "none" | "unsure";

export type ChildSchool = {
  name?: string;
  /** Free text from the picker, e.g. "Kindergarten", "5th grade", "Not in school yet". */
  grade?: string;
  planStatus?: SchoolPlanStatus;
};

export type Child = {
  id: string;
  firstName: string;
  birthDate: IsoDate;
  photoUrl?: string;
  pronouns?: string;
  diagnoses: Diagnosis[];
  communicationStyle: CommunicationStyle;
  communicationNotes: string;
  sensoryNeeds: string[];
  triggers: string[];
  calmingStrategies: string[];
  likes: string[];
  dislikes: string[];
  /** Abilities, things they're proud of, and skills that are growing. */
  strengths: string[];
  /** Routines, eating, sleep, personal care, and safety notes. */
  dailyLife: string[];
  allergies: string[];
  school?: ChildSchool;
  emergencyContacts: EmergencyContact[];
  /**
   * Short parent-written intro in the child's voice. Keep health details out of it;
   * they go in `aboutMeHealth`, so a shared profile can leave them out.
   */
  aboutMe: string;
  /**
   * The private part of the intro (e.g. diagnoses in the child's words).
   * Only shared when the parent includes diagnoses.
   */
  aboutMeHealth?: string;
};

/** A life event for the lifelong timeline (not a daily log). */
export type MilestoneCategory =
  | "development"
  | "diagnosis"
  | "therapy"
  | "school"
  | "medication"
  | "life";

export type Milestone = {
  id: string;
  childId: string;
  date: IsoDate;
  category: MilestoneCategory;
  title: string;
  description?: string;
};

// ---------------------------------------------------------------------------
// Daily log
// ---------------------------------------------------------------------------

type LogEntryBase = {
  id: string;
  childId: string;
  date: IsoDate;
  /** "HH:MM", 24-hour, local time. */
  time?: string;
  loggedBy: string;
};

export type MoodLog = LogEntryBase & { kind: "mood"; rating: Rating; note?: string };

export type SleepLog = LogEntryBase & {
  kind: "sleep";
  /** Night that ended on `date`. */
  hours: number;
  bedtime: string;
  wakeTime: string;
  nightWakings: number;
  quality: Rating;
  note?: string;
};

export type AppetiteLog = LogEntryBase & {
  kind: "appetite";
  /** 1 = ate very little, 3 = usual, 5 = ate more than usual. */
  rating: Rating;
  note?: string;
};

export type MeltdownLog = LogEntryBase & {
  kind: "meltdown";
  trigger: string;
  intensity: Rating;
  durationMinutes: number;
  whatHelped: string[];
  note?: string;
};

export type WinLog = LogEntryBase & { kind: "win"; text: string };

export type NoteLog = LogEntryBase & { kind: "note"; text: string };

export type LogEntry =
  | MoodLog
  | SleepLog
  | AppetiteLog
  | MeltdownLog
  | WinLog
  | NoteLog;

export type LogKind = LogEntry["kind"];

// ---------------------------------------------------------------------------
// Medications
// ---------------------------------------------------------------------------

export type Medication = {
  id: string;
  childId: string;
  name: string;
  /** What the parent was told it's for, in their words. */
  purpose: string;
  form: string;
  /** Care-team provider who prescribes it. */
  prescriberId: string;
  /** Prescriber's name when they aren't on the care team. */
  prescriberName?: string;
  startDate: IsoDate;
  stopDate?: IsoDate;
  pharmacy?: string;
  lastFilledOn?: IsoDate;
  daysSupply?: number;
};

export type MedicationChangeType = "start" | "dose-change" | "stop";

/** One entry in a medication's history, as recorded by the parent. */
export type MedicationChange = {
  id: string;
  medicationId: string;
  date: IsoDate;
  type: MedicationChangeType;
  /** Dose in mg after this change (0 for a stop). */
  doseMg: number;
  schedule: string;
  /** Why the prescriber made the change, as the parent recorded it. */
  reason: string;
  sideEffectsObserved: string[];
  notes?: string;
};

// ---------------------------------------------------------------------------
// Therapy hub
// ---------------------------------------------------------------------------

export type ProviderType =
  | "aba"
  | "speech"
  | "ot"
  | "pt"
  | "feeding"
  | "counseling"
  | "psychiatry"
  | "pediatrics";

export type Provider = {
  id: string;
  childId: string;
  type: ProviderType;
  name: string;
  credentials?: string;
  practice: string;
  phone: string;
  email?: string;
  /** Plain-English schedule, e.g. "Tuesdays 4:00pm, weekly". */
  schedule?: string;
  startDate: IsoDate;
  endDate?: IsoDate;
};

export type GoalStatus = "active" | "met" | "paused" | "ended";

export type GoalProgress = {
  date: IsoDate;
  /** Percent toward the goal's target, 0–100. */
  percent: number;
  note?: string;
};

export type TherapyGoal = {
  id: string;
  providerId: string;
  title: string;
  description: string;
  startDate: IsoDate;
  status: GoalStatus;
  progress: GoalProgress[];
};

export type TherapySession = {
  id: string;
  providerId: string;
  date: IsoDate;
  durationMinutes: number;
  goalIds: string[];
  summary: string;
  /** Something the provider suggested trying at home, as the parent noted it. */
  practiceAtHome?: string;
};

// ---------------------------------------------------------------------------
// Teacher & therapist check-ins
// ---------------------------------------------------------------------------

export type RespondentRole =
  | "classroom-teacher"
  | "special-ed-teacher"
  | "aide"
  | "therapist"
  | "sitter";

export type CheckInRespondent = {
  id: string;
  childId: string;
  name: string;
  role: RespondentRole;
  email?: string;
};

/** A private link for one respondent about one child. */
export type CheckInLink = {
  token: string;
  childId: string;
  respondentId: string;
  createdAt: IsoDateTime;
  expiresAt: IsoDateTime;
  revokedAt?: IsoDateTime;
};

export type CheckInRatings = {
  focus: Rating;
  mood: Rating;
  behavior: Rating;
  participation: Rating;
};

export type CheckIn = {
  id: string;
  childId: string;
  respondentId: string;
  date: IsoDate;
  ratings: CheckInRatings;
  note?: string;
};

/**
 * What a respondent sees on the public check-in page.
 * Deliberately tiny: no access to the child's record.
 */
export type CheckInFormContext = {
  token: string;
  childFirstName: string;
  respondentName: string;
  expiresAt: IsoDateTime;
};

// ---------------------------------------------------------------------------
// IEP / 504
// ---------------------------------------------------------------------------

export type TeamMember = { name: string; role: string; email?: string };

export type IepPlan = {
  id: string;
  childId: string;
  type: "iep" | "504";
  school: string;
  grade: string;
  startDate: IsoDate;
  annualReviewDate: IsoDate;
  reevaluationDate: IsoDate;
  caseManager: string;
  team: TeamMember[];
};

export type IepGoalProgress = {
  date: IsoDate;
  /** Measured value, in the goal's own unit (e.g. % accuracy). */
  value: number;
  reportedBy: string;
  note?: string;
};

export type IepGoal = {
  id: string;
  planId: string;
  area: string;
  description: string;
  baseline: string;
  target: string;
  /** Unit for `progress[].value`, e.g. "% of trials". */
  unit: string;
  targetValue: number;
  progress: IepGoalProgress[];
};

export type DeliveryStatus = "delivered" | "partial" | "missed";

export type DeliveryLogEntry = {
  date: IsoDate;
  status: DeliveryStatus;
  note?: string;
};

export type Accommodation = {
  id: string;
  planId: string;
  /** "accommodation" = a support (e.g. extra time); "service" = scheduled minutes. */
  kind: "accommodation" | "service";
  title: string;
  details: string;
  /** e.g. "2 × 30 min/week". Services only. */
  frequency?: string;
  provider?: string;
  deliveryLog: DeliveryLogEntry[];
};

export type SchoolMessageType = "email" | "call" | "meeting" | "note-home" | "portal";

export type SchoolMessage = {
  id: string;
  childId: string;
  date: IsoDate;
  type: SchoolMessageType;
  direction: "from-school" | "to-school" | "both";
  person: string;
  role: string;
  subject: string;
  summary: string;
  attachments: { name: string }[];
};

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Inclusive date range. Either end can be left open. */
export type DateRange = { from?: IsoDate; to?: IsoDate };
