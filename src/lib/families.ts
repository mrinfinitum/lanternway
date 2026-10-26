/**
 * The signed-in parent's family and children, stored in Neon with row-level
 * security. Server-only. Screens go through src/lib/data.ts, not this file.
 */

import type { PoolClient } from "@neondatabase/serverless";
import type { Child } from "@/lib/types";
import { asUser } from "@/lib/db";

import { isSavedChildId } from "@/lib/child-profile";

export { isSavedChildId };

type Row = { id: string; profile: Omit<Child, "id"> };
const toChild = (r: Row): Child => ({ ...r.profile, id: r.id });

/** This user's family id, creating the family (with them as admin) the first time. */
async function ensureFamily(db: PoolClient, userId: string): Promise<string> {
  const existing = await db.query<{ family_id: string }>("select family_id from family_members where user_id = $1 order by created_at limit 1", [userId]);
  if (existing.rows[0]) return existing.rows[0].family_id;
  const { rows } = await db.query<{ id: string }>("insert into families (created_by) values ($1) returning id", [userId]);
  await db.query("insert into family_members (family_id, user_id, role) values ($1, $2, 'admin')", [rows[0].id, userId]);
  return rows[0].id;
}

/** The family's children, oldest first. */
export async function listChildren(userId: string): Promise<Child[]> {
  return asUser(userId, async (db) => {
    const { rows } = await db.query<Row>("select id, profile from children order by profile->>'birthDate', created_at");
    return rows.map(toChild);
  });
}

/** Add a child to this user's family (creating the family if needed). Returns the new id. */
export async function insertChild(userId: string, profile: Omit<Child, "id">): Promise<string> {
  return asUser(userId, async (db) => {
    const familyId = await ensureFamily(db, userId);
    const { rows } = await db.query<{ id: string }>("insert into children (family_id, profile) values ($1, $2) returning id", [familyId, profile]);
    return rows[0].id;
  });
}

/** Save an edited profile. Returns false if the child isn't in this user's family. */
export async function updateChild(userId: string, child: Child): Promise<boolean> {
  if (!isSavedChildId(child.id)) return false;
  const { id, ...profile } = child;
  return asUser(userId, async (db) => {
    const r = await db.query("update children set profile = $2, updated_at = now() where id = $1", [id, profile]);
    return r.rowCount === 1;
  });
}

/** Remove a child (admins only, enforced by RLS). Returns false if nothing was removed. */
export async function deleteChild(userId: string, childId: string): Promise<boolean> {
  if (!isSavedChildId(childId)) return false;
  return asUser(userId, async (db) => (await db.query("delete from children where id = $1", [childId])).rowCount === 1);
}
