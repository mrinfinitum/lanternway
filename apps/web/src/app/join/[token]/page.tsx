import Image from "next/image";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { getSignedInUser } from "@/lib/auth/server";
import { brandImages } from "@/lib/brand";
import { previewInvite, roleDescriptions } from "@/lib/sharing";
import { JoinButtons } from "./join-buttons";

// Public page for a family invite. Shows who sent it and what the role allows,
// nothing about the family or its children until the person has joined.
export const metadata: Metadata = {
  title: "Join a family · Lanternway",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function JoinPage({ params }: PageProps<"/join/[token]">) {
  const { logoLockup } = brandImages;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-8">
      <Image {...logoLockup} alt={logoLockup.alt} className="mb-8 h-auto w-36" loading="eager" />
      <Suspense fallback={<div className="h-64 rounded-2xl bg-card" />}>
        <Invite params={params} />
      </Suspense>
      <p className="mt-auto pt-10 text-center text-xs text-muted-foreground">
        Lanternway is a record-keeping tool and does not provide medical advice.
      </p>
    </main>
  );
}

async function Invite({ params }: { params: PageProps<"/join/[token]">["params"] }) {
  const { token } = await params;
  await connection(); // private, per-link page: never prerendered
  const [invite, user] = await Promise.all([previewInvite(token), getSignedInUser()]);

  if (!invite || invite.status !== "open") {
    return (
      <div className="rounded-2xl bg-card p-6 text-center ring-1 ring-border">
        <h1 className="text-xl font-extrabold">This invite isn&apos;t active</h1>
        <p className="mt-2 text-muted-foreground">
          {invite?.status === "used"
            ? "It has already been used. Each invite works once."
            : "It may have expired or been turned off."}{" "}
          Ask the person who sent it for a new one.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-2xl bg-card p-6 ring-1 ring-border">
      <div>
        <h1 className="text-2xl font-extrabold">{invite.inviterName} invited you to their family on Lanternway</h1>
        <p className="mt-2 text-muted-foreground">
          Lanternway keeps a child&apos;s daily logs, medications, therapy and school records in one place.
        </p>
      </div>
      <div className="rounded-xl bg-white p-4 ring-1 ring-border">
        <p className="text-sm text-muted-foreground">What you&apos;ll be able to do</p>
        <p className="font-bold">{roleDescriptions[invite.role]}</p>
      </div>
      <JoinButtons token={token} signedInAs={user?.email ?? null} />
    </div>
  );
}
