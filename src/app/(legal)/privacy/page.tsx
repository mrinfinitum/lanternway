import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL, POLICY_VERSIONS } from "@/lib/policies";

export const metadata: Metadata = { title: "Privacy Policy · Lanternway" };

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">
        Version {POLICY_VERSIONS.privacy} · Effective {LEGAL.effectiveDate} · {LEGAL.entity}
      </p>

      <p>
        Lanternway helps parents and caregivers keep their child&apos;s information in one place. Your family&apos;s information
        is private by design: <strong>we don&apos;t sell it, we don&apos;t show ads, and we don&apos;t use ad trackers or
        third-party analytics.</strong> This policy explains, in plain English, what we collect, why, who can see it, and the
        choices you have.
      </p>

      <h2>Who this is for</h2>
      <p>
        Lanternway is for adults (18+) who are a parent or legal guardian of the children they add, or who have their
        permission. Children don&apos;t have accounts. We don&apos;t knowingly collect information directly from children.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your account:</strong> your first name, email address, and password (stored by our sign-in provider as a
          one-way hash; we never see it).
        </li>
        <li>
          <strong>Information you add about your child:</strong> name, birthday, pronouns, school and grade, interests,
          strengths, how they communicate, sensory needs, what&apos;s hard and what helps, daily routines, and anything else
          you write in their profile. If you choose to add them: diagnoses, medications, allergies, therapy and school
          records, daily logs, and emergency contacts. Some of this is <strong>health information</strong>; see our{" "}
          <Link href="/health-data-privacy" className="font-semibold underline underline-offset-4">
            Consumer Health Data Privacy Policy
          </Link>
          .
        </li>
        <li>
          <strong>Your choices and consents:</strong> what you agreed to, which version, and when.
        </li>
        <li>
          <strong>Technical basics:</strong> cookies that keep you signed in and remember which child you&apos;re viewing.
          These are strictly necessary; we don&apos;t use advertising or analytics cookies.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To run Lanternway for you: show your child&apos;s profile, timeline, and records, and make the summaries you ask for.</li>
        <li>To keep your account secure and send account emails (like verifying your email or resetting your password).</li>
        <li>To fix problems and keep the service running.</li>
      </ul>
      <p>
        We don&apos;t use your family&apos;s information for advertising, we don&apos;t sell it, and we don&apos;t use it to
        train AI models. Lanternway is a record-keeping tool and does not provide medical advice.
      </p>

      <h2>Who can see it</h2>
      <ul>
        <li>
          <strong>You,</strong> and people you invite to your family account (when that feature launches), with the access level
          you choose.
        </li>
        <li>
          <strong>People you choose to share with:</strong> for example, a one-page About Me you send to a teacher, or a
          check-in link. You pick what&apos;s included, we ask for your consent before sharing, and you can turn links off.
        </li>
        <li>
          <strong>Service providers</strong> that run Lanternway for us, under contracts that limit their use of your data:
          Neon (database and sign-in, United States), Vercel (hosting, United States), and Resend (account emails). They may
          not use your information for their own purposes.
        </li>
        <li>
          <strong>When the law requires it,</strong> for example a valid court order. We&apos;ll tell you unless we&apos;re not
          allowed to.
        </li>
      </ul>

      <h2>How long we keep it</h2>
      <p>
        We keep your information until you delete it or delete your account. When you delete your account, we delete your
        family&apos;s information right away. Our database keeps a short recovery history, so deleted information is fully
        gone from it within 6 hours.
      </p>

      <h2>Your choices and rights</h2>
      <ul>
        <li>
          <strong>See and download</strong> your information at any time from{" "}
          <Link href="/account" className="font-semibold underline underline-offset-4">
            Account &amp; privacy
          </Link>
          .
        </li>
        <li>
          <strong>Correct</strong> anything by editing it in the app.
        </li>
        <li>
          <strong>Delete</strong> your account and your family&apos;s information from Account &amp; privacy.
        </li>
        <li>
          <strong>Withdraw consent</strong> to sharing at any time. Withdrawing consent to storing health information means
          deleting that information or your account.
        </li>
        <li>
          Depending on where you live, you may have more rights. Contact us at {LEGAL.privacyEmail} and we&apos;ll respond within
          the time the law requires. We won&apos;t treat you differently for using your rights.
        </li>
      </ul>

      <h2>Security</h2>
      <p>
        Information is encrypted in transit and at rest. Each family&apos;s information is separated at the database level, so
        one family can never see another&apos;s. Access by our team is limited to what&apos;s needed to run and support the
        service. No system is perfectly secure; if a breach affects your information, we&apos;ll notify you and the
        authorities as the law requires.
      </p>

      <h2>Changes</h2>
      <p>
        If we change this policy in a meaningful way, we&apos;ll tell you in the app before it takes effect and, where needed,
        ask for your consent again.
      </p>

      <h2>Contact</h2>
      <p>
        {LEGAL.entity}, {LEGAL.address}. Email: {LEGAL.privacyEmail}.
      </p>
    </>
  );
}
