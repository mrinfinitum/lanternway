import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ResetPasswordForm } from "../password-forms";

export const metadata: Metadata = { title: "Choose a new password · Lanternway" };

/** Opened from the reset email: ?token=… (or ?error=INVALID_TOKEN if the link expired). */
export default function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  return (
    <>
      <h1 className="mb-1 text-center text-2xl font-extrabold">Choose a new password</h1>
      <p className="mb-5 text-center text-muted-foreground">You&apos;ll be signed out on other devices.</p>
      <Suspense fallback={<div className="h-48 rounded-2xl bg-card" />}>
        <ResetBody searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ResetBody({ searchParams }: { searchParams: PageProps<"/reset-password">["searchParams"] }) {
  const { token, error } = await searchParams;
  if (typeof token !== "string" || !token || error) {
    return (
      <div role="alert" className="space-y-3 rounded-2xl bg-card p-5 ring-1 ring-border">
        <p className="font-bold">This link has expired or was already used.</p>
        <Link href="/forgot-password" className="font-bold text-teal underline underline-offset-4">Request a new link</Link>
      </div>
    );
  }
  return <ResetPasswordForm token={token} />;
}
