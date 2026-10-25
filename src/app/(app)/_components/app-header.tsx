import Image from "next/image";
import Link from "next/link";
import { ageOn } from "@/lib/dates";
import { brandImages } from "@/lib/brand";
import type { Child, IsoDate } from "@/lib/types";

export function AppHeader({ child, today }: { child: Child; today: IsoDate }) {
  const { logoLockup } = brandImages;

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur print:hidden">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 md:px-8">
        <Link href="/home" className="md:invisible">
          <Image {...logoLockup} alt={logoLockup.alt} className="h-auto w-32" loading="eager" />
        </Link>
        <Link
          href="/about-me"
          className="flex items-center gap-3 rounded-full py-1 pr-1 pl-3 transition-colors hover:bg-cream"
        >
          <span className="text-right leading-tight">
            <span className="block font-bold">{child.firstName}</span>
            <span className="block text-xs text-muted-foreground">
              Age {ageOn(child.birthDate, today)}
            </span>
          </span>
          <ChildAvatar child={child} />
        </Link>
      </div>
    </header>
  );
}

export function ChildAvatar({ child, size = 40 }: { child: Child; size?: number }) {
  if (child.photoUrl) {
    return (
      <Image
        src={child.photoUrl}
        alt=""
        width={size}
        height={size}
        className="rounded-full object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-full bg-amber text-lg font-extrabold text-teal ring-2 ring-paper"
    >
      {child.firstName[0]}
    </span>
  );
}
