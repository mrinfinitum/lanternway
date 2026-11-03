/**
 * The phone's client for the Lanternway API (/api/v1 on the website). The phone
 * never talks to the database or to Neon Auth directly (MOBILE_PLAN.md §2–3).
 *
 * Every response is typed from @lanternway/shared/api. Sign-in (M4) stores the
 * session token in the device's secure storage; this sends it as a bearer token.
 */
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import type { ApiError, MeResponse } from "@lanternway/shared/api";

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
    const body = (await res.json().catch(() => null)) as T | ApiError | null;
    if (res.ok && body) return { ok: true, data: body as T };
    const error = body && typeof body === "object" && "error" in body ? body.error : "Something went wrong. Please try again.";
    return { ok: false, status: res.status, error };
  }
}

/** The signed-in person, their families and the children they can see. */
export const getMe = () => apiFetch<MeResponse>("/api/v1/me");
