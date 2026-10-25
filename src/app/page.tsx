import Image from "next/image";
import { brandImages } from "@/lib/brand";
import { IntroCards } from "./intro-cards";

export default function WelcomePage() {
  const { logoLockup, lumiPeeking } = brandImages;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-6 pt-10 pb-8 text-center">
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
    </main>
  );
}
