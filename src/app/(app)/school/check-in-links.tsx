"use client";

import Link from "next/link";
import { useState } from "react";
import { Ban, Check, Copy, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import type { CheckInLink, IsoDate } from "@/lib/types";

type Row = CheckInLink & { name: string; role: string };

/** Check-in links with copy and revoke. Revoking only lasts for this visit in the prototype. */
export function CheckInLinks({ links, today }: { links: Row[]; today: IsoDate }) {
  const [revoked, setRevoked] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const status = (l: Row) => {
    if (l.revokedAt || revoked.includes(l.token)) return "Revoked";
    if (l.expiresAt.slice(0, 10) < today) return "Expired";
    return "Active";
  };
  const sorted = [...links].sort((a, b) => (status(a) === "Active" ? -1 : 0) - (status(b) === "Active" ? -1 : 0));

  const copy = async (token: string) => {
    await navigator.clipboard?.writeText(`${window.location.origin}/c/${token}`);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <ul className="space-y-2">
      {sorted.map((l) => {
        const s = status(l);
        const active = s === "Active";
        return (
          <li key={l.token} className="rounded-2xl bg-card ring-1 ring-foreground/10 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold">{l.name}</p>
                <p className="text-sm text-muted-foreground">{l.role}</p>
              </div>
              <Badge variant={active ? "default" : "secondary"} className={active ? "" : "bg-paper"}>
                {s}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Created {formatDate(l.createdAt.slice(0, 10))} ·{" "}
              {s === "Revoked" ? "No longer works" : `${active ? "Expires" : "Expired"} ${formatDate(l.expiresAt.slice(0, 10))}`}
            </p>
            {active && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline" className="rounded-full bg-paper">
                  <Link href={`/c/${l.token}`} target="_blank">
                    <ExternalLink /> Preview form
                  </Link>
                </Button>
                <Button size="sm" variant="outline" className="rounded-full bg-paper" onClick={() => copy(l.token)}>
                  {copied === l.token ? <Check /> : <Copy />} {copied === l.token ? "Copied" : "Copy link"}
                </Button>
                <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setRevoked([...revoked, l.token])}>
                  <Ban /> Revoke
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
