/**
 * Data access for the app. Screens import from here, never from `@/mock`.
 *
 * Every function is async and filters by child/plan/provider id, so in
 * Stage 2 each one can become a Supabase query (with RLS doing the
 * family-level isolation) without changing any callers.
 *
 * Lists are returned oldest-first unless noted.
 */

import { isInRange } from "@/lib/dates";
import type {
  Accommodation,
  CheckIn,
  CheckInFormContext,
  CheckInLink,
  CheckInRespondent,
  Child,
  DateRange,
  IepGoal,
  IepPlan,
  IsoDate,
  LogEntry,
  LogKind,
  Medication,
  MedicationChange,
  Milestone,
  Provider,
  SchoolMessage,
  TherapyGoal,
  TherapySession,
} from "@/lib/types";
import * as mock from "@/mock";

const byDate = <T extends { date: IsoDate }>(a: T, b: T) => a.date.localeCompare(b.date);

function inRange<T extends { date: IsoDate }>(items: T[], range?: DateRange): T[] {
  return items.filter((item) => isInRange(item.date, range)).sort(byDate);
}

// ---------------------------------------------------------------------------
// Prototype clock
// ---------------------------------------------------------------------------

/** "Today" for the app. Pinned while on mock data; becomes the real date later. */
export async function getToday(): Promise<IsoDate> {
  return mock.PROTOTYPE_TODAY;
}

// ---------------------------------------------------------------------------
// Child
// ---------------------------------------------------------------------------

/** The child the parent is currently viewing. Single child for now. */
export async function getCurrentChild(): Promise<Child> {
  return mock.child;
}

export async function getChild(childId: string): Promise<Child | null> {
  return mock.child.id === childId ? mock.child : null;
}

export async function getMilestones(childId: string, range?: DateRange): Promise<Milestone[]> {
  return inRange(mock.milestones.filter((m) => m.childId === childId), range);
}

// ---------------------------------------------------------------------------
// Daily log
// ---------------------------------------------------------------------------

export async function getLogs(
  childId: string,
  range?: DateRange,
  kinds?: LogKind[],
): Promise<LogEntry[]> {
  const logs = mock.logs.filter(
    (log) => log.childId === childId && (!kinds || kinds.includes(log.kind)),
  );
  return inRange(logs, range).sort(
    (a, b) => byDate(a, b) || (a.time ?? "").localeCompare(b.time ?? ""),
  );
}

// ---------------------------------------------------------------------------
// Medications
// ---------------------------------------------------------------------------

export async function getMedications(childId: string): Promise<Medication[]> {
  return mock.medications.filter((m) => m.childId === childId);
}

/** All changes across the child's medications. */
export async function getMedicationChanges(
  childId: string,
  range?: DateRange,
): Promise<MedicationChange[]> {
  const ids = new Set((await getMedications(childId)).map((m) => m.id));
  return inRange(mock.medicationChanges.filter((c) => ids.has(c.medicationId)), range);
}

// ---------------------------------------------------------------------------
// Therapy hub
// ---------------------------------------------------------------------------

export async function getProviders(
  childId: string,
  { includePast = true }: { includePast?: boolean } = {},
): Promise<Provider[]> {
  return mock.providers.filter(
    (p) => p.childId === childId && (includePast || !p.endDate),
  );
}

export async function getProvider(childId: string, providerId: string): Promise<Provider | null> {
  return mock.providers.find((p) => p.childId === childId && p.id === providerId) ?? null;
}

export async function getTherapyGoals(providerId: string): Promise<TherapyGoal[]> {
  return mock.therapyGoals.filter((g) => g.providerId === providerId);
}

export async function getTherapySessions(
  providerId: string,
  range?: DateRange,
): Promise<TherapySession[]> {
  return inRange(mock.therapySessions.filter((s) => s.providerId === providerId), range);
}

// ---------------------------------------------------------------------------
// Check-ins
// ---------------------------------------------------------------------------

export async function getCheckIns(
  childId: string,
  range?: DateRange,
  respondentId?: string,
): Promise<CheckIn[]> {
  return inRange(
    mock.checkIns.filter(
      (c) => c.childId === childId && (!respondentId || c.respondentId === respondentId),
    ),
    range,
  );
}

export async function getCheckInRespondents(childId: string): Promise<CheckInRespondent[]> {
  return mock.respondents.filter((r) => r.childId === childId);
}

export async function getCheckInLinks(childId: string): Promise<CheckInLink[]> {
  return mock.checkInLinks.filter((l) => l.childId === childId);
}

/**
 * Public: used by the no-account check-in page. Returns only what the form
 * needs, or null if the link is unknown, revoked, or expired.
 */
export async function getCheckInFormContext(token: string): Promise<CheckInFormContext | null> {
  const link = mock.checkInLinks.find((l) => l.token === token);
  if (!link || link.revokedAt) return null;

  const now = `${await getToday()}T12:00:00Z`;
  if (link.expiresAt < now) return null;

  const respondent = mock.respondents.find((r) => r.id === link.respondentId);
  const child = await getChild(link.childId);
  if (!respondent || !child) return null;

  return {
    token: link.token,
    childFirstName: child.firstName,
    respondentName: respondent.name,
    expiresAt: link.expiresAt,
  };
}

// ---------------------------------------------------------------------------
// IEP / 504
// ---------------------------------------------------------------------------

/** The child's current plan, if any. */
export async function getIepPlan(childId: string): Promise<IepPlan | null> {
  return mock.iepPlan.childId === childId ? mock.iepPlan : null;
}

export async function getIepGoals(planId: string): Promise<IepGoal[]> {
  return mock.iepGoals.filter((g) => g.planId === planId);
}

export async function getAccommodations(planId: string): Promise<Accommodation[]> {
  return mock.accommodations.filter((a) => a.planId === planId);
}

export async function getSchoolMessages(
  childId: string,
  range?: DateRange,
): Promise<SchoolMessage[]> {
  return inRange(mock.schoolMessages.filter((m) => m.childId === childId), range);
}
