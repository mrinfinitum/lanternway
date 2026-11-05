/**
 * A child's records, read without cookies: every function takes the user and the
 * child explicitly. The website reads through src/lib/data.ts, which works out the
 * user and child from the request and calls these; the mobile API (/api/v1) calls
 * them directly. Server-only.
 *
 * For the family's own children the records come from Neon (row-level security
 * does the family isolation, so `userId` decides what's visible); for the sample
 * family (non-UUID ids) they come from @/mock and `userId` isn't needed.
 *
 * Lists are returned oldest-first unless noted.
 */

import "server-only";
import { isSavedChildId } from "@/lib/child-profile";
import { loadChildCheckIns } from "@/lib/checkins";
import { loadChildRecords } from "@/lib/records";
import { isInRange } from "@lanternway/shared/dates";
import type {
  Accommodation,
  CheckIn,
  CheckInLink,
  CheckInRespondent,
  DateRange,
  IepGoal,
  IepPlan,
  IsoDate,
  LogEntry,
  LogKind,
  Medication,
  MedicationChange,
  MedicationReminder,
  Milestone,
  Provider,
  SchoolMessage,
  TherapyGoal,
  TherapySession,
} from "@lanternway/shared/types";
import * as mock from "@/mock";

/** The signed-in user's id, or null (the sample family needs none). */
export type UserId = string | null;

const byDate = <T extends { date: IsoDate }>(a: T, b: T) => a.date.localeCompare(b.date);

function inRange<T extends { date: IsoDate }>(items: T[], range?: DateRange): T[] {
  return items.filter((item) => isInRange(item.date, range)).sort(byDate);
}

/** The saved child's records, or null for a sample child. */
async function saved(userId: UserId, childId: string | null | undefined) {
  if (!childId || !isSavedChildId(childId)) return null;
  return loadChildRecords(userId ?? "", childId);
}

const isId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

export async function childMilestones(userId: UserId, childId: string, range?: DateRange): Promise<Milestone[]> {
  const db = await saved(userId, childId);
  if (db) return inRange(db.milestones as unknown as Milestone[], range);
  return inRange(mock.milestones.filter((m) => m.childId === childId), range);
}

// ---------------------------------------------------------------------------
// Daily log
// ---------------------------------------------------------------------------

export async function childLogs(userId: UserId, childId: string, range?: DateRange, kinds?: LogKind[]): Promise<LogEntry[]> {
  const db = await saved(userId, childId);
  const source = db ? (db.logs as unknown as LogEntry[]) : mock.logs.filter((log) => log.childId === childId);
  const logs = source.filter((log) => !kinds || kinds.includes(log.kind));
  return inRange(logs, range).sort((a, b) => byDate(a, b) || (a.time ?? "").localeCompare(b.time ?? ""));
}

// ---------------------------------------------------------------------------
// Medications
// ---------------------------------------------------------------------------

export async function childMedications(userId: UserId, childId: string): Promise<Medication[]> {
  const db = await saved(userId, childId);
  if (db) return db.medications as unknown as Medication[];
  return mock.medications.filter((m) => m.childId === childId);
}

/** All changes across the child's medications. */
export async function childMedicationChanges(userId: UserId, childId: string, range?: DateRange): Promise<MedicationChange[]> {
  const ids = new Set((await childMedications(userId, childId)).map((m) => m.id));
  const db = await saved(userId, childId);
  const source = db ? (db.medicationChanges as unknown as MedicationChange[]) : mock.medicationChanges;
  return inRange(source.filter((c) => ids.has(c.medicationId)), range);
}

/** Reminder settings for the child's medications. */
export async function childMedicationReminders(userId: UserId, childId: string): Promise<MedicationReminder[]> {
  const ids = new Set((await childMedications(userId, childId)).map((m) => m.id));
  const db = await saved(userId, childId);
  const source = db ? (db.medicationReminders as unknown as MedicationReminder[]) : mock.medicationReminders;
  return source.filter((r) => ids.has(r.medicationId));
}

// ---------------------------------------------------------------------------
// Therapy hub
// ---------------------------------------------------------------------------

