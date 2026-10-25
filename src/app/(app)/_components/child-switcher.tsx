"use client";

import Link from "next/link";
import { useTransition } from "react";
import { ChevronDown, IdCard, Plus } from "lucide-react";
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
import { ChildAvatar } from "./child-avatar";
import { selectChild } from "./child-actions";

/** Just what the switcher needs. The full child record never goes to the browser here. */
export type KidSummary = { id: string; firstName: string; age: number; photoUrl?: string };

export function ChildSwitcher({ kids, currentId }: { kids: KidSummary[]; currentId: string }) {
  const [pending, startTransition] = useTransition();
  const current = kids.find((k) => k.id === currentId) ?? kids[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Viewing ${current.firstName}. Switch child`}
        aria-busy={pending}
        className={cn(
          "flex items-center gap-2 rounded-full py-1 pr-1 pl-3 transition-colors outline-none hover:bg-cream focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-cream",
          pending && "opacity-70",
        )}
      >
        <span className="text-right leading-tight">
          <span className="block font-bold">{current.firstName}</span>
          <span className="block text-xs text-muted-foreground">Age {current.age}</span>
        </span>
        <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
        <ChildAvatar child={current} />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Your kids</DropdownMenuLabel>
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
        <DropdownMenuItem asChild>
          <Link href="/kids/new">
            <Plus className="size-4" aria-hidden /> Add a child
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
