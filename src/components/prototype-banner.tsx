import { Info } from "lucide-react";

/** Shown on every page while the app runs on mock data (Stage 1). */
export function PrototypeBanner() {
  return (
    <p className="flex items-center justify-center gap-2 bg-teal px-4 py-1.5 text-center text-xs font-semibold text-paper print:hidden">
      <Info className="size-3.5 shrink-0" aria-hidden />
      Test version. Everything you add for your own kids is saved to your account. Teacher check-ins are still sample data.
    </p>
  );
}
