import Image from "next/image";
import { Cake, Heart, MessageCircleHeart, Sparkles, type LucideIcon } from "lucide-react";
import { brandImages } from "@/lib/brand";
import { formatDate } from "@/lib/format";
import { communicationStyleLabels } from "@/lib/labels";
import type { Child } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChildAvatar } from "../_components/child-avatar";

/** Big, friendly introduction: avatar, name, fun facts, and the intro in the child's own voice. */
export function ProfileHero({ child, age, action }: { child: Child; age: number; action?: React.ReactNode }) {
  const { lumiPeeking } = brandImages;
  return (
    <section
      aria-labelledby="hero-name"
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber/30 via-card to-coral/15 p-5 ring-1 ring-border sm:p-7"
    >
      {action && <div className="absolute top-3 right-3 z-10">{action}</div>}
      <Image
        {...lumiPeeking}
        alt=""
        className="pointer-events-none absolute -right-2 -bottom-1 h-auto w-20 opacity-90 sm:w-24"
      />
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
        <span className="rounded-full bg-white p-1.5 shadow-sm ring-4 ring-amber/60">
          <ChildAvatar child={child} size={96} />
        </span>
        <div>
          <p className="text-sm font-bold tracking-wide text-teal/80 uppercase">All about me</p>
          <h2 id="hero-name" className="text-3xl font-extrabold sm:text-4xl">
            {child.firstName}
          </h2>
          <ul className="mt-2 flex flex-wrap justify-center gap-2 text-sm font-semibold sm:justify-start" aria-label="Quick facts">
            <li className="rounded-full bg-white px-3 py-1 ring-1 ring-border">Age {age}</li>
            {child.pronouns && <li className="rounded-full bg-white px-3 py-1 ring-1 ring-border">{child.pronouns}</li>}
            {child.school?.grade && <li className="rounded-full bg-white px-3 py-1 ring-1 ring-border">{child.school.grade}</li>}
            <li className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 ring-1 ring-border">
              <Cake className="size-3.5" aria-hidden /> {formatDate(child.birthDate).replace(/, \d{4}$/, "")}
            </li>
          </ul>
        </div>
      </div>
      {child.aboutMe && (
        <figure className="relative mt-5 mr-14 sm:mr-24">
          <span aria-hidden className="absolute -top-2 left-8 size-4 rotate-45 bg-white ring-1 ring-border [clip-path:polygon(0_0,100%_0,0_100%)]" />
          <blockquote className="relative rounded-2xl bg-white px-4 py-3 text-base leading-relaxed shadow-sm ring-1 ring-border">
            {child.aboutMe}
          </blockquote>
          <figcaption className="mt-1.5 pl-2 text-xs font-semibold text-teal/80">In {child.firstName}&apos;s words</figcaption>
        </figure>
      )}
    </section>
  );
}

/** Three things a new teacher or sitter can take in at a glance. */
export function QuickLook({ child }: { child: Child }) {
  const tiles: { icon: LucideIcon; label: string; value?: string; tint: string }[] = [
    { icon: MessageCircleHeart, label: "Talks with", value: communicationStyleLabels[child.communicationStyle], tint: "bg-teal/10" },
    { icon: Heart, label: "Loves", value: child.likes[0], tint: "bg-coral/20" },
    { icon: Sparkles, label: "Helps most", value: child.calmingStrategies[0], tint: "bg-amber/30" },
  ];
  return (
    <section aria-labelledby="quick-look">
      <h2 id="quick-look" className="sr-only">
        Quick look
      </h2>
      <ul className="grid gap-3 sm:grid-cols-3">
        {tiles
          .filter((t) => t.value)
          .map(({ icon: Icon, label, value, tint }) => (
            <li key={label} className="flex items-center gap-3 rounded-2xl bg-card p-3 ring-1 ring-border">
              <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", tint)}>
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block text-xs font-semibold text-muted-foreground">{label}</span>
                <span className="block font-bold">{value}</span>
              </span>
            </li>
          ))}
      </ul>
    </section>
  );
}

type Accent = "amber" | "coral" | "teal" | "cream";
const accentTint: Record<Accent, string> = {
  amber: "bg-amber/30",
  coral: "bg-coral/20",
  teal: "bg-teal/10",
  cream: "bg-cream",
};
const accentDot: Record<Accent, string> = {
  amber: "bg-amber",
  coral: "bg-coral",
  teal: "bg-teal/70",
  cream: "bg-amber/60",
};

/** A profile section card with its own icon and color. */
export function ProfileSection({
  id,
  icon: Icon,
  title,
  accent,
  className,
  action,
  children,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  accent: Accent;
  className?: string;
  /** e.g. an Edit button, shown at the right of the heading. */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={cn("rounded-2xl bg-card p-4 ring-1 ring-border sm:p-5", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 id={id} className="flex items-center gap-2.5 text-lg font-extrabold">
          <span className={cn("flex size-9 items-center justify-center rounded-full", accentTint[accent])}>
            <Icon className="size-4.5" aria-hidden />
          </span>
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Items as soft chips: good for short things like loves. */
export function ChipList({ items, accent, empty }: { items: string[]; accent: Accent; empty?: string }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{empty ?? "Nothing added yet."}</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((i) => (
        <li key={i} className={cn("rounded-full px-3 py-1.5 text-sm font-semibold", accentTint[accent])}>
          {i}
        </li>
      ))}
    </ul>
  );
}

/** Items with a colored dot, or a small icon. Good for longer sentences. */
export function DotList({ items, accent, icon: Icon, empty }: { items: string[]; accent: Accent; icon?: LucideIcon; empty?: string }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{empty ?? "Nothing added yet."}</p>;
  return (
    <ul className="space-y-2 text-sm">
      {items.map((i) => (
        <li key={i} className="flex items-start gap-2.5 rounded-xl bg-white px-3 py-2">
          {Icon ? (
            <Icon className="mt-0.5 size-4 shrink-0 text-teal" aria-hidden />
          ) : (
            <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", accentDot[accent])} />
          )}
          <span>{i}</span>
        </li>
      ))}
    </ul>
  );
}

