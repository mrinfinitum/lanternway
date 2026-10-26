"use server";

import { refresh } from "next/cache";
import { getSignedInUser } from "@/lib/auth/server";
import { isRecordCollection } from "@/lib/record-schemas";
import { deleteRecord, saveRecord } from "@/lib/records";

/**
 * Save a record for one of the family's own children, then refresh the page so
 * server-rendered parts (charts, timeline, Home stats) update. Records for the
 * sample family are ignored (they last for the visit).
 */
export async function persistRecord(collection: string, item: unknown): Promise<{ ok: boolean; error?: string }> {
  const user = await getSignedInUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  if (!isRecordCollection(collection)) return { ok: false };
  const result = await saveRecord(user.id, collection, item);
  if (result === "saved") {
    refresh();
    return { ok: true };
  }
  return { ok: result === null, error: result ?? undefined };
}

export async function removeRecord(id: string): Promise<{ ok: boolean }> {
  const user = await getSignedInUser();
  if (!user) return { ok: false };
  const removed = await deleteRecord(user.id, id);
  if (removed) refresh();
  return { ok: true };
}
