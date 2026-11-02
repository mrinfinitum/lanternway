"use client";

import { createContext, useContext } from "react";

// What the signed-in person may change for the child being viewed (see lib/sharing.ts).
// The database enforces the same rules; this only hides buttons that wouldn't work.

export type AccessRole = "admin" | "log" | "view";

const AccessContext = createContext<AccessRole>("admin");

export function AccessProvider({ role, children }: { role: AccessRole; children: React.ReactNode }) {
  return <AccessContext.Provider value={role}>{children}</AccessContext.Provider>;
}

/** `canEdit`: medications, therapy, school, About Me. `canLog`: daily logs and milestones. */
export function useAccess() {
  const role = useContext(AccessContext);
  return { role, canEdit: role === "admin", canLog: role !== "view" };
}

/** Renders its children only when the person may make this kind of change (else `otherwise`). */
export function IfAllowed({ to, children, otherwise = null }: { to: "edit" | "log"; children: React.ReactNode; otherwise?: React.ReactNode }) {
  const { canEdit, canLog } = useAccess();
  return <>{(to === "edit" ? canEdit : canLog) ? children : otherwise}</>;
}
