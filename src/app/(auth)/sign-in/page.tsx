import type { Metadata } from "next";
import { Suspense } from "react";
import { signIn } from "../actions";
import { RedirectIfSignedIn } from "../already-signed-in";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Sign in · Lanternway" };

export default function SignInPage() {
  return (
    <>
      <Suspense>
        <RedirectIfSignedIn />
      </Suspense>
      <h1 className="mb-1 text-center text-2xl font-extrabold">Welcome back</h1>
      <p className="mb-5 text-center text-muted-foreground">Sign in to your family&apos;s Lanternway.</p>
      <AuthForm mode="sign-in" action={signIn} />
    </>
  );
}
