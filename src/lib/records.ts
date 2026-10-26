/**
 * Saved records for a family's own children (logs, medications, care team, school…),
 * stored in Neon's `records` table with row-level security. Server-only.
 * Screens read through src/lib/data.ts; writes come from saveRecordAction.
 */

import { cache } from "react";
import { getSignedInUser } from "@/lib/auth/server";
import { isSavedChildId } from "@/lib/child-profile";
import { asUser } from "@/lib/db";
import { RECORD_KINDS, cleanRecord, type RecordCollection } from "@/lib/record-schemas";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isRecordId = (id: unknown): id is string => typeof id === "string" && UUID.test(id);

const collectionForKind = Object.fromEntries(
  Object.entries(RECORD_KINDS).map(([collection, spec]) => [spec.kind, collection]),
) as Record<string, RecordCollection>;

export type ChildRecords = Record<RecordCollection, Array<Record<string, unknown> & { id: string }>>;

const emptyRecords = (): ChildRecords =>
  Object.fromEntries(Object.keys(RECORD_KINDS).map((c) => [c, []])) as unknown as ChildRecords;

/** Every saved record for one child, grouped by collection. One query per request. */
export const loadChildRecords = cache(async (childId: string): Promise<ChildRecords> => {
  const out = emptyRecords();
  if (!isSavedChildId(childId)) return out;
  const user = await getSignedInUser();
  if (!user) return out;
  const rows = await asUser(user.id, async (db) =>
    (await db.query<{ id: string; kind: string; data: Record<string, unknown> }>(
      "select id, kind, data from records where child_id = $1 order by occurred_on nulls last, created_at",
      [childId],
    )).rows,
  );
  for (const r of rows) {
    const collection = collectionForKind[r.kind];
    if (collection) out[collection].push({ ...r.data, id: r.id });
  }
  return out;
});

/**
 * Save (insert or update) a record. Works out the child and family from the record
 * itself or its parent, so a record can only ever attach to the signed-in family's
 * own child. Returns null when it isn't a saved child's record (e.g. the sample
 * family), or a message if something's wrong.
 */
export async function saveRecord(userId: string, collection: RecordCollection, item: unknown): Promise<"saved" | null | string> {
  const id = (item as { id?: unknown })?.id;
  if (!isRecordId(id)) return null;
  const spec = RECORD_KINDS[collection];
  const data = cleanRecord(collection, item);
  if (typeof data === "string") return data;

  // Who does this belong to? A child id, or the parent record's child.
  const parentId = spec.parent ? (item as Record<string, unknown>)[spec.parent] : null;
  const childId = spec.parent ? null : (item as { childId?: unknown }).childId;
  if (spec.parent ? !isRecordId(parentId) : !(typeof childId === "string" && isSavedChildId(childId))) return null;

  if (collection === "logs") {
    // Logged by the signed-in parent, not whatever the browser says.
    const user = await getSignedInUser();
    data.loggedBy = user?.name.split(" ")[0] || "Parent";
  }
  const occurredOn = spec.date ? ((data[spec.date] as string | undefined) ?? null) : null;

  return asUser(userId, async (db) => {
    let owner: { child_id: string; family_id: string } | undefined;
    if (spec.parent) {
      owner = (await db.query<{ child_id: string; family_id: string }>("select child_id, family_id from records where id = $1", [parentId])).rows[0];
    } else {
      const row = (await db.query<{ family_id: string }>("select family_id from children where id = $1", [childId])).rows[0];
      owner = row ? { child_id: childId as string, family_id: row.family_id } : undefined;
    }
    if (!owner) return null; // not one of this family's children / records

    await db.query(
      `insert into records (id, family_id, child_id, kind, parent_id, occurred_on, data)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (id) do update
         set data = excluded.data, occurred_on = excluded.occurred_on, parent_id = excluded.parent_id, updated_at = now()
         where records.family_id = excluded.family_id and records.kind = excluded.kind`,
      [id, owner.family_id, owner.child_id, spec.kind, spec.parent ? parentId : null, occurredOn, data],
    );
    return "saved" as const;
  });
}

/** Delete a record (and anything attached to it, e.g. a medication's changes). */
export async function deleteRecord(userId: string, id: string): Promise<boolean> {
  if (!isRecordId(id)) return false;
  return asUser(userId, async (db) => ((await db.query("delete from records where id = $1", [id])).rowCount ?? 0) > 0);
}
