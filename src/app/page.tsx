import Image from "next/image";
import { Suspense } from "react";
import { DeletedNotice } from "./deleted-notice";
import { brandImages } from "@/lib/brand";
import { LegalLinks } from "@/components/legal-links";
import { IntroCards } from "./intro-cards";

export default function WelcomePage({ searchParams }: PageProps<"/">) {
  const { logoLockup, lumiPeeking } = brandImages;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-6 pt-10 pb-8 text-center">
      <Suspense>
        <DeletedNotice searchParams={searchParams} />
      </Suspense>
      <Image {...logoLockup} alt={logoLockup.alt} className="h-auto w-48" loading="eager" />
      <Image
        {...lumiPeeking}
        alt={lumiPeeking.alt}
        className="mt-8 h-auto w-28"
        loading="eager"
      />
      <p className="mt-4 text-sm font-semibold text-muted-foreground">
        Hi! I&apos;m Lumi from Lanternway.
      </p>
      <IntroCards />
      <LegalLinks className="mt-8 justify-center" />
    </main>
  );
}