export async function childProviders(
  userId: UserId,
  childId: string,
  { includePast = true }: { includePast?: boolean } = {},
): Promise<Provider[]> {
  const db = await saved(userId, childId);
  const source = db ? (db.providers as unknown as Provider[]) : mock.providers.filter((p) => p.childId === childId);
  return source.filter((p) => includePast || !p.endDate);
}

/** Goals for one provider of the given child (saved providers are looked up in that child's records only). */
export async function childTherapyGoals(userId: UserId, childId: string | null, providerId: string): Promise<TherapyGoal[]> {
  if (isId(providerId)) {
    const db = await saved(userId, childId);
    return ((db?.therapyGoals ?? []) as unknown as TherapyGoal[]).filter((g) => g.providerId === providerId);
  }
  return mock.therapyGoals.filter((g) => g.providerId === providerId);
}

export async function childTherapySessions(
  userId: UserId,
  childId: string | null,
  providerId: string,
  range?: DateRange,
): Promise<TherapySession[]> {
  if (isId(providerId)) {
    const db = await saved(userId, childId);
    return inRange(((db?.therapySessions ?? []) as unknown as TherapySession[]).filter((s) => s.providerId === providerId), range);
  }
  return inRange(mock.therapySessions.filter((s) => s.providerId === providerId), range);
}

// ---------------------------------------------------------------------------
// Check-ins
// ---------------------------------------------------------------------------

export async function childCheckIns(userId: UserId, childId: string, range?: DateRange, respondentId?: string): Promise<CheckIn[]> {
  const all = isSavedChildId(childId) ? (await loadChildCheckIns(userId ?? "", childId)).checkIns : mock.checkIns;
  return inRange(
    all.filter((c) => c.childId === childId && (!respondentId || c.respondentId === respondentId)),
    range,
  );
}

export async function childCheckInRespondents(userId: UserId, childId: string): Promise<CheckInRespondent[]> {
  if (isSavedChildId(childId)) return (await loadChildCheckIns(userId ?? "", childId)).respondents;
  return mock.respondents.filter((r) => r.childId === childId);
}

/** Links for a child. Saved links never include their token (only a hash is stored). */
export async function childCheckInLinks(userId: UserId, childId: string): Promise<CheckInLink[]> {
  if (isSavedChildId(childId)) return (await loadChildCheckIns(userId ?? "", childId)).links;
  return mock.checkInLinks.filter((l) => l.childId === childId);
}

// ---------------------------------------------------------------------------
// IEP / 504
// ---------------------------------------------------------------------------

/** The child's current plan, if any. */
export async function childIepPlan(userId: UserId, childId: string): Promise<IepPlan | null> {
  const db = await saved(userId, childId);
  if (db) {
    const plans = (db.iepPlans as unknown as IepPlan[]).sort((a, b) => a.startDate.localeCompare(b.startDate));
    return plans.at(-1) ?? null;
  }
  return mock.iepPlans.find((p) => p.childId === childId) ?? null;
}

export async function childIepGoals(userId: UserId, childId: string | null, planId: string): Promise<IepGoal[]> {
  if (isId(planId)) {
    const db = await saved(userId, childId);
    return ((db?.iepGoals ?? []) as unknown as IepGoal[]).filter((g) => g.planId === planId);
  }
  return mock.iepGoals.filter((g) => g.planId === planId);
}

export async function childAccommodations(userId: UserId, childId: string | null, planId: string): Promise<Accommodation[]> {
  if (isId(planId)) {
    const db = await saved(userId, childId);
    return ((db?.accommodations ?? []) as unknown as Accommodation[]).filter((a) => a.planId === planId);
  }
  return mock.accommodations.filter((a) => a.planId === planId);
}

export async function childSchoolMessages(userId: UserId, childId: string, range?: DateRange): Promise<SchoolMessage[]> {
  const db = await saved(userId, childId);
  if (db) return inRange(db.schoolMessages as unknown as SchoolMessage[], range);
  return inRange(mock.schoolMessages.filter((m) => m.childId === childId), range);
}
