// Request and response shapes of the mobile API (/api/v1), shared by the website's
// route handlers and the phone app so both compile against the same contract.
// Routes not listed here yet return the shapes in their route files' doc comments.

import type { Family, FamilyRole } from "./family-roles";
import type {
  Accommodation,
  CheckIn,
  CheckInLink,
  CheckInRespondent,
  Child,
  IepGoal,
  IepPlan,
  IsoDate,
  LogEntry,
  Medication,
  MedicationChange,
  MedicationReminder,
  Milestone,
  Provider,
  SchoolMessage,
  TherapyGoal,
  TherapySession,
} from "./types";

export type ApiUser = { id: string; name: string; email: string };

/** Every error response: a plain-English message the app can show as-is. */
export type ApiError = { error: string };

/** GET /api/v1/me */
export type MeResponse = {
  user: ApiUser;
  families: Family[];
  children: { child: Child; role: FamilyRole }[];
};

/** POST /api/v1/auth/sign-in { email, password } */
export type SignInResponse = { token: string; user: ApiUser };

/** POST /api/v1/auth/sign-up { name, email, password, consents: { adult, terms, healthData, testing } } */
export type SignUpResponse = { status: "needs_verification" };

/** POST /api/v1/auth/verify-email { email, code }: a token too when Neon Auth signs the person in. */
export type VerifyEmailResponse = { verified: true; token?: string; user?: ApiUser };

export type SignUpConsentKey = "adult" | "terms" | "healthData" | "testing";
export type SignUpConsent = { key: SignUpConsentKey; text: string; links?: readonly { label: string; path: string }[] };

/** The four sign-up agreements, in the website's words (keep in step with apps/web/src/app/(auth)/auth-form.tsx). */
export const SIGN_UP_CONSENTS: readonly SignUpConsent[] = [
  { key: "adult", text: "I’m 18 or older and a parent or legal guardian of the children I’ll add, or I have their permission." },
  { key: "terms", text: "I agree to the Terms of Use and Privacy Policy.", links: [{ label: "Terms of Use", path: "/terms" }, { label: "Privacy Policy", path: "/privacy" }] },
  {
    key: "healthData",
    text: "I consent to Lanternway storing the health information I choose to enter about my child (like diagnoses, medications, therapy, and school needs) to provide the service, as described in the Consumer Health Data Privacy Policy.",
    links: [{ label: "Consumer Health Data Privacy Policy", path: "/health-data-privacy" }],
  },
  { key: "testing", text: "I understand this is a test version and I’ll use made-up details, not real information about my child." },
];

/** Any route that just answers that it worked. */
export type OkResponse = { ok: true };

/** A person's access to one child's family (403s and hidden buttons follow this). */
export type ChildAccess = { role: FamilyRole; adminNames: string[] };

/** GET /api/v1/children/:childId/home?tz= (Today): the phone works out the week's stats with ./insights. */
export type HomeResponse = {
  access: ChildAccess;
  today: IsoDate;
  weekLogs: LogEntry[];
  checkIns: CheckIn[];
  iepPlan: IepPlan | null;
  medications: Medication[];
  providers: Provider[];
};

/** GET /api/v1/children/:childId/timeline?tz=: the phone builds the rows with ./timeline. */
export type TimelineResponse = {
  access: ChildAccess;
  today: IsoDate;
  milestones: Milestone[];
  medications: Medication[];
  medicationChanges: MedicationChange[];
  iepPlan: IepPlan | null;
  schoolMessages: SchoolMessage[];
  providers: Provider[];
  sessions: TherapySession[];
  logs: LogEntry[];
  checkIns: CheckIn[];
  respondents: CheckInRespondent[];
};

/** GET /api/v1/children/:childId/medications?tz=: a year of logs and check-ins for "before and after" and the calendar (./schedule). */
export type MedicationsResponse = {
  access: ChildAccess;
  today: IsoDate;
  medications: Medication[];
  medicationChanges: MedicationChange[];
  reminders: MedicationReminder[];
  logs: LogEntry[];
  checkIns: CheckIn[];
  providers: Provider[];
  sessions: TherapySession[];
};

/** GET /api/v1/children/:childId (About Me). PATCH takes the whole Child back (admins). */
export type ChildResponse = { child: Child; access: ChildAccess };

/** GET /api/v1/children/:childId/therapy?tz= */
export type TherapyResponse = {
  access: ChildAccess;
  today: IsoDate;
  providers: Provider[];
  goals: TherapyGoal[];
  sessions: TherapySession[];
  medications: Medication[];
  medicationChanges: MedicationChange[];
  reminders: MedicationReminder[];
};

/** GET /api/v1/children/:childId/school */
export type SchoolResponse = {
  access: ChildAccess;
  iepPlan: IepPlan | null;
  goals: IepGoal[];
  accommodations: Accommodation[];
  messages: SchoolMessage[];
};

/** GET /api/v1/children/:childId/check-ins: links never include their tokens. */
export type CheckInsResponse = {
  access: ChildAccess;
  respondents: CheckInRespondent[];
  links: CheckInLink[];
  checkIns: CheckIn[];
};

/** GET /api/v1/families: invites only for admins, never their tokens. */
export type FamiliesResponse = { families: Family[] };

/**
 * POST check-in-links and family invites: the token, returned this once. The phone
 * shares `<site>/c/<token>` or `<site>/join/<token>` and doesn't keep it.
 */
export type TokenResponse = { token: string };

/** POST /api/v1/account/password: this phone's new token (other devices are signed out). */
export type PasswordChangeResponse = { ok: true; token?: string };
