import Image from "next/image";
import type { Metadata } from "next";
import { Suspense } from "react";
import { brandImages } from "@/lib/brand";
import { getCheckInFormContext, getToday } from "@/lib/data";
import { formatLongWeekday } from "@/lib/format";
import { CheckInForm } from "./check-in-form";

// Public page for teachers and therapists. No app chrome, no child record —
// only the form. Kept out of search engines and referrer headers.
export const metadata: Metadata = {
  title: "Quick check-in · Lanternway",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function CheckInPage({ params }: PageProps<"/c/[token]">) {
  const { logoLockup } = brandImages;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-8">
      <Image {...logoLockup} alt={logoLockup.alt} className="mb-8 h-auto w-36" loading="eager" />
      <Suspense fallback={<div className="h-96 rounded-2xl bg-cream" />}>
        <CheckIn params={params} />
      </Suspense>
      <p className="mt-auto pt-10 text-center text-xs text-muted-foreground">
        This private link only opens this form. Your answers go to the family who sent it.
      </p>
    </main>
  );
}

async function CheckIn({ params }: { params: PageProps<"/c/[token]">["params"] }) {
  const { token } = await params;
  const [context, today] = await Promise.all([getCheckInFormContext(token), getToday()]);

  if (!context) {
    return (
      <div className="rounded-2xl bg-cream p-6 text-center">
        <h1 className="text-xl font-extrabold">This link isn&apos;t active</h1>
        <p className="mt-2 text-muted-foreground">
          It may have expired or been turned off. If you&apos;d still like to check in, ask the family for a new link.
        </p>
      </div>
    );
  }

  return (
    <CheckInForm
      childFirstName={context.childFirstName}
      respondentName={context.respondentName}
      dateLabel={formatLongWeekday(today)}
    />
  );
}
