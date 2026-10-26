import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Download, ShieldCheck } from "lucide-react";
import { LegalLinks } from "@/components/legal-links";
import { PageHeader, SectionHeading } from "@/components/page-header";
import { getSignedInUser } from "@/lib/auth/server";
import { listConsents, type ConsentKind } from "@/lib/consents";
import { ChangePasswordForm, DeleteAccountForm, SignOutEverywhereButton } from "./account-forms";

// Reads the signed-in session, so navigations wait for the server (see app layout).
export const instant = false;

export const metadata: Metadata = { title: "Account & privacy · Lanternway" };

const consentLabels: Record<ConsentKind, string> = {
  adult_guardian: "Confirmed you're 18+ and a parent or guardian",
  terms: "Agreed to the Terms of Use",
  privacy: "Agreed to the Privacy Policy",
  health_data_collection: "Consented to storing health information",
  test_data: "Agreed to use made-up details while testing",
  share_profile: "Consented to share an About Me",
  share_checkin: "Asked someone for check-ins about your child",
};

const box = "space-y-3 rounded-2xl bg-card p-4 ring-1 ring-border sm:p-5";

export default async function AccountPage() {
  const user = await getSignedInUser();
  if (!user) redirect("/sign-in");
  const consents = await listConsents(user.id);
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Account & privacy" description="Your account, your data, and what you've agreed to." />

      <section aria-labelledby="acct" className={box}>
        <SectionHeading id="acct">Your account</SectionHeading>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Name</dt><dd className="font-semibold">{user.name || "—"}</dd></div>
          <div><dt className="text-muted-foreground">Email</dt><dd className="font-semibold break-all">{user.email}</dd></div>
        </dl>
      </section>

      <section aria-labelledby="data" className={box}>
        <SectionHeading id="data">Your data</SectionHeading>
        <p className="text-sm">Download everything Lanternway stores for your account: your family, your kids&apos; profiles, logs, medications, care team, school records, and your consent records.</p>
        <a href="/api/account/export" className="inline-flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/80">
          <Download className="size-4" aria-hidden /> Download my data
        </a>
      </section>

      <section aria-labelledby="security" className={box}>
        <SectionHeading id="security">Security</SectionHeading>
        <ChangePasswordForm />
        <div className="border-t pt-3">
          <p className="mb-2 text-sm">Lost a phone or used a shared computer? Sign out everywhere, including here.</p>
          <SignOutEverywhereButton />
        </div>
        <p className="text-xs text-muted-foreground">Two-step sign-in isn&apos;t available yet. It&apos;s on our list.</p>
      </section>

      <section aria-labelledby="consents" className={box}>
        <SectionHeading id="consents">What you&apos;ve agreed to</SectionHeading>
        {consents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No agreements recorded yet.</p>
        ) : (
          <ul className="divide-y text-sm">
            {consents.map((c, i) => (
              <li key={i} className="flex items-start gap-2 py-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  <span className="font-semibold">{consentLabels[c.kind] ?? c.kind}</span>
                  <span className="block text-xs text-muted-foreground">
                    {fmt(c.grantedAt)} · version {c.policyVersion}
                    {c.kind === "share_profile" && Array.isArray(c.details.sections) && ` · ${(c.details.sections as string[]).length} sections`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <LegalLinks />
      </section>

      <section aria-labelledby="delete" className={box}>
        <SectionHeading id="delete">Delete your account</SectionHeading>
        <DeleteAccountForm />
      </section>
    </div>
  );
}
