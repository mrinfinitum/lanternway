import Link from "next/link";
import type { Metadata } from "next";
import { LegalLinks } from "@/components/legal-links";
import { ChevronRight, ShieldCheck, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { moreItems } from "../_components/nav-items";

// Reads the signed-in session, so navigations wait for the server (see app layout).
export const instant = false;

export const metadata: Metadata = { title: "More · Lanternway" };

const descriptions: Record<string, string> = {
  "/medications": "Doses, changes, refills, and how days looked around each change",
  "/therapy": "Providers, goals, and session notes",
  "/about-me": "Profile and a shareable one-page summary",
  "/reports": "Summaries for doctor visits, IEP meetings, and therapists",
};

export default function MorePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="More" />
      <ul className="space-y-2">
        {[...moreItems, { href: "/", label: "Welcome tour", icon: Sparkles }].map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className="flex items-center gap-4 rounded-2xl bg-cream p-4 transition-colors hover:bg-amber/25">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold">{label}</span>
                <span className="block text-sm text-muted-foreground">{descriptions[href] ?? "See Lumi's intro again"}</span>
              </span>
              <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/account"
        className="mt-3 flex items-center gap-4 rounded-2xl bg-cream p-4 transition-colors hover:bg-amber/25"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white">
          <ShieldCheck className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">Account &amp; privacy</span>
          <span className="block text-sm text-muted-foreground">Download your data, password, what you&apos;ve agreed to, delete account</span>
        </span>
        <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
      </Link>
      <LegalLinks className="mt-8 justify-center" />
    </div>
  );
}
