/**
 * Family sharing: members, roles, and invite links (db/migrations/008_family_sharing.sql).
 * Server-only. Row-level security decides who can do what; these helpers just ask.
 *
 *   admin – everything, including members, export and deletion
 *   log   – reads everything; adds and edits daily logs and milestones
 *   view  – reads everything; changes nothing
 */

import { createHash, randomBytes } from "node:crypto";
import { isSavedChildId } from "@/lib/child-profile";
import { asNobody, asUser } from "@/lib/db";
import { isFamilyRole, type Family, type FamilyRole } from "@/lib/family-roles";

export * from "@/lib/family-roles";

/** Invite tokens are 32 random bytes in base64url: 43 characters. */
export const isInviteToken = (token: string) => /^[A-Za-z0-9_-]{43}$/.test(token);
const hashToken = (token: string) => createHash("sha256").update(token, "utf8").digest("hex");

export const INVITE_DAYS = [7, 30] as const;

/** Every family this person belongs to, with members (and invites, where they're an admin). */
export async function listMyFamilies(userId: string): Promise<Family[]> {
  return asUser(userId, async (db) => {
    const members = (
      await db.query<{ family_id: string; user_id: string; role: FamilyRole; name: string | null; email: string | null; joined_at: Date }>(
        "select * from my_family_members()",
      )
    ).rows;
    const kids = (await db.query<{ family_id: string; first_name: string }>("select family_id, profile->>'firstName' as first_name from children order by profile->>'birthDate', created_at")).rows;
    const invites = (
      await db.query<{ id: string; family_id: string; label: string; role: FamilyRole; created_at: Date; expires_at: Date; accepted_at: Date | null; revoked_at: Date | null }>(
        "select id, family_id, label, role, created_at, expires_at, accepted_at, revoked_at from family_invites order by created_at desc",
      )
    ).rows;
    const ids = [...new Set(members.map((m) => m.family_id))];
    return ids.map((id) => ({
      id,
      kids: kids.filter((k) => k.family_id === id).map((k) => k.first_name),
      myRole: members.find((m) => m.family_id === id && m.user_id === userId)?.role ?? "view",
      members: members
        .filter((m) => m.family_id === id)
        .map((m) => ({
          userId: m.user_id,
          role: m.role,
          name: m.name ?? "",
          email: m.email ?? "",
          joinedAt: m.joined_at.toISOString(),
          isMe: m.user_id === userId,
        })),
      invites: invites
        .filter((i) => i.family_id === id)
        .map((i) => ({
          id: i.id,
          label: i.label,
          role: i.role,
          createdAt: i.created_at.toISOString(),
          expiresAt: i.expires_at.toISOString(),
          acceptedAt: i.accepted_at?.toISOString() ?? null,
          revokedAt: i.revoked_at?.toISOString() ?? null,
        })),
    }));
  });
}

export type Access = { role: FamilyRole; /** First names of the family's admins, for "ask Dana" notes. */ adminNames: string[] };

/** This person's role for one child's family (and who the admins are), or null if it isn't theirs. */
export async function getAccessForChild(userId: string, childId: string): Promise<Access | null> {
  if (!isSavedChildId(childId)) return null;
  return asUser(userId, async (db) => {
    const { rows } = await db.query<{ user_id: string; role: FamilyRole; name: string | null }>(
      "select m.user_id, m.role, m.name from my_family_members() m join children c on c.family_id = m.family_id where c.id = $1",
      [childId],
    );
    const me = rows.find((r) => r.user_id === userId);
    if (!me) return null;
    const adminNames = rows.filter((r) => r.role === "admin" && r.user_id !== userId).map((r) => (r.name ?? "").split(" ")[0]).filter(Boolean);
    return { role: me.role, adminNames };
  });
}

