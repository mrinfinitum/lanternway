import { Info } from "lucide-react";

/** Shown on every page while the app runs on mock data (Stage 1). */
export function PrototypeBanner() {
  return (
    <p className="flex items-center justify-center gap-2 bg-teal px-4 py-1.5 text-center text-xs font-semibold text-paper print:hidden">
      <Info className="size-3.5 shrink-0" aria-hidden />
      Prototype — sample data. Maya and her family are fictional, and anything you add resets on reload.
    </p>
  );
}
