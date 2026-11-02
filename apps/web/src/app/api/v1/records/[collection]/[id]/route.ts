import { childAccess, childOf, fail, json, readBody, withUser } from "@/lib/api/http";
import { deleteRecord, saveRecord } from "@/lib/records";
import { isRecordCollection, RECORD_KINDS } from "@lanternway/shared/record-schemas";
import type { FamilyRole } from "@lanternway/shared/family-roles";

/** "Can log" members add and edit daily logs and milestones; everything else is for admins. */
const roleToWrite = (collection: string): FamilyRole => (collection === "logs" || collection === "milestones" ? "log" : "admin");

/**
 * PUT /api/v1/records/:collection/:id (the record, same shape as the website saves) → { ok }.
 * The phone makes the UUID, so sending the same record again just updates it (safe to retry
 * from an offline queue). Collections and fields: packages/shared/src/record-schemas.ts.
 */
export const PUT = withUser<{ collection: string; id: string }>(async (request, user, { collection, id }) => {
  if (!isRecordCollection(collection)) return fail(404, "We couldn't find that.");
  const body = await readBody(request);
  if (!body) return fail(400, "Nothing to save.");
  const item: Record<string, unknown> = { ...body, id };

  // Whose record is it? The child it names, or the child of the record it belongs to.
  const parentField = RECORD_KINDS[collection].parent;
  let childId: string | null = null;
  if (parentField) {
    const parent = typeof item[parentField] === "string" ? await childOf(user, "records", item[parentField] as string) : null;
    childId = parent?.childId ?? null;
  } else {
    childId = typeof item.childId === "string" ? item.childId : null;
  }
  if (!childId) return fail(404, "We couldn't find that.");
  const access = await childAccess(user, childId, roleToWrite(collection));
  if (access instanceof Response) return access;

  const result = await saveRecord(user, collection, item);
  if (result === "saved") return json({ ok: true });
  return result === null ? fail(404, "We couldn't find that.") : fail(400, result);
});

/**
 * DELETE /api/v1/records/:collection/:id → deletes the record and anything attached to it
 * (e.g. a medication's changes). Logs and milestones: "can log" members; the rest: admins.
 */
export const DELETE = withUser<{ collection: string; id: string }>(async (_request, user, { collection, id }) => {
  if (!isRecordCollection(collection)) return fail(404, "We couldn't find that.");
  const record = await childOf(user, "records", id);
  if (!record || record.kind !== RECORD_KINDS[collection].kind) return fail(404, "We couldn't find that.");
  const access = await childAccess(user, record.childId, roleToWrite(collection));
  if (access instanceof Response) return access;
  return (await deleteRecord(user.id, id)) ? json({ ok: true }) : fail(404, "We couldn't find that.");
});