/** Create an invite link (admins only, enforced by RLS). Returns the token once; only its hash is stored. */
export async function createInvite(
  userId: string,
  input: { familyId: string; label: string; role: FamilyRole; days: number },
): Promise<{ token: string } | string> {
  const label = input.label.trim().slice(0, 80);
  if (!label) return "Add the person's name.";
  if (!isFamilyRole(input.role)) return "Pick what they can do.";
  if (!INVITE_DAYS.includes(input.days as (typeof INVITE_DAYS)[number])) return "Pick how long the link works.";
  const token = randomBytes(32).toString("base64url");
  try {
    await asUser(userId, (db) =>
      db.query(
        "insert into family_invites (family_id, token_hash, role, label, expires_at) values ($1, $2, $3, $4, now() + make_interval(days => $5))",
        [input.familyId, hashToken(token), input.role, label, input.days],
      ),
    );
  } catch {
    return "Only a family admin can invite people.";
  }
  return { token };
}

export async function revokeInvite(userId: string, inviteId: string): Promise<boolean> {
  return asUser(userId, async (db) =>
    (await db.query("update family_invites set revoked_at = now() where id = $1 and revoked_at is null and accepted_at is null", [inviteId])).rowCount === 1,
  ).catch(() => false);
}

const LAST_ADMIN = "Every family needs at least one admin. Make someone else an admin first.";
const isLastAdmin = (err: unknown) => err instanceof Error && /at least one admin/.test(err.message);

/** Change a member's role (admins only). Returns an error message, or null when done. */
export async function changeMemberRole(userId: string, familyId: string, memberId: string, role: FamilyRole): Promise<string | null> {
  if (!isFamilyRole(role)) return "Pick a role.";
  try {
    const n = await asUser(userId, async (db) =>
      (await db.query("update family_members set role = $3 where family_id = $1 and user_id = $2", [familyId, memberId, role])).rowCount,
    );
    return n === 1 ? null : "Only a family admin can change roles.";
  } catch (err) {
    return isLastAdmin(err) ? LAST_ADMIN : "Something went wrong. Please try again.";
  }
}

/** Remove someone from a family (admins), or leave it yourself. Returns an error message, or null. */
export async function removeMember(userId: string, familyId: string, memberId: string): Promise<string | null> {
  try {
    const n = await asUser(userId, async (db) =>
      (await db.query("delete from family_members where family_id = $1 and user_id = $2", [familyId, memberId])).rowCount,
    );
    return n === 1 ? null : "Only a family admin can remove people.";
  } catch (err) {
    return isLastAdmin(err) ? LAST_ADMIN : "Something went wrong. Please try again.";
  }
}

export type InvitePreview = { inviterName: string; role: FamilyRole; status: "open" | "used" | "expired" };

/** What the public /join page may show: who sent it, the role, and whether it still works. */
export async function previewInvite(token: string): Promise<InvitePreview | null> {
  if (!isInviteToken(token)) return null;
  return asNobody(async (db) => {
    const { rows } = await db.query<{ inviter_name: string; role: FamilyRole; status: InvitePreview["status"] }>(
      "select * from family_invite_preview($1)",
      [token],
    );
    return rows[0] ? { inviterName: rows[0].inviter_name, role: rows[0].role, status: rows[0].status } : null;
  });
}

/** Join the family as the signed-in person. */
export async function acceptInvite(userId: string, token: string): Promise<"joined" | "already" | "used" | "invalid"> {
  if (!isInviteToken(token)) return "invalid";
  return asUser(userId, async (db) => (await db.query<{ s: "joined" | "already" | "used" | "invalid" }>("select accept_family_invite($1) as s", [token])).rows[0].s);
}

/** The oldest child in the family this person joined most recently (to switch to after joining). */
export async function firstChildInNewestFamily(userId: string): Promise<string | null> {
  return asUser(userId, async (db) => {
    const { rows } = await db.query<{ id: string }>(
      `select c.id from children c
        where c.family_id = (select m.family_id from family_members m
                              where m.user_id = $1 order by m.created_at desc limit 1)
        order by c.profile->>'birthDate', c.created_at limit 1`,
      [userId],
    );
    return rows[0]?.id ?? null;
  });
}

/** Families where this person is the only admin but not the only member (account deletion is blocked). */
export async function familiesNeedingAnotherAdmin(userId: string): Promise<Family[]> {
  return (await listMyFamilies(userId)).filter(
    (f) => f.myRole === "admin" && f.members.length > 1 && f.members.filter((m) => m.role === "admin").length === 1,
  );
}
