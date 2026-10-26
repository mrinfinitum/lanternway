import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { brandImages } from "@/lib/brand";
import { getSignedInUser } from "@/lib/auth/server";
import { getChildren, getCurrentChildOrNull, getToday, isSampleFamily } from "@/lib/data";
import { ageOn } from "@/lib/dates";
import { ChildSwitcher } from "./child-switcher";

export function AppHeader() {
  const { logoLockup } = brandImages;

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur print:hidden">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 md:px-8">
        <Link href="/home" className="md:invisible">
          <Image {...logoLockup} alt={logoLockup.alt} className="h-auto w-32" loading="eager" />
        </Link>
        <Suspense fallback={<div className="h-12 w-36 rounded-full bg-card" />}>
          <CurrentChild />
        </Suspense>
      </div>
    </header>
  );
}

/** Reads the current-child cookie, so it streams in after the static header. */
async function CurrentChild() {
  const [kids, current, today, user, sample] = await Promise.all([
    getChildren(),
    getCurrentChildOrNull(),
    getToday(),
    getSignedInUser(),
    isSampleFamily(),
  ]);
  const summaries = kids.map((k) => ({
    id: k.id,
    firstName: k.firstName,
    age: ageOn(k.birthDate, today),
    photoUrl: k.photoUrl,
  }));
  return (
    <ChildSwitcher
      kids={summaries}
      currentId={current?.id ?? null}
      user={user ? { name: user.name, email: user.email } : null}
      sample={sample}
    />
  );
}
