"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { brandImages } from "@/lib/brand";
import { isActive, sidebarItems } from "./nav-items";

export function SideNav() {
  const pathname = usePathname();
  const { logoLockup } = brandImages;

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-card px-4 py-6 md:flex print:hidden">
      <Link href="/home" className="mb-8 px-2">
        <Image {...logoLockup} alt={logoLockup.alt} className="h-auto w-40" loading="eager" />
      </Link>
      <nav aria-label="Main">
        <ul className="space-y-1">
          {sidebarItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold text-teal/80 transition-colors hover:bg-amber/20 hover:text-teal aria-[current=page]:bg-amber/40 aria-[current=page]:text-teal"
                >
                  <Icon className="size-5" aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <p className="mt-auto px-2 text-xs text-muted-foreground">
        Prototype with sample data. Maya and her family are fictional.
      </p>
    </aside>
  );
}
