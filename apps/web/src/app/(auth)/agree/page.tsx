import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSignedInUser } from "@/lib/auth/server";
import { hasAccountConsents } from "@/lib/consents";
import { signOut } from "../actions";
import { AgreeForm } from "./agree-form";

export const metadata: Metadata = { title: "Before you start · Lanternway" };

/** Already agreed (or signed out): nothing to do here. */
async function RedirectIfDone() {
  const user = await getSignedInUser();
  if (!user) redirect("/sign-in");
  if (await hasAccountConsents(user.id)) redirect("/home");
  return null;
}

export default function AgreePage() {
  return (
    <>
      <Suspense>
        <RedirectIfDone />
      </Suspense>
      <h1 className="mb-1 text-center text-2xl font-extrabold">Before you start</h1>
      <p className="mb-5 text-center text-muted-foreground">Please read and tick each box. We keep a record of what you agreed to.</p>
      <AgreeForm />
      <form action={signOut} className="mt-4 text-center">
        <button type="submit" className="text-sm font-bold text-teal underline-offset-4 hover:underline">
          Sign out instead
        </button>
      </form>
    </>
  );
}
