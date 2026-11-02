// Family roles and the shapes the Family sharing page shows. Safe to import in the browser;
// the database work lives in lib/sharing.ts (server-only).

export type FamilyRole = "admin" | "log" | "view";
export const FAMILY_ROLES: FamilyRole[] = ["admin", "log", "view"];
export const isFamilyRole = (v: unknown): v is FamilyRole => FAMILY_ROLES.includes(v as FamilyRole);

export const roleLabels: Record<FamilyRole, string> = { admin: "Admin", log: "Can log", view: "Can view" };
export const roleDescriptions: Record<FamilyRole, string> = {
  view: "Sees everything. Can't change anything.",
  log: "Sees everything and adds daily logs and milestones.",
  admin: "Can do everything you can, including inviting and removing people.",
};

export type FamilyMember = { userId: string; role: FamilyRole; name: string; email: string; joinedAt: string; isMe: boolean };
export type FamilyInvite = { id: string; label: string; role: FamilyRole; createdAt: string; expiresAt: string; acceptedAt: string | null; revokedAt: string | null };
export type Family = {
  id: string;
  /** e.g. "Maya and Theo" — the kids' first names, for telling families apart. */
  kids: string[];
  myRole: FamilyRole;
  members: FamilyMember[];
  /** Only for admins. */
  invites: FamilyInvite[];
};
