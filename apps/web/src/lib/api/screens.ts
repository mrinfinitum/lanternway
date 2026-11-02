/**
 * What each mobile screen reads, for the /api/v1/children/:childId/... routes.
 * Server-only. These return the same records the matching web page loads (through
 * the cookie-free readers in child-data.ts); summaries such as Home's week stats
 * are worked out on the phone from these, with the shared code.
 *
 * Callers check the user's access to the child first (childAccess in ./http).
 */

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
import { addDays } from "@lanternway/shared/dates";
import type { IsoDate } from "@lanternway/shared/types";

/** Home: this week's logs, the last two weeks of teacher check-ins, and what's coming up. */
export async function homeData(userId: string, childId: string, today: IsoDate) {
  const [weekLogs, checkIns, iepPlan, medications, providers] = await Promise.all([
    childLogs(userId, childId, { from: addDays(today, -6), to: today }),
    childCheckIns(userId, childId, { from: addDays(today, -13), to: today }),
    childIepPlan(userId, childId),
    childMedications(userId, childId),
    childProviders(userId, childId, { includePast: false }),
  ]);
  return { today, weekLogs, checkIns, iepPlan, medications, providers };
}

/** Every therapy session across the child's providers. */
async function allSessions(userId: string, childId: string, providerIds: string[]) {
  return (await Promise.all(providerIds.map((id) => childTherapySessions(userId, childId, id)))).flat();
}

/** Timeline: the lifelong record, plus the last month of logs and check-ins. */
export async function timelineData(userId: string, childId: string, today: IsoDate) {
  const from = addDays(today, -30);
  const [milestones, medications, medicationChanges, iepPlan, schoolMessages, providers, logs, checkIns, respondents] = await Promise.all([
    childMilestones(userId, childId),
    childMedications(userId, childId),
    childMedicationChanges(userId, childId),
    childIepPlan(userId, childId),
    childSchoolMessages(userId, childId),
    childProviders(userId, childId),
    childLogs(userId, childId, { from, to: today }),
    childCheckIns(userId, childId, { from, to: today }),
    childCheckInRespondents(userId, childId),
  ]);
  const sessions = await allSessions(userId, childId, providers.map((p) => p.id));
  return { today, milestones, medications, medicationChanges, iepPlan, schoolMessages, providers, sessions, logs, checkIns, respondents };
}

/** Medications: meds, dose changes, reminders, and the logs and check-ins around them (charts, calendar). */
export async function medicationsData(userId: string, childId: string, today: IsoDate) {
  const from = addDays(today, -365);
  const [medications, medicationChanges, reminders, logs, checkIns, providers] = await Promise.all([
    childMedications(userId, childId),
    childMedicationChanges(userId, childId),
    childMedicationReminders(userId, childId),
    childLogs(userId, childId, { from, to: today }),
    childCheckIns(userId, childId, { from, to: today }),
    childProviders(userId, childId),
  ]);
  const sessions = await allSessions(userId, childId, providers.map((p) => p.id));
  return { today, medications, medicationChanges, reminders, logs, checkIns, providers, sessions };
}

/** Therapy: providers with their goals and sessions (and meds, for the shared care calendar). */
export async function therapyData(userId: string, childId: string, today: IsoDate) {
  const [providers, medications, medicationChanges, reminders] = await Promise.all([
    childProviders(userId, childId),
    childMedications(userId, childId),
    childMedicationChanges(userId, childId),
    childMedicationReminders(userId, childId),
  ]);
  const goalsAndSessions = await Promise.all(
    providers.map(async (p) => {
      const [goals, sessions] = await Promise.all([childTherapyGoals(userId, childId, p.id), childTherapySessions(userId, childId, p.id)]);
      return { goals, sessions };
    }),
  );
  return {
    today,
    providers,
    goals: goalsAndSessions.flatMap((g) => g.goals),
    sessions: goalsAndSessions.flatMap((g) => g.sessions),
    medications,
    medicationChanges,
    reminders,
  };
}

/** School: the current plan with goals and supports, and school messages. */
export async function schoolData(userId: string, childId: string) {
  const iepPlan = await childIepPlan(userId, childId);
  const [goals, accommodations, messages] = await Promise.all([
    iepPlan ? childIepGoals(userId, childId, iepPlan.id) : [],
    iepPlan ? childAccommodations(userId, childId, iepPlan.id) : [],
    childSchoolMessages(userId, childId),
  ]);
  return { iepPlan, goals, accommodations, messages };
}

/** Teacher check-ins: people, links (never their tokens), and check-ins. */
export async function checkInData(userId: string, childId: string) {
  const [respondents, links, checkIns] = await Promise.all([
    childCheckInRespondents(userId, childId),
    childCheckInLinks(userId, childId),
    childCheckIns(userId, childId),
  ]);
  return { respondents, links, checkIns };
}
