// Request and response shapes of the mobile API (/api/v1), shared by the website's
// route handlers and the phone app so both compile against the same contract.
// Routes not listed here yet return the shapes in their route files' doc comments.

import type { Family, FamilyRole } from "./family-roles";
import type { CheckIn, Child, IepPlan, IsoDate, LogEntry, Medication, Provider } from "./types";

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
