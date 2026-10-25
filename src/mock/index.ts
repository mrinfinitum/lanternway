// Fictional sample data for the Stage 1 prototype.
// Screens should not import from here directly — use `@/lib/data` instead,
// so we can swap in Supabase later without touching the UI.

import { child as maya, milestones as mayaMilestones } from "./child";
import { logs as mayaLogs } from "./logs";
import { providers as mayaProviders, therapyGoals as mayaGoals, therapySessions as mayaSessions } from "./providers";
import { iepPlan } from "./school";
import { theo, theoLogs, theoMilestones, theoProviders, theoTherapyGoals, theoTherapySessions } from "./theo";

export { CHILD_ID, DATA_START, PROTOTYPE_TODAY } from "./calendar";
export { medicationChanges, medications } from "./medications";
export {
  DEMO_CHECKIN_TOKEN,
  accommodations,
  checkInLinks,
  checkIns,
  iepGoals,
  respondents,
  schoolMessages,
} from "./school";

/** The sample family's kids, oldest first. */
export const children = [maya, theo];
export const milestones = [...mayaMilestones, ...theoMilestones];
export const logs = [...mayaLogs, ...theoLogs];
export const providers = [...mayaProviders, ...theoProviders];
export const therapyGoals = [...mayaGoals, ...theoTherapyGoals];
export const therapySessions = [...mayaSessions, ...theoTherapySessions];
export const iepPlans = [iepPlan];
