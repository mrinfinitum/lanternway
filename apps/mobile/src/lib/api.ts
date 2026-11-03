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
import type {
  ApiError,
  HomeResponse,
  MeResponse,
  OkResponse,
  SignInResponse,
  SignUpConsentKey,
  SignUpResponse,
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
