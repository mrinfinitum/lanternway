import Image from "next/image";
import { Button } from "@/components/ui/button";
import { brandImages } from "@/lib/brand";

// Temporary landing page until the app shell (BUILD_PLAN Stage 1, section 3).
export default function Home() {
  const { logoLockup, lumiPeeking } = brandImages;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-8 px-6 py-12 text-center">
      <Image {...logoLockup} alt={logoLockup.alt} className="h-auto w-56" priority />
      <div className="rounded-2xl bg-cream p-6">
        <Image {...lumiPeeking} alt={lumiPeeking.alt} className="mx-auto h-auto w-28" loading="eager" />
        <h1 className="mt-4 text-2xl font-bold">
          Your child&apos;s whole journey, in one place.
        </h1>
        <p className="mt-2 text-muted-foreground">
          Lumi from Lanternway is getting things ready. Check back soon.
        </p>
      </div>
      <Button size="lg" className="rounded-full px-6">
        Coming soon
      </Button>
    </main>
  );
}
