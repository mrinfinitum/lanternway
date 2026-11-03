/**
 * The phone's client for the Lanternway API (/api/v1 on the website). The phone
 * never talks to the database or to Neon Auth directly (MOBILE_PLAN.md §2–3).
 *
 * Every response is typed from @lanternway/shared/api. Sign-in stores the session
 * token in the device's secure storage (Keychain / Keystore, this device only,
 * never AsyncStorage or backups); this sends it as a bearer token.
 */
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import type { RecordCollection } from "@lanternway/shared/record-schemas";
import type { Child, RespondentRole } from "@lanternway/shared/types";
import type { FamilyRole } from "@lanternway/shared/family-roles";
import type {
  ApiError,
  CheckInsResponse,
  ChildResponse,
  FamiliesResponse,
  HomeResponse,
  MeResponse,
  MedicationsResponse,
  OkResponse,
  PasswordChangeResponse,
  SchoolResponse,
  SignInResponse,
  SignUpConsentKey,
  SignUpResponse,
  TherapyResponse,
  TimelineResponse,
  TokenResponse,
  VerifyEmailResponse,
} from "@lanternway/shared/api";

/**
 * Where the API lives: EXPO_PUBLIC_API_URL if set (e.g. https://dev.lanternway.co),
 * otherwise, in development, the website's dev server (`pnpm dev`, port 3000) on the
 * computer running Metro, which the simulator and phones on the same Wi-Fi can reach.
 */
export const API_URL = (() => {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  return __DEV__ && host ? `http://${host}:3000` : "https://dev.lanternway.co";
})();

const TOKEN_KEY = "lanternway.session";
const secure = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };

export const getToken = () => SecureStore.getItemAsync(TOKEN_KEY, secure);
export const saveToken = (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token, secure);
export const clearToken = () => SecureStore.deleteItemAsync(TOKEN_KEY, secure);

/** Called when the server says a token we sent is no longer a live session (401). */
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Call the API. 401 means the session is gone (sign in again). 503 means the
 * sign-in service is busy: retried after its Retry-After, never treated as signed out.
 * status 0 means the phone couldn't reach Lanternway at all.
 */
