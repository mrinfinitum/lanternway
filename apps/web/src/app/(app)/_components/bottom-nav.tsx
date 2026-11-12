"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isActive, tabItems } from "./nav-items";

/** Phone tab bar: a floating frosted pill. The current tab shows its name; the others show a small label under the icon. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden print:hidden"
    >
      <ul className="mx-auto flex max-w-md items-center justify-between gap-1 rounded-full border border-white/70 bg-white/75 p-1.5 shadow-lift backdrop-blur-xl">
        {tabItems.map(({ href, label, icon: Icon, matches }) => {
          const active = matches.some((m) => isActive(pathname, m));
          return (
            <li key={href} className={cn(active ? "shrink-0" : "flex-1")}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center justify-center rounded-full font-bold transition-colors",
                  active
                    ? "h-12 gap-2 bg-teal px-4 text-sm text-white shadow-soft"
                    : "h-12 flex-col gap-0.5 text-[11px] text-muted-foreground hover:bg-cream/70 hover:text-teal",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
