import Image from "next/image";
import { brandImages } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** A gentle note from Lumi. For tips and empty states — never advice. */
export function LumiTip({
  children,
  title = "Lumi from Lanternway",
  className,
}: {
  children: React.ReactNode;
  title?: string;
  className?: string;
}) {
  const { lumiHead } = brandImages;
  return (
    <div className={cn("flex items-start gap-3 rounded-2xl bg-amber/20 p-4", className)}>
      <Image {...lumiHead} alt="" className="h-auto w-10 shrink-0" />
      <div className="text-sm">
        <p className="font-bold">{title}</p>
        <div className="mt-0.5 text-teal/90">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  const { lumiFull } = brandImages;
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
      <Image {...lumiFull} alt="" className="h-auto w-12 opacity-90" />
      <div>{children}</div>
    </div>
  );
}
