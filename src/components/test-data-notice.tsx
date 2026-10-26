import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shown while Lanternway is a test version without a privacy policy, terms, or
 * consent flow: ask testers not to enter real information about their kids.
 */
export function TestDataNotice({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div role="note" className={cn("flex items-start gap-3 rounded-2xl bg-amber/25 p-3 text-left text-sm ring-1 ring-amber/50", className)}>
      <FlaskConical className="mt-0.5 size-5 shrink-0" aria-hidden />
      <p>
        <span className="font-bold">This is a test version.</span>{" "}
        {compact
          ? "Please use a made-up name and details, not real information about your child."
          : "Please use made-up names and details for your child, not real medical, school, or family information. Real accounts and privacy protections come before launch."}
      </p>
    </div>
  );
}
