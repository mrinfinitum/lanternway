/**
 * Data access for the app. Screens import from here, never from `@/mock`.
 *
 * Every function is async and filters by child/plan/provider id. For the family's
 * own children the records come from Neon (row-level security does the family
 * isolation); for the sample family they come from @/mock.
 *
 * Lists are returned oldest-first unless noted.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getSignedInUser } from "@/lib/auth/server";
import { listChildren } from "@/lib/families";
import { isSavedChildId } from "@/lib/child-profile";
import { loadChildRecords } from "@/lib/records";
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

/** Cookie holding the id of the child the parent last picked. */
export const CURRENT_CHILD_COOKIE = "lw-child";
/** Cookie set while a parent is looking around the sample family. */
export const SAMPLE_FAMILY_COOKIE = "lw-sample";

/** True while the parent is exploring the sample family (Maya and Theo). */
export const isSampleFamily = cache(async (): Promise<boolean> => (await cookies()).get(SAMPLE_FAMILY_COOKIE)?.value === "1");

/**
 * The kids the parent is looking at, oldest first: their own family's
 * children from Neon (row-level security), or the sample family while
 * exploring it. Reads cookies, so callers render inside <Suspense>.
 * Cached for the request, since the header and the page both ask.
 */
export const getChildren = cache(async (): Promise<Child[]> => {
  if (await isSampleFamily()) return mock.children;
  const user = await getSignedInUser();
  if (!user) return [];
  return listChildren(user.id);
});

/**
 * The child the parent is viewing: the one picked in the switcher (cookie), or
 * the first child. The cookie can never select a child outside the list.
 * Null when the family has no children yet.
 */
export async function getCurrentChildOrNull(): Promise<Child | null> {
  const [kids, store] = await Promise.all([getChildren(), cookies()]);
  const picked = store.get(CURRENT_CHILD_COOKIE)?.value;
  return kids.find((c) => c.id === picked) ?? kids[0] ?? null;
}

/** Like getCurrentChildOrNull, but sends a family with no kids yet to the start page. */
export async function getCurrentChild(): Promise<Child> {
  const child = await getCurrentChildOrNull();
  if (!child) redirect("/start");
  return child;
}

export async function getChild(childId: string): Promise<Child | null> {
  return (await getChildren()).find((c) => c.id === childId) ?? null;
}

// ---------------------------------------------------------------------------
// Where records come from: the database for the family's own children, sample
// data for the sample family. One query per request loads all of a child's records.
// ---------------------------------------------------------------------------

/** The saved child's records, or null for a sample child. */
async function saved(childId: string) {
  return isSavedChildId(childId) ? loadChildRecords(childId) : null;
}

/** Records of the child being viewed, when looking something up by provider or plan id. */
async function savedForCurrentChild() {
  const child = await getCurrentChildOrNull();
  return child && isSavedChildId(child.id) ? loadChildRecords(child.id) : null;
}

const isId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

export async function getMilestones(childId: string, range?: DateRange): Promise<Milestone[]> {
  const db = await saved(childId);
  if (db) return inRange(db.milestones as unknown as Milestone[], range);
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
  const db = await saved(childId);
  const source = db ? (db.logs as unknown as LogEntry[]) : mock.logs.filter((log) => log.childId === childId);
  const logs = source.filter((log) => !kinds || kinds.includes(log.kind));
  return inRange(logs, range).sort(
    (a, b) => byDate(a, b) || (a.time ?? "").localeCompare(b.time ?? ""),
  );
}

// ---------------------------------------------------------------------------
// Medications
// ---------------------------------------------------------------------------

export async function getMedications(childId: string): Promise<Medication[]> {
  const db = await saved(childId);
  if (db) return db.medications as unknown as Medication[];
  return mock.medications.filter((m) => m.childId === childId);
}

/** All changes across the child's medications. */
export async function getMedicationChanges(
  childId: string,
  range?: DateRange,
): Promise<MedicationChange[]> {
  const ids = new Set((await getMedications(childId)).map((m) => m.id));
  const db = await saved(childId);
  const source = db ? (db.medicationChanges as unknown as MedicationChange[]) : mock.medicationChanges;
  return inRange(source.filter((c) => ids.has(c.medicationId)), range);
}

// ---------------------------------------------------------------------------
// Therapy hub
// ---------------------------------------------------------------------------

export async function getProviders(
  childId: string,
  { includePast = true }: { includePast?: boolean } = {},
): Promise<Provider[]> {
  const db = await saved(childId);
  const source = db ? (db.providers as unknown as Provider[]) : mock.providers.filter((p) => p.childId === childId);
  return source.filter((p) => includePast || !p.endDate);
}

/** Every provider id across the family, for prebuilding provider pages. */
export async function getAllProviderIds(): Promise<string[]> {
  return mock.providers.map((p) => p.id);
}

/** Any provider by id, regardless of child. For page titles only (no cookies). */
export async function getProviderById(providerId: string): Promise<Provider | null> {
  return mock.providers.find((p) => p.id === providerId) ?? null;
}

export async function getProvider(childId: string, providerId: string): Promise<Provider | null> {
  return (await getProviders(childId)).find((p) => p.id === providerId) ?? null;
}

export async function getTherapyGoals(providerId: string): Promise<TherapyGoal[]> {
  if (isId(providerId)) {
    const db = await savedForCurrentChild();
    return ((db?.therapyGoals ?? []) as unknown as TherapyGoal[]).filter((g) => g.providerId === providerId);
  }
  return mock.therapyGoals.filter((g) => g.providerId === providerId);
}

export async function getTherapySessions(
  providerId: string,
  range?: DateRange,
): Promise<TherapySession[]> {
  if (isId(providerId)) {
    const db = await savedForCurrentChild();
    return inRange(((db?.therapySessions ?? []) as unknown as TherapySession[]).filter((s) => s.providerId === providerId), range);
  }
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
  // Check-in links are still sample data, so look up the sample child (public page, no account).
  const child = mock.children.find((c) => c.id === link.childId);
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
  const db = await saved(childId);
  if (db) {
    const plans = (db.iepPlans as unknown as IepPlan[]).sort((a, b) => a.startDate.localeCompare(b.startDate));
    return plans.at(-1) ?? null;
  }
  return mock.iepPlans.find((p) => p.childId === childId) ?? null;
}

export async function getIepGoals(planId: string): Promise<IepGoal[]> {
  if (isId(planId)) {
    const db = await savedForCurrentChild();
    return ((db?.iepGoals ?? []) as unknown as IepGoal[]).filter((g) => g.planId === planId);
  }
  return mock.iepGoals.filter((g) => g.planId === planId);
}

export async function getAccommodations(planId: string): Promise<Accommodation[]> {
  if (isId(planId)) {
    const db = await savedForCurrentChild();
    return ((db?.accommodations ?? []) as unknown as Accommodation[]).filter((a) => a.planId === planId);
  }
  return mock.accommodations.filter((a) => a.planId === planId);
}

export async function getSchoolMessages(
  childId: string,
  range?: DateRange,
): Promise<SchoolMessage[]> {
  const db = await saved(childId);
  if (db) return inRange(db.schoolMessages as unknown as SchoolMessage[], range);
  return inRange(mock.schoolMessages.filter((m) => m.childId === childId), range);
}
