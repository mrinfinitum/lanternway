import Image from "next/image";
import Link from "next/link";
import { brandImages } from "@/lib/brand";

/** Sign in / sign up: calm, centered, no app chrome. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { logoLockup, lumiPeeking } = brandImages;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-10 pb-10">
      <Link href="/" className="mx-auto">
        <Image {...logoLockup} alt={logoLockup.alt} className="h-auto w-44" loading="eager" />
      </Link>
      <Image {...lumiPeeking} alt="" className="mx-auto mt-6 h-auto w-20" loading="eager" />
      <div className="mt-4">{children}</div>
    </main>
  );
}
