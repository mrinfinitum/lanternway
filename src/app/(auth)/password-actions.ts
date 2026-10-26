"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { passwordProblem } from "@/lib/password-policy";

export type ResetState = { error?: string; sent?: boolean; email?: string } | null;

/** The site's own origin (e.g. https://dev.lanternway.co), for the link in the email. */
async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Email a reset link. Always answers the same way, whether or not the email has an
 * account, so the form can't be used to find out who uses Lanternway.
 */
export async function requestReset(_prev: ResetState, form: FormData): Promise<ResetState> {
  const email = String(form.get("email") ?? "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Please enter your email address.", email };
  const { error } = await auth.requestPasswordReset({ email, redirectTo: `${await origin()}/reset-password` });
  if (error?.status === 429) return { error: "Too many tries. Please wait a minute and try again.", email };
  return { sent: true, email };
}

export async function resetPassword(_prev: ResetState, form: FormData): Promise<ResetState> {
  const token = String(form.get("token") ?? "");
  const newPassword = String(form.get("password") ?? "");
  if (!token) return { error: "This reset link is missing its code. Please request a new link." };
  const problem = passwordProblem(newPassword);
  if (problem) return { error: problem };
  const { error } = await auth.resetPassword({ newPassword, token });
  if (error) {
    return error.status === 400 || /token/i.test(error.code ?? "")
      ? { error: "This reset link has expired or was already used. Please request a new one." }
      : { error: "We couldn't reset your password. Please try again." };
  }
  redirect("/sign-in?reset=1");
}
