import Link from "next/link";
import { cn } from "@/lib/utils";

/** Links to the policies, for footers, sign-up, and the account page. */
export function LegalLinks({ className }: { className?: string }) {
  return (
    <nav aria-label="Legal" className={cn("flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-muted-foreground", className)}>
      <Link href="/privacy" className="underline-offset-4 hover:underline">
        Privacy Policy
      </Link>
      <Link href="/health-data-privacy" className="underline-offset-4 hover:underline">
        Consumer Health Data Privacy Policy
      </Link>
      <Link href="/terms" className="underline-offset-4 hover:underline">
        Terms of Use
      </Link>
    </nav>
  );
}
