/**
 * Data access for the app. Screens import from here, never from `@/mock`.
 *
 * Every function is async and filters by child/plan/provider id. This file works
 * out the request's user, child and "today" from cookies; the record readers
 * themselves are cookie-free (child-data.ts) and shared with the mobile API.
 * For the family's own children the records come from Neon (row-level security
 * does the family isolation); for the sample family they come from @/mock.
 *
 * Lists are returned oldest-first unless noted.
 */

import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getSignedInUser } from "@/lib/auth/server";
import { listChildren } from "@/lib/families";
import { getAccessForChild, type Access } from "@/lib/sharing";
import { isSavedLinkToken, savedLinkFormContext } from "@/lib/checkins";
import {
  childAccommodations,
  childCheckInLinks,
  childCheckInRespondents,
  childCheckIns,
  childIepGoals,
  childIepPlan,
  childLogs,
  childMedicationChanges,
  childMedicationReminders,
  childMedications,
  childMilestones,
  childProviders,
  childSchoolMessages,
  childTherapyGoals,
  childTherapySessions,
} from "@/lib/child-data";
import { TIME_ZONE_COOKIE, todayIn } from "@lanternway/shared/dates";
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
  MedicationReminder,
  Milestone,
  Provider,
  SchoolMessage,
  TherapyGoal,
  TherapySession,
} from "@lanternway/shared/types";
import * as mock from "@/mock";

// ---------------------------------------------------------------------------
// Prototype clock
// ---------------------------------------------------------------------------

/**
 * "Today" for the app: the real date in the family's time zone, or the pinned
 * prototype date while exploring the sample family (its data is built around it).
 */
export const getToday = cache(async (): Promise<IsoDate> => {
  if (await isSampleFamily()) return mock.PROTOTYPE_TODAY;
  const tz = (await cookies()).get(TIME_ZONE_COOKIE)?.value ?? "";
  await connection(); // reading the clock: always at request time
  return todayIn(tz.replace(/%2F/gi, "/"));
});

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

/**
 * What the signed-in person may do with the child being viewed: their role in that
 * child's family (lib/sharing.ts). Admin for the sample family and before any kids exist.
 * The database enforces this too; screens use it to hide what they can't change.
 */
export const getCurrentAccess = cache(async (): Promise<Access> => {
  const admin: Access = { role: "admin", adminNames: [] };
  if (await isSampleFamily()) return admin;
  const [user, child] = await Promise.all([getSignedInUser(), getCurrentChildOrNull()]);
  if (!user || !child) return admin;
  return (await getAccessForChild(user.id, child.id)) ?? { role: "view", adminNames: [] };
});

export async function getChild(childId: string): Promise<Child | null> {
  return (await getChildren()).find((c) => c.id === childId) ?? null;
}

// ---------------------------------------------------------------------------
// Records: the request's user and (where needed) current child, passed to the
// cookie-free readers in child-data.ts, which the mobile API uses directly.
// ---------------------------------------------------------------------------

/** The signed-in user's id for reading saved records (row-level security), or null. */
const viewerId = async () => (await getSignedInUser())?.id ?? null;

/** For lookups by provider or plan id: the user and the child being viewed. */
async function viewerAndChild() {
  const [userId, child] = await Promise.all([viewerId(), getCurrentChildOrNull()]);
  return [userId, child?.id ?? null] as const;
}

export async function getMilestones(childId: string, range?: DateRange): Promise<Milestone[]> {
  return childMilestones(await viewerId(), childId, range);
}

// Daily log

export async function getLogs(childId: string, range?: DateRange, kinds?: LogKind[]): Promise<LogEntry[]> {
  return childLogs(await viewerId(), childId, range, kinds);
}

// Medications

export async function getMedications(childId: string): Promise<Medication[]> {
  return childMedications(await viewerId(), childId);
}

/** All changes across the child's medications. */
export async function getMedicationChanges(childId: string, range?: DateRange): Promise<MedicationChange[]> {
  return childMedicationChanges(await viewerId(), childId, range);
}

/** Reminder settings for the child's medications. */
export async function getMedicationReminders(childId: string): Promise<MedicationReminder[]> {
  return childMedicationReminders(await viewerId(), childId);
}

// Therapy hub

export async function getProviders(childId: string, options: { includePast?: boolean } = {}): Promise<Provider[]> {
  return childProviders(await viewerId(), childId, options);
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
  const [userId, childId] = await viewerAndChild();
  return childTherapyGoals(userId, childId, providerId);
}

export async function getTherapySessions(providerId: string, range?: DateRange): Promise<TherapySession[]> {
  const [userId, childId] = await viewerAndChild();
  return childTherapySessions(userId, childId, providerId, range);
}

// Check-ins

export async function getCheckIns(childId: string, range?: DateRange, respondentId?: string): Promise<CheckIn[]> {
  return childCheckIns(await viewerId(), childId, range, respondentId);
}

export async function getCheckInRespondents(childId: string): Promise<CheckInRespondent[]> {
  return childCheckInRespondents(await viewerId(), childId);
}

/** Links for a child. Saved links never include their token (only a hash is stored). */
export async function getCheckInLinks(childId: string): Promise<CheckInLink[]> {
  return childCheckInLinks(await viewerId(), childId);
}

/**
 * Public: used by the no-account check-in page. Returns only what the form
 * needs, or null if the link is unknown, revoked, or expired.
 */
export async function getCheckInFormContext(token: string): Promise<CheckInFormContext | null> {
  if (isSavedLinkToken(token)) return savedLinkFormContext(token);

  // Sample-family links (for previewing the form).
  const link = mock.checkInLinks.find((l) => l.token === token);
  if (!link || link.revokedAt) return null;
  if (link.expiresAt < `${mock.PROTOTYPE_TODAY}T12:00:00Z`) return null;
  const respondent = mock.respondents.find((r) => r.id === link.respondentId);
  const child = mock.children.find((c) => c.id === link.childId);
  if (!respondent || !child) return null;
  return { childFirstName: child.firstName, respondentName: respondent.name, expiresAt: link.expiresAt };
}

// ---------------------------------------------------------------------------
// IEP / 504
// ---------------------------------------------------------------------------

/** The child's current plan, if any. */
export async function getIepPlan(childId: string): Promise<IepPlan | null> {
  return childIepPlan(await viewerId(), childId);
}

export async function getIepGoals(planId: string): Promise<IepGoal[]> {
  const [userId, childId] = await viewerAndChild();
  return childIepGoals(userId, childId, planId);
}

export async function getAccommodations(planId: string): Promise<Accommodation[]> {
  const [userId, childId] = await viewerAndChild();
  return childAccommodations(userId, childId, planId);
}

export async function getSchoolMessages(childId: string, range?: DateRange): Promise<SchoolMessage[]> {
  return childSchoolMessages(await viewerId(), childId, range);
}
