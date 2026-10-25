import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export const DISCLAIMER =
  "Lanternway is a record-keeping tool and does not provide medical advice.";

export function Disclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-start gap-2 text-xs text-muted-foreground", className)}>
      <ShieldCheck className="mt-px size-4 shrink-0" aria-hidden />
      {DISCLAIMER}
    </p>
  );
}
