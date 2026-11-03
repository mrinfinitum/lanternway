import { ShieldCheck } from "lucide-react";
import { DISCLAIMER } from "@lanternway/shared/disclaimer";
import { cn } from "@/lib/utils";

export { DISCLAIMER };

export function Disclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-start gap-2 text-xs text-muted-foreground", className)}>
      <ShieldCheck className="mt-px size-4 shrink-0" aria-hidden />
      {DISCLAIMER}
    </p>
  );
}
