import type { Metadata } from "next";
import { Suspense } from "react";
import { signIn } from "../actions";
import { RedirectIfSignedIn } from "../already-signed-in";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Sign in · Lanternway" };

async function ResetNotice({ searchParams }: { searchParams: PageProps<"/sign-in">["searchParams"] }) {
  const { reset } = await searchParams;
  if (reset !== "1") return null;
  return (
    <p role="status" className="mb-4 rounded-2xl bg-amber/25 p-3 text-sm font-semibold ring-1 ring-amber/50">
      Your password was changed. Sign in with your new password.
    </p>
  );
}

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <>
      <Suspense>
        <RedirectIfSignedIn />
      </Suspense>
      <h1 className="mb-1 text-center text-2xl font-extrabold">Welcome back</h1>
      <p className="mb-5 text-center text-muted-foreground">Sign in to your family&apos;s Lanternway.</p>
      <Suspense>
        <ResetNotice searchParams={searchParams} />
      </Suspense>
      <AuthForm mode="sign-in" action={signIn} />
    </>
  );
}
