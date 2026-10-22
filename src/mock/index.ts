// Fictional sample data for the Stage 1 prototype.
// Screens should not import from here directly — use `@/lib/data` instead,
// so we can swap in Supabase later without touching the UI.

export { CHILD_ID, DATA_START, PROTOTYPE_TODAY } from "./calendar";
export { child, milestones } from "./child";
export { logs } from "./logs";
export { medicationChanges, medications } from "./medications";
export { providers, therapyGoals, therapySessions } from "./providers";
export {
  DEMO_CHECKIN_TOKEN,
  accommodations,
  checkInLinks,
  checkIns,
  iepGoals,
  iepPlan,
  respondents,
  schoolMessages,
} from "./school";
