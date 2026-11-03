/**
 * Which child the app is showing, remembered on the phone, and the person's role
 * for that child's family (admin / log / view). A view-only member can't log.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { MeResponse } from "@lanternway/shared/api";
import type { FamilyRole } from "@lanternway/shared/family-roles";
import { readPref, writePref } from "@/lib/local-db";
import { useSession } from "@/lib/session";

type Kid = MeResponse["children"][number];

type CurrentChild = {
  kids: Kid[];
  current: Kid | null;
  select: (childId: string) => void;
};

const Context = createContext<CurrentChild | null>(null);
const PREF = "current-child";

export function CurrentChildProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const kids = useMemo(() => (session.status === "signed-in" ? session.me.children : []), [session]);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    readPref(PREF).then((id) => live && setPicked(id), () => undefined);
    return () => {
      live = false;
    };
  }, []);

  const select = useCallback((childId: string) => {
    setPicked(childId);
    void writePref(PREF, childId);
  }, []);

  // The remembered child, if they're still in the list; otherwise the first.
  const current = kids.find((k) => k.child.id === picked) ?? kids[0] ?? null;
  const value = useMemo(() => ({ kids, current, select }), [kids, current, select]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCurrentChild(): CurrentChild {
  const value = useContext(Context);
  if (!value) throw new Error("useCurrentChild must be used inside <CurrentChildProvider>");
  return value;
}

export const canLog = (role: FamilyRole | undefined) => role === "admin" || role === "log";
