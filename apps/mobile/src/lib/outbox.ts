/**
 * Saves from the phone go here first, then to the server. Every record gets a
 * phone-made UUID, and the server upserts by id, so sending one twice is harmless.
 *
 * - No connection or a busy server (status 0, 5xx, 503): the item waits and is
 *   sent later (after the next save, when the app comes back to the front, or
 *   every 30 seconds while something is waiting).
 * - Signed out (401): it waits for the next sign-in by the same person.
 * - Refused (400/403/404, e.g. a role changed to "view"): it's kept, marked
 *   "needs attention", with the server's plain-English reason.
 */
import { useCallback, useEffect, useState } from "react";
import { cleanRecord, type RecordCollection } from "@lanternway/shared/record-schemas";
import { putRecord } from "@/lib/api";
import { localDb } from "@/lib/local-db";

export type OutboxItem = {
  id: string;
  childId: string;
  collection: RecordCollection;
  body: Record<string, unknown>;
  status: "waiting" | "needs-attention";
  error: string | null;
  createdAt: string;
};

type Row = { id: string; child_id: string; collection: string; body: string; status: string; error: string | null; created_at: string };

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

const toItem = (r: Row): OutboxItem => ({
  id: r.id,
  childId: r.child_id,
  collection: r.collection as RecordCollection,
  body: JSON.parse(r.body) as Record<string, unknown>,
  status: r.status === "needs-attention" ? "needs-attention" : "waiting",
  error: r.error,
  createdAt: r.created_at,
});

/**
 * Save a record on the phone (checked with the same rules as the server first),
 * then try to send it. Returns a message if the record itself isn't valid.
 */
export async function addToOutbox(userId: string, collection: RecordCollection, item: Record<string, unknown> & { id: string; childId: string }): Promise<string | null> {
  const problem = cleanRecord(collection, item);
  if (typeof problem === "string") return problem;
  const db = await localDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO outbox (id, user_id, child_id, collection, body, status, error, created_at) VALUES (?, ?, ?, ?, ?, 'waiting', NULL, ?)",
    item.id,
    userId,
    item.childId,
    collection,
    JSON.stringify(item),
    new Date().toISOString(),
  );
  notify();
  void syncOutbox(userId);
  return null;
}

export async function listOutbox(userId: string): Promise<OutboxItem[]> {
  const db = await localDb();
  const rows = await db.getAllAsync<Row>("SELECT * FROM outbox WHERE user_id = ? ORDER BY created_at", userId);
  return rows.map(toItem);
}

let running: Promise<void> | null = null;

/** Send what's waiting, oldest first. Stops at the first sign the server can't be reached. */
export function syncOutbox(userId: string): Promise<void> {
  running ??= (async () => {
    try {
      const db = await localDb();
      const rows = await db.getAllAsync<Row>("SELECT * FROM outbox WHERE user_id = ? AND status = 'waiting' ORDER BY created_at", userId);
      for (const item of rows.map(toItem)) {
        const result = await putRecord(item.collection, item.id, item.body);
        if (result.ok) {
          await db.runAsync("DELETE FROM outbox WHERE id = ?", item.id);
        } else if (result.status === 0 || result.status === 401 || result.status >= 500) {
          break; // offline, signed out, or the server is busy: try again later
        } else {
          await db.runAsync("UPDATE outbox SET status = 'needs-attention', error = ? WHERE id = ?", result.error, item.id);
        }
        notify();
      }
    } finally {
      running = null;
    }
  })();
  return running;
}

/** Try a refused item again (e.g. after the person's role was restored). */
export async function retryOutboxItem(userId: string, id: string) {
  const db = await localDb();
  await db.runAsync("UPDATE outbox SET status = 'waiting', error = NULL WHERE id = ? AND user_id = ?", id, userId);
  notify();
  void syncOutbox(userId);
}

/** Let go of a refused item the person no longer needs. */
export async function discardOutboxItem(userId: string, id: string) {
  const db = await localDb();
  await db.runAsync("DELETE FROM outbox WHERE id = ? AND user_id = ?", id, userId);
  notify();
}

/** The outbox for this person, kept up to date as items are added and sent. */
export function useOutbox(userId: string): OutboxItem[] {
  const [items, setItems] = useState<OutboxItem[]>([]);
  const load = useCallback(() => {
    listOutbox(userId).then(setItems, () => undefined);
  }, [userId]);
  useEffect(() => {
    load();
    listeners.add(load);
    return () => {
      listeners.delete(load);
    };
  }, [load]);
  return items;
}

/** Tell screens the outbox changed (after the local data is wiped on sign-out). */
export const outboxChanged = notify;
