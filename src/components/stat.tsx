import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  unit,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl bg-cream p-4", className)}>
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">
        {value}
        {unit && <span className="ml-1 text-sm font-semibold text-muted-foreground">{unit}</span>}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
