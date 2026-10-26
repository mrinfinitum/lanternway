import { Pool, type PoolClient } from "@neondatabase/serverless";

/**
 * Run queries as a signed-in user. Everything happens in one transaction that
 * first sets `app.user_id`, which the row-level security policies check
 * (db/migrations/002_families.sql). Server-only.
 *
 * The website connects as `lanternway_app`, which isn't the table owner, so the
 * policies always apply: a query can only ever touch this user's family.
 */
export async function asUser<T>(userId: string, fn: (db: PoolClient) => Promise<T>): Promise<T> {
  if (!userId) throw new Error("asUser needs a signed-in user");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = await pool.connect();
  try {
    await db.query("begin");
    await db.query("select set_config('app.user_id', $1, true)", [userId]);
    const result = await fn(db);
    await db.query("commit");
    return result;
  } catch (err) {
    await db.query("rollback").catch(() => {});
    throw err;
  } finally {
    db.release();
    await pool.end();
  }
}

/**
 * Run queries with no signed-in user, for the public check-in page. Row-level
 * security then allows nothing on family tables; only the narrow SECURITY DEFINER
 * functions (checkin_form_context, submit_checkin) are usable. Server-only.
 */
export async function asNobody<T>(fn: (db: PoolClient) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = await pool.connect();
  try {
    return await fn(db);
  } finally {
    db.release();
    await pool.end();
  }
}
