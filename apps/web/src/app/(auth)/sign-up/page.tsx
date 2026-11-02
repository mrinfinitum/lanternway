import type { Metadata } from "next";
import { Suspense } from "react";
import { signUp } from "../actions";
import { RedirectIfSignedIn } from "../already-signed-in";
import { TestDataNotice } from "@/components/test-data-notice";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Create an account · Lanternway" };

export default function SignUpPage() {
  return (
    <>
      <Suspense>
        <RedirectIfSignedIn />
      </Suspense>
      <h1 className="mb-1 text-center text-2xl font-extrabold">Create your account</h1>
      <p className="mb-5 text-center text-muted-foreground">
        Private by design: your family&apos;s information is only visible to you. No ads, no trackers.
      </p>
      <TestDataNotice className="mb-4" />
      <AuthForm mode="sign-up" action={signUp} />
    </>
  );
}
