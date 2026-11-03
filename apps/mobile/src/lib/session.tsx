/**
 * Who's signed in on this phone. The root layout shows the sign-in screens or the
 * app from this state (Stack.Protected in src/app/_layout.tsx).
 *
 * - A 401 for our token (expired, revoked, signed out elsewhere) clears it and goes
 *   back to sign-in with a gentle note.
 * - A 503 or no connection never signs anyone out: the token is kept and the app
 *   says it can't check right now.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { MeResponse } from "@lanternway/shared/api";
import { clearToken, getMe, getToken, saveToken, setSessionExpiredHandler, signIn as signInRequest, signOutOnServer } from "@/lib/api";

export type Session =
  | { status: "loading" }
  | { status: "signed-out"; notice?: string }
  | { status: "signed-in"; me: MeResponse }
  /** Signed in, but the server couldn't be reached to load the account. */
  | { status: "unreachable"; error: string };

type SignInResult = { ok: true } | { ok: false; error: string; needsVerification?: boolean };

type SessionContext = {
  session: Session;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  /** After verifying the email: store the token the server gave, or sign in with the password just used. */
  finishSignIn: (token: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  /** Try loading the account again (after "can't reach Lanternway"). */
  reload: () => Promise<void>;
  /** Keep the email and password from sign-up or sign-in in memory only (never stored), so confirming the email can sign straight in. */
  rememberForVerify: (email: string, password: string) => void;
  /** After the code is confirmed: sign in with the remembered password for this email, if there is one. */
  signInAfterVerify: (email: string) => Promise<SignInResult | null>;
};

const Context = createContext<SessionContext | null>(null);

export const SESSION_ENDED = "You’ve been signed out. Please sign in again.";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ status: "loading" });
  const pending = useRef<{ email: string; password: string } | null>(null);

  /** Load the account for the stored token and set the state from the answer. */
  const load = useCallback(async (): Promise<SignInResult> => {
    const result = await getMe();
    if (result.ok) {
      setSession({ status: "signed-in", me: result.data });
      return { ok: true };
    }
    if (result.status === 401) {
      // The expired-session handler has already cleared the token.
      return { ok: false, error: SESSION_ENDED };
    }
    setSession({ status: "unreachable", error: result.error });
    return { ok: false, error: result.error };
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      void clearToken();
      setSession({ status: "signed-out", notice: SESSION_ENDED });
    });
    let live = true;
    getToken().then((token) => {
      if (!live) return;
      if (token) void load();
      else setSession({ status: "signed-out" });
    });
    return () => {
      live = false;
      setSessionExpiredHandler(null);
    };
  }, [load]);

  const finishSignIn = useCallback(
    async (token: string) => {
      await saveToken(token);
      pending.current = null;
      return load();
    },
    [load],
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<SignInResult> => {
      const result = await signInRequest(email, password);
      if (result.ok) return finishSignIn(result.data.token);
      if (result.status === 403 && result.error === "needs_verification") {
        pending.current = { email, password };
        return { ok: false, error: "Please confirm your email first.", needsVerification: true };
      }
      return { ok: false, error: result.error };
    },
    [finishSignIn],
  );

  const signOut = useCallback(async () => {
    // End the session on the server if we can; the phone forgets it either way.
    await signOutOnServer().catch(() => undefined);
    await clearToken();
    pending.current = null;
    setSession({ status: "signed-out" });
  }, []);

  const reload = useCallback(async () => {
    setSession({ status: "loading" });
    if (await getToken()) await load();
    else setSession({ status: "signed-out" });
  }, [load]);

  const rememberForVerify = useCallback((email: string, password: string) => {
    pending.current = { email, password };
  }, []);

  const signInAfterVerify = useCallback(
    async (email: string) => (pending.current?.email === email ? signIn(email, pending.current.password) : null),
    [signIn],
  );

  const value = useMemo(
    () => ({ session, signIn, finishSignIn, signOut, reload, rememberForVerify, signInAfterVerify }),
    [session, signIn, finishSignIn, signOut, reload, rememberForVerify, signInAfterVerify],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSession(): SessionContext {
  const value = useContext(Context);
  if (!value) throw new Error("useSession must be used inside <SessionProvider>");
  return value;
}
