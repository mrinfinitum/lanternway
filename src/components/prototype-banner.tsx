import { Info } from "lucide-react";

/** Shown on every page while the app runs on mock data (Stage 1). */
export function PrototypeBanner() {
  return (
    <p className="flex items-center justify-center gap-2 bg-teal px-4 py-1.5 text-center text-xs font-semibold text-paper print:hidden">
      <Info className="size-3.5 shrink-0" aria-hidden />
      Prototype. Your kids and their About Me are saved to your account; logs, medications, therapy, and school changes still reset on reload.
    </p>
  );
}
