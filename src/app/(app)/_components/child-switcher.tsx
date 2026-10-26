"use client";

import Link from "next/link";
import { useTransition } from "react";
import { ChevronDown, Eye, House, IdCard, LogOut, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { signOut } from "../../(auth)/actions";
import { ChildAvatar } from "./child-avatar";
import { enterSampleFamily, leaveSampleFamily, selectChild } from "./child-actions";

/** Just what the switcher needs. The full child record never goes to the browser here. */
export type KidSummary = { id: string; firstName: string; age: number; photoUrl?: string };

export function ChildSwitcher({
  kids,
  currentId,
  user,
  sample,
}: {
  kids: KidSummary[];
  currentId: string | null;
  user: { name: string; email: string } | null;
  /** Looking around the sample family. */
  sample: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const current = kids.find((k) => k.id === currentId) ?? kids[0] ?? null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={current ? `Viewing ${current.firstName}${sample ? " (sample family)" : ""}. Switch child` : "Your family menu"}
        aria-busy={pending}
        className={cn(
          "flex items-center gap-2 rounded-full py-1 pr-1 pl-3 transition-colors outline-none hover:bg-cream focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-cream",
          pending && "opacity-70",
        )}
      >
        <span className="text-right leading-tight">
          <span className="block font-bold">
            {current ? current.firstName : "Your family"}
            {sample && <span className="ml-1.5 rounded-full bg-amber/40 px-1.5 py-0.5 align-middle text-[10px] font-extrabold uppercase">Sample</span>}
          </span>
          <span className="block text-xs text-muted-foreground">{current ? `Age ${current.age}` : "Add a child"}</span>
        </span>
        <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
        {current ? (
          <ChildAvatar child={current} />
        ) : (
          <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-cream">
            <Plus className="size-5" />
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {kids.length > 0 && current && (
          <>
            <DropdownMenuLabel>{sample ? "Sample family" : "Your kids"}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={current.id}
              onValueChange={(id) => id !== current.id && startTransition(() => selectChild(id))}
            >
              {kids.map((k) => (
                <DropdownMenuRadioItem key={k.id} value={k.id}>
                  <ChildAvatar child={k} size={32} />
                  <span className="leading-tight">
                    <span className="block font-bold">{k.firstName}</span>
                    <span className="block text-xs text-muted-foreground">Age {k.age}</span>
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/about-me">
                <IdCard className="size-4" aria-hidden /> About {current.firstName}
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem asChild>
          <Link href="/kids/new">
            <Plus className="size-4" aria-hidden /> Add a child
          </Link>
        </DropdownMenuItem>
        {sample ? (
          <DropdownMenuItem onSelect={() => startTransition(() => leaveSampleFamily())}>
            <House className="size-4" aria-hidden /> Back to my family
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => startTransition(() => enterSampleFamily())}>
            <Eye className="size-4" aria-hidden /> Look around a sample family
          </DropdownMenuItem>
        )}
        {user && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="tracking-normal normal-case">
              <span className="block text-xs font-semibold">Signed in as</span>
              <span className="block truncate text-sm font-bold text-teal">{user.name || user.email}</span>
              {user.name && <span className="block truncate text-xs font-normal">{user.email}</span>}
            </DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => startTransition(() => signOut())}>
              <LogOut className="size-4" aria-hidden /> Sign out
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
