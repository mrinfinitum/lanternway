import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL, POLICY_VERSIONS } from "@/lib/policies";

export const metadata: Metadata = { title: "Consumer Health Data Privacy Policy · Lanternway" };

export default function HealthDataPrivacyPage() {
  return (
    <>
      <h1>Consumer Health Data Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">
        Version {POLICY_VERSIONS.healthData} · Effective {LEGAL.effectiveDate} · {LEGAL.entity}
      </p>

      <p>
        Some states, including Washington (My Health My Data Act), Nevada, and Connecticut, give you specific rights over
        &ldquo;consumer health data.&rdquo; This policy explains how Lanternway handles it. It adds to our{" "}
        <Link href="/privacy" className="font-semibold underline underline-offset-4">
          Privacy Policy
        </Link>
        .
      </p>

      <h2>Health data we collect</h2>
      <p>Only what you choose to enter about your child, for example:</p>
      <ul>
        <li>Diagnoses and when they were made</li>
        <li>Medications, doses, changes, and what you noticed afterward</li>
        <li>Allergies</li>
        <li>Therapy providers, goals, and session notes</li>
        <li>Communication, sensory needs, what&apos;s hard, and what helps</li>
        <li>Daily logs such as mood, sleep, appetite, and hard moments</li>
        <li>School support plans (IEP or 504), goals, and services</li>
      </ul>

      <h2>Where it comes from</h2>
      <ul>
        <li>You, the parent or guardian, and family members you invite.</li>
        <li>People you ask for input, such as a teacher using a check-in link you sent.</li>
      </ul>

      <h2>Why we collect it and how we use it</h2>
      <p>
        Only to provide Lanternway to you: keeping your child&apos;s records, showing timelines, and making the summaries you
        request. We collect it only with your consent, which we ask for when you create your account. We don&apos;t use it for
        advertising, we don&apos;t sell it, and we don&apos;t use location data or geofencing.
      </p>

      <h2>Who we share it with</h2>
      <ul>
        <li>
          <strong>People you choose.</strong> We ask for your separate consent each time before you share it, and you choose
          exactly what&apos;s included.
        </li>
        <li>
          <strong>Our service providers</strong> (Neon for the database and sign-in, Vercel for hosting, Resend for account
          emails), only to run Lanternway for you, under contracts that forbid other uses.
        </li>
      </ul>
      <p>We do not sell consumer health data.</p>

      <h2>Your rights</h2>
      <ul>
        <li>Confirm whether we have your health data, see it, and download it (Account &amp; privacy → Download my data).</li>
        <li>See the list of companies we share it with (above).</li>
        <li>Withdraw your consent and delete your health data (Account &amp; privacy → Delete my account).</li>
        <li>Appeal if we turn down a request, by emailing {LEGAL.privacyEmail}.</li>
      </ul>

      <h2>Contact</h2>
      <p>
        {LEGAL.entity}, {LEGAL.address}. Email: {LEGAL.privacyEmail}.
      </p>
    </>
  );
}
