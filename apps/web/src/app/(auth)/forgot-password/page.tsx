import type { Metadata } from "next";
import { ForgotPasswordForm } from "../password-forms";

export const metadata: Metadata = { title: "Reset your password · Lanternway" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="mb-1 text-center text-2xl font-extrabold">Forgot your password?</h1>
      <p className="mb-5 text-center text-muted-foreground">Enter your email and we&apos;ll send you a link to choose a new one.</p>
      <ForgotPasswordForm />
    </>
  );
}
