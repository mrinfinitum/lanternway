import Image from "next/image";
import Link from "next/link";
import { brandImages } from "@/lib/brand";
import { POLICIES_ARE_DRAFTS } from "@/lib/policies";
import { LegalLinks } from "@/components/legal-links";

/** Privacy policy, terms, and health data policy: readable, public, no app chrome. */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  const { logoLockup } = brandImages;
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-8 pb-12">
      <Link href="/" className="inline-block">
        <Image {...logoLockup} alt={logoLockup.alt} className="h-auto w-36" loading="eager" />
      </Link>
      {POLICIES_ARE_DRAFTS && (
        <p role="note" className="mt-6 rounded-2xl bg-coral/15 p-3 text-sm ring-1 ring-coral/40">
          <strong>Draft for legal review.</strong> This describes how the Lanternway test version works today. It is not
          final and is being reviewed by a lawyer. Bracketed items are still to be filled in.
        </p>
      )}
      <article className="legal mt-6 space-y-4 leading-relaxed [&_h1]:text-3xl [&_h1]:font-extrabold [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-extrabold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
        {children}
      </article>
      <LegalLinks className="mt-10" />
    </main>
  );
}
