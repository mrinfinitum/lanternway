/**
 * The phone's own small database (SQLite, in the app's private storage, which the
 * phone encrypts while it's locked). It holds:
 * - outbox: logs saved on the phone and not yet accepted by the server;
 * - cache: the last screen data loaded, so Today opens without a connection;
 * - prefs: small settings such as the child last picked.
 * Signing out wipes all of it (MOBILE_PLAN.md §4, offline behaviour).
 */
import * as SQLite from "expo-sqlite";

let opening: Promise<SQLite.SQLiteDatabase> | null = null;

export function localDb(): Promise<SQLite.SQLiteDatabase> {
  opening ??= (async () => {
    const db = await SQLite.openDatabaseAsync("lanternway.db");
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS outbox (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        child_id TEXT NOT NULL,
        collection TEXT NOT NULL,
        body TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'waiting',
        error TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        body TEXT NOT NULL,
        saved_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS prefs (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
    return db;
  })();
  return opening;
}

/** Forget everything stored on this phone (sign-out). */
export async function wipeLocalData(): Promise<void> {
  const db = await localDb();
  await db.execAsync("DELETE FROM outbox; DELETE FROM cache; DELETE FROM prefs;");
}

/** A different person signed in on this phone: drop what belonged to anyone else. */
export async function keepOnlyUser(userId: string): Promise<void> {
  const db = await localDb();
  await db.runAsync("DELETE FROM outbox WHERE user_id <> ?", userId);
  await db.runAsync("DELETE FROM cache WHERE user_id <> ?", userId);
}

export async function readCache<T>(userId: string, key: string): Promise<{ body: T; savedAt: string } | null> {
  const db = await localDb();
  const row = await db.getFirstAsync<{ body: string; saved_at: string }>(
    "SELECT body, saved_at FROM cache WHERE key = ? AND user_id = ?",
    key,
    userId,
  );
  return row ? { body: JSON.parse(row.body) as T, savedAt: row.saved_at } : null;
}

export async function writeCache(userId: string, key: string, body: unknown): Promise<string> {
  const db = await localDb();
  const savedAt = new Date().toISOString();
  await db.runAsync(
    "INSERT INTO cache (key, user_id, body, saved_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET user_id = excluded.user_id, body = excluded.body, saved_at = excluded.saved_at",
    key,
    userId,
    JSON.stringify(body),
    savedAt,
  );
  return savedAt;
}

export async function readPref(key: string): Promise<string | null> {
  const db = await localDb();
  return (await db.getFirstAsync<{ value: string }>("SELECT value FROM prefs WHERE key = ?", key))?.value ?? null;
}

export async function writePref(key: string, value: string): Promise<void> {
  const db = await localDb();
  await db.runAsync("INSERT INTO prefs (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", key, value);
}

/** The last account loaded on this phone (cache key "me"), for opening the app offline. */
export async function readLastAccount<T>(): Promise<T | null> {
  const db = await localDb();
  const row = await db.getFirstAsync<{ body: string }>("SELECT body FROM cache WHERE key = 'me'");
  return row ? (JSON.parse(row.body) as T) : null;
}