export async function apiFetch<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<ApiResult<T>> {
  const token = await getToken();
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${API_URL}${path}`, {
        method: init.method ?? "GET",
        headers: {
          Accept: "application/json",
          "X-Time-Zone": timeZone(),
          ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      });
    } catch {
      return { ok: false, status: 0, error: "We can't reach Lanternway right now. Check your connection and try again." };
    }
    if (res.status === 503 && attempt < 2) {
      await wait(Math.min(Number(res.headers.get("retry-after")) || 5, 15) * 1000);
      continue;
    }
    // Only a 401 for a token we sent means "signed out" (a wrong password on sign-in is a 401 too).
    if (res.status === 401 && token) onSessionExpired?.();
    const body = (await res.json().catch(() => null)) as T | ApiError | null;
    if (res.ok && body) return { ok: true, data: body as T };
    const error = body && typeof body === "object" && "error" in body ? body.error : "Something went wrong. Please try again.";
    return { ok: false, status: res.status, error };
  }
}

/** The signed-in person, their families and the children they can see. */
export const getMe = () => apiFetch<MeResponse>("/api/v1/me");

/** Today for one child: this week's logs, recent check-ins, plan, meds, providers. */
export const getHome = (childId: string) => apiFetch<HomeResponse>(`/api/v1/children/${encodeURIComponent(childId)}/home`);

/** Timeline for one child: the lifelong record, plus the last month of logs and check-ins. */
export const getTimeline = (childId: string) => apiFetch<TimelineResponse>(`/api/v1/children/${encodeURIComponent(childId)}/timeline`);

/** Medications for one child: meds, dose changes, reminder settings, care team, and a year of logs and check-ins. */
export const getMedications = (childId: string) =>
  apiFetch<MedicationsResponse>(`/api/v1/children/${encodeURIComponent(childId)}/medications`);

const child = (childId: string) => `/api/v1/children/${encodeURIComponent(childId)}`;

/** About Me: the child's whole profile. */
export const getChild = (childId: string) => apiFetch<ChildResponse>(child(childId));

/** Save the whole About Me profile (admins). */
export const saveChild = (profile: Child) => apiFetch<OkResponse>(child(profile.id), { method: "PATCH", body: profile });

export const getTherapy = (childId: string) => apiFetch<TherapyResponse>(`${child(childId)}/therapy`);

export const getSchool = (childId: string) => apiFetch<SchoolResponse>(`${child(childId)}/school`);

/** People asked for check-ins, their links (never the tokens) and the check-ins. */
export const getCheckIns = (childId: string) => apiFetch<CheckInsResponse>(`${child(childId)}/check-ins`);

/** A new check-in link. The token comes back this once; share it and let it go. Admins. */
export const createCheckInLink = (
  childId: string,
  input: { days: number; respondentId?: string; respondent?: { name: string; role: RespondentRole; email?: string } },
) => apiFetch<TokenResponse>(`${child(childId)}/check-in-links`, { method: "POST", body: { ...input, consent: true } });

export const revokeCheckInLink = (linkId: string) =>
  apiFetch<OkResponse>(`/api/v1/check-in-links/${encodeURIComponent(linkId)}/revoke`, { method: "POST" });

const family = (familyId: string) => `/api/v1/families/${encodeURIComponent(familyId)}`;

/** My families, members and (for admins) invites without their tokens. */
export const getFamilies = () => apiFetch<FamiliesResponse>("/api/v1/families");

/** A new family invite. The token comes back this once. Admins. */
export const createInvite = (familyId: string, input: { label: string; role: FamilyRole; days: number }) =>
  apiFetch<TokenResponse>(`${family(familyId)}/invites`, { method: "POST", body: { ...input, consent: true } });

export const cancelInvite = (familyId: string, inviteId: string) =>
  apiFetch<OkResponse>(`${family(familyId)}/invites/${encodeURIComponent(inviteId)}/cancel`, { method: "POST" });

export const setMemberRole = (familyId: string, memberId: string, role: FamilyRole) =>
  apiFetch<OkResponse>(`${family(familyId)}/members/${encodeURIComponent(memberId)}`, { method: "PATCH", body: { role } });

/** Remove someone (admins), or leave the family (your own id). */
export const removeMember = (familyId: string, memberId: string) =>
  apiFetch<OkResponse>(`${family(familyId)}/members/${encodeURIComponent(memberId)}`, { method: "DELETE" });

// Account

export const changePassword = (currentPassword: string, newPassword: string) =>
  apiFetch<PasswordChangeResponse>("/api/v1/account/password", { method: "POST", body: { currentPassword, newPassword } });

export const signOutEverywhere = () => apiFetch<OkResponse>("/api/v1/account/sign-out-everywhere", { method: "POST" });

/** Everything stored for this account (the website's export). */
export const exportAccount = () => apiFetch<Record<string, unknown>>("/api/v1/account/export");

export const deleteAccount = (password: string) =>
  apiFetch<OkResponse>("/api/v1/account/delete", { method: "POST", body: { password, confirm: "DELETE" } });

/** Save (insert or update) a record by its phone-made id. */
export const putRecord = (collection: RecordCollection, id: string, body: Record<string, unknown>) =>
  apiFetch<OkResponse>(`/api/v1/records/${collection}/${encodeURIComponent(id)}`, { method: "PUT", body });

// Sign-in and account (all through /api/v1/auth/*; the phone never calls Neon Auth itself).

export const signIn = (email: string, password: string) =>
  apiFetch<SignInResponse>("/api/v1/auth/sign-in", { method: "POST", body: { email, password } });

export const signUp = (input: { name: string; email: string; password: string; consents: Record<SignUpConsentKey, boolean> }) =>
  apiFetch<SignUpResponse>("/api/v1/auth/sign-up", { method: "POST", body: input });

export const verifyEmail = (email: string, code: string) =>
  apiFetch<VerifyEmailResponse>("/api/v1/auth/verify-email", { method: "POST", body: { email, code } });

export const resendCode = (email: string) => apiFetch<OkResponse>("/api/v1/auth/resend-code", { method: "POST", body: { email } });

export const forgotPassword = (email: string) => apiFetch<OkResponse>("/api/v1/auth/forgot-password", { method: "POST", body: { email } });

/** Ends this device's session on the server. */
export const signOutOnServer = () => apiFetch<OkResponse>("/api/v1/auth/sign-out", { method: "POST" });

/** A page on the website (policies, password reset), for opening in the system browser. */
export const websiteUrl = (path: string) => `${API_URL}${path}`;
