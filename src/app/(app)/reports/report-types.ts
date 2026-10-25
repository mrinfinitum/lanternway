export type ReportType = "doctor" | "iep" | "therapist";

export const reportTypes: { value: ReportType; title: string; description: string }[] = [
  {
    value: "doctor",
    title: "Doctor visit",
    description: "Medications and changes, sleep, appetite, mood, meltdowns, and teacher ratings.",
  },
  {
    value: "iep",
    title: "IEP meeting",
    description: "Goal progress, services delivered, accommodations, teacher check-ins, and school contacts.",
  },
  {
    value: "therapist",
    title: "Therapist",
    description: "Therapy goals, sessions, what's been hard, what helps, and recent wins.",
  },
];

export const rangePresets = [
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 3 months" },
  { days: 180, label: "Last 6 months" },
  { days: 365, label: "Last 12 months" },
];

export const isReportType = (v: unknown): v is ReportType =>
  typeof v === "string" && reportTypes.some((t) => t.value === v);
