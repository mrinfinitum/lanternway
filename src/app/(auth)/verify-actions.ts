"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { VERIFY_COOKIE } from "./verify-cookie";

export type VerifyState = { error?: string; resent?: boolean } | null;

async function pendingEmail(): Promise<string | null> {
  return (await cookies()).get(VERIFY_COOKIE)?.value ?? null;
}

/** Check the 6-digit code. On success the person is signed in and lands in the app. */
export async function verifyCode(_prev: VerifyState, form: FormData): Promise<VerifyState> {
  const email = await pendingEmail();
  if (!email) return { error: "This page timed out. Please sign in again to get a new code." };
  const otp = String(form.get("code") ?? "").replace(/\D/g, "");
  if (otp.length !== 6) return { error: "Please enter the 6-digit code from the email." };

  const { error } = await auth.emailOtp.verifyEmail({ email, otp });
  if (error) {
    const code = (error.code ?? "").toLowerCase();
    if (error.status === 429 || code.includes("too_many")) return { error: "Too many tries. Please request a new code." };
    if (code.includes("expired")) return { error: "That code has expired. Please request a new one." };
    return { error: "That code doesn't match. Please check the email and try again." };
  }
  (await cookies()).delete(VERIFY_COOKIE);
  redirect("/home");
}

export async function resendCode(): Promise<VerifyState> {
  const email = await pendingEmail();
  if (!email) return { error: "This page timed out. Please sign in again to get a new code." };
  const { error } = await auth.emailOtp.sendVerificationOtp({ email, type: "email-verification" });
  if (error?.status === 429) return { error: "Please wait a minute before asking for another code." };
  return { resent: true };
}
