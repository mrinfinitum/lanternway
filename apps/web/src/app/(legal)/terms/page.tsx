import type { Metadata } from "next";
import Link from "next/link";
import { DISCLAIMER } from "@/components/disclaimer";
import { LEGAL, POLICY_VERSIONS } from "@/lib/policies";

export const metadata: Metadata = { title: "Terms of Use · Lanternway" };

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Use</h1>
      <p className="text-sm text-muted-foreground">
        Version {POLICY_VERSIONS.terms} · Effective {LEGAL.effectiveDate} · {LEGAL.entity}
      </p>

      <h2>The short version</h2>
      <ul>
        <li>Lanternway helps you keep your child&apos;s information organized. It is not medical, legal, or therapeutic advice.</li>
        <li>Your family&apos;s information is yours. We only use it to run Lanternway for you.</li>
        <li>This is a test version. Things may change, break, or be reset. Please use made-up details while testing.</li>
      </ul>

      <h2>Not medical advice</h2>
      <p>
        {DISCLAIMER} Never change a medication, treatment, or plan based on Lanternway. Talk to your child&apos;s doctor or care
        team. In an emergency, call 911 or your local emergency number.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must be 18 or older and a parent or legal guardian of the children you add, or have their permission.</li>
        <li>Keep your password private. You&apos;re responsible for activity in your account.</li>
        <li>Only share information you have the right to share.</li>
      </ul>

      <h2>Your information</h2>
      <p>
        You own what you put into Lanternway. You give us permission to store and process it only to provide the service to
        you, as described in our{" "}
        <Link href="/privacy" className="font-semibold underline underline-offset-4">
          Privacy Policy
        </Link>
        . You can download or delete it at any time.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Don&apos;t use Lanternway to harm, harass, or collect information about other people&apos;s children.</li>
        <li>Don&apos;t try to access another family&apos;s information or break Lanternway&apos;s security.</li>
      </ul>

      <h2>Test version</h2>
      <p>
        Lanternway is in testing and is provided &ldquo;as is.&rdquo; Features may change or be removed, and test data may be
        reset. {"[Warranty disclaimer and limitation of liability to be written by counsel.]"}
      </p>

      <h2>Ending your account</h2>
      <p>
        You can delete your account at any time. We may suspend accounts that break these terms. We&apos;ll tell you if we
        do, unless we can&apos;t.
      </p>

      <h2>Changes and contact</h2>
      <p>
        If we change these terms in a meaningful way, we&apos;ll tell you in the app first. These terms are governed by the laws
        of {LEGAL.governingLaw}. Questions: {LEGAL.privacyEmail}.
      </p>
    </>
  );
}
