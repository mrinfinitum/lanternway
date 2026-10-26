import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { VERIFY_COOKIE } from "../verify-cookie";
import { VerifyForm } from "./verify-form";

export const metadata: Metadata = { title: "Confirm your email · Lanternway" };

export default function VerifyEmailPage() {
  return (
    <>
      <h1 className="mb-1 text-center text-2xl font-extrabold">Check your email</h1>
      <Suspense fallback={<div className="h-56 rounded-2xl bg-card" />}>
        <VerifyBody />
      </Suspense>
    </>
  );
}

async function VerifyBody() {
  const email = (await cookies()).get(VERIFY_COOKIE)?.value;
  if (!email) {
    return (
      <div className="mt-4 space-y-3 rounded-2xl bg-card p-5 text-center ring-1 ring-border">
        <p>This page timed out.</p>
        <Link href="/sign-in" className="font-bold text-teal underline underline-offset-4">Sign in to get a new code</Link>
      </div>
    );
  }
  return (
    <>
      <p className="mb-5 text-center text-muted-foreground">
        We sent a 6-digit code to <strong className="text-teal">{email}</strong>. Enter it below to confirm it&apos;s you.
      </p>
      <VerifyForm />
    </>
  );
}
