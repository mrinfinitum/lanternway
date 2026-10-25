import type {
  CommunicationStyle,
  DeliveryStatus,
  LogKind,
  MilestoneCategory,
  ProviderType,
  RespondentRole,
  SchoolMessageType,
} from "@/lib/types";

// Plain-English labels shown in the UI. Kept gentle on purpose:
// a low rating is "hard", never "bad".

export const moodLabels = ["Very hard", "Hard", "Okay", "Good", "Great"] as const;
export const appetiteLabels = ["Very little", "Less than usual", "Usual", "More than usual", "A lot"] as const;
export const sleepQualityLabels = ["Very restless", "Restless", "Okay", "Good", "Great"] as const;
export const intensityLabels = ["Very mild", "Mild", "Medium", "Strong", "Very strong"] as const;

/** Index with a 1–5 rating. */
export const ratingLabel = (labels: readonly string[], rating: number) => labels[rating - 1] ?? "";

export const logKindLabels: Record<LogKind, string> = {
  mood: "Mood",
  sleep: "Sleep",
  appetite: "Appetite",
  meltdown: "Meltdown",
  win: "Win",
  note: "Note",
};

export const checkInQuestions = [
  { key: "focus", label: "Focus", low: "Hard to focus", high: "Very focused" },
  { key: "mood", label: "Mood", low: "Upset most of the day", high: "Happy and settled" },
  { key: "behavior", label: "Behavior", low: "Lots of support needed", high: "Smooth day" },
  { key: "participation", label: "Participation", low: "Didn't join in", high: "Joined in a lot" },
] as const;

export const providerTypeLabels: Record<ProviderType, string> = {
  aba: "ABA",
  speech: "Speech therapy",
  ot: "Occupational therapy",
  pt: "Physical therapy",
  feeding: "Feeding therapy",
  counseling: "Counseling",
  psychiatry: "Psychiatry",
  pediatrics: "Pediatrics",
};

export const communicationStyleLabels: Record<CommunicationStyle, string> = {
  speaking: "Speaking",
  "limited-speech": "Limited speech",
  aac: "AAC",
  nonverbal: "Nonverbal",
  "speaking-and-aac": "Speaking + AAC",
};

export const respondentRoleLabels: Record<RespondentRole, string> = {
  "classroom-teacher": "Classroom teacher",
  "special-ed-teacher": "Special education teacher",
  aide: "Aide",
  therapist: "Therapist",
  sitter: "Sitter",
};

export const milestoneCategoryLabels: Record<MilestoneCategory, string> = {
  development: "Development",
  diagnosis: "Diagnosis",
  therapy: "Therapy",
  school: "School",
  medication: "Medication",
  life: "Life",
};

export const deliveryStatusLabels: Record<DeliveryStatus, string> = {
  delivered: "Delivered",
  partial: "Partly delivered",
  missed: "Not delivered",
};

export const schoolMessageTypeLabels: Record<SchoolMessageType, string> = {
  email: "Email",
  call: "Phone call",
  meeting: "Meeting",
  "note-home": "Note home",
  portal: "School portal",
};
