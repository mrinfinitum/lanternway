"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";

export type AuthFormState = { error: string; email?: string; name?: string } | null;

/**
 * Plain-language messages for auth errors. The server SDK reports codes like
 * "invalid_credentials"; the raw API uses "INVALID_EMAIL_OR_PASSWORD". Accept both.
 */
function friendly(error: { code?: string; message?: string; status?: number }): string {
  const code = (error.code ?? "").toLowerCase();
  const has = (...parts: string[]) => parts.some((p) => code.includes(p));
  if (has("invalid_credentials", "invalid_email_or_password", "invalid_password")) return "That email and password don't match. Please try again.";
  if (has("already_exists", "user_exists")) return "There's already an account with this email. Try signing in instead.";
  if (has("password_too_short", "password_short")) return "Please use at least 8 characters for your password.";
  if (has("password_too_long")) return "That password is too long. Please use a shorter one.";
  if (has("invalid_email")) return "That email address doesn't look complete.";
  if (has("email_not_verified")) return "Please verify your email first. Check your inbox for a code.";
  if (error.status === 429 || has("rate_limit", "too_many")) return "Too many tries. Please wait a minute and try again.";
  if (error.status === 401) return "That email and password don't match. Please try again.";
  return "Something went wrong on our side. Please try again.";
}

const isEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v);

export async function signIn(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!isEmail(email)) return { error: "Please enter your email address.", email };
  if (!password) return { error: "Please enter your password.", email };

  const { error } = await auth.signIn.email({ email, password });
  if (error) return { error: friendly(error), email };
  redirect("/home");
}

export async function signUp(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!name) return { error: "Please add your first name.", email, name };
  if (!isEmail(email)) return { error: "Please enter your email address.", email, name };
  if (password.length < 8) return { error: "Please use at least 8 characters for your password.", email, name };
  if (form.get("testing") !== "on") {
    return { error: "Please tick the box to confirm you'll use made-up details while we're testing.", email, name };
  }

  const { error } = await auth.signUp.email({ name, email, password });
  if (error) {
    // Email and password are checked above, so a validation failure here almost always means the
    // email is taken. Stay neutral rather than confirming whether an account exists.
    const message =
      error.status === 422 || (error.code ?? "").toLowerCase().includes("validation")
        ? "We couldn't create an account with that email. If you already have one, try signing in."
        : friendly(error);
    return { error: message, email, name };
  }
  redirect("/home");
}

export async function signOut() {
  await auth.signOut();
  redirect("/sign-in");
}
