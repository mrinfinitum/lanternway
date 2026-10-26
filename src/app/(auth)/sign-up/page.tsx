import type { Metadata } from "next";
import { Suspense } from "react";
import { signUp } from "../actions";
import { RedirectIfSignedIn } from "../already-signed-in";
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
        Private by design: no ads, no trackers. In this prototype you&apos;ll see a fictional sample family.
      </p>
      <AuthForm mode="sign-up" action={signUp} />
    </>
  );
}
