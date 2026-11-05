/**
 * Small helpers shared by the /api/v1 route handlers (the mobile app's API).
 * Server-only. See MOBILE_PLAN.md §2 for the rules every route follows.
 */

import "server-only";
import { AUTH_UNAVAILABLE, getBearerUser, type ApiUser } from "@/lib/api/auth";
import { isSavedChildId } from "@/lib/child-profile";
import { asUser } from "@/lib/db";
import { getAccessForChild, listMyFamilies, type Access, type Family, type FamilyRole } from "@/lib/sharing";
import { todayIn } from "@lanternway/shared/dates";
import type { IsoDate } from "@lanternway/shared/types";

/** JSON response that's never cached (family data). */
export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** An error response: `{ error }` with a plain-English message the app can show. */
export const fail = (status: number, error: string) => json({ error }, status);

export const SIGN_IN_AGAIN = "Please sign in again.";

/** Sign-in service busy or down: 503 with Retry-After, so the app retries rather than signing out. */
export const unavailable = () =>
  Response.json({ error: "We're having trouble checking your sign-in. Please try again in a moment." }, {
    status: 503,
    headers: { "Cache-Control": "no-store", "Retry-After": "10" },
  });
const NOT_FOUND = "We couldn't find that.";

/** The request body as an object, or null if it isn't JSON. */
export async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  const body = await request.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
}

export const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** "Today" in the time zone the phone sends (`?tz=` or `X-Time-Zone`), default America/New_York. */
export function todayFor(request: Request): IsoDate {
  const tz = new URL(request.url).searchParams.get("tz") ?? request.headers.get("x-time-zone") ?? "";
  return todayIn(tz);
}

/** Log a failure without request bodies or family data: just the route and an error code. */
function logFailure(request: Request, err: unknown) {
  const code = (err as { code?: unknown })?.code;
  console.error("[api/v1]", request.method, new URL(request.url).pathname, typeof code === "string" ? code : err instanceof Error ? err.name : "error");
}

/**
 * Wrap a route handler that needs a signed-in user (bearer token). Answers 401
 * without one, and a plain 500 if something throws.
 */
export function withUser<P = Record<string, never>>(
  handler: (request: Request, user: ApiUser, params: P) => Promise<Response>,
) {
  return async (request: Request, context: { params: Promise<P> }): Promise<Response> => {
    try {
      const user = await getBearerUser(request);
      if (user === AUTH_UNAVAILABLE) return unavailable();
      if (!user) return fail(401, SIGN_IN_AGAIN);
      return await handler(request, user, await context.params);
    } catch (err) {
      logFailure(request, err);
      return fail(500, "Something went wrong on our side. Please try again.");
    }
  };
}

/** Same as withUser, for the public auth routes. */
export function publicRoute<P = Record<string, never>>(handler: (request: Request, params: P) => Promise<Response>) {
  return async (request: Request, context: { params: Promise<P> }): Promise<Response> => {
    try {
      return await handler(request, await context.params);
    } catch (err) {
      logFailure(request, err);
      return fail(500, "Something went wrong on our side. Please try again.");
    }
  };
}

const RANK: Record<FamilyRole, number> = { view: 0, log: 1, admin: 2 };
const CANT_CHANGE: Record<FamilyRole, string> = {
  view: "You can view this family's records but can't change them.",
  log: "You can view this family's records and add daily logs and milestones.",
  admin: "Only a family admin can do that.",
};
/** The message for someone whose role is below what an action needs. */
const tooLow = (role: FamilyRole, need: FamilyRole) => (need === "admin" && role === "log" ? CANT_CHANGE.admin : CANT_CHANGE[role]);

/**
 * This user's access to a child, if it's at least `need`. Otherwise a 404 (not
 * their family's child, so nothing is revealed) or a 403 (their family, role too low).
 * Row-level security enforces the same rules; this gives the app a clear answer.
 */
export async function childAccess(user: ApiUser, childId: string, need: FamilyRole = "view"): Promise<Access | Response> {
  if (!isSavedChildId(childId)) return fail(404, NOT_FOUND);
  const access = await getAccessForChild(user.id, childId);
  if (!access) return fail(404, NOT_FOUND);
  if (RANK[access.role] < RANK[need]) return fail(403, tooLow(access.role, need));
  return access;
}

/** Same as childAccess, for a family. */
export async function familyAccess(user: ApiUser, familyId: string, need: FamilyRole = "view"): Promise<Family | Response> {
  const family = (await listMyFamilies(user.id)).find((f) => f.id === familyId);
  if (!family) return fail(404, NOT_FOUND);
  if (RANK[family.myRole] < RANK[need]) return fail(403, tooLow(family.myRole, need));
  return family;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The child a saved record or check-in link belongs to, as this user can see it (RLS), or null. */
export async function childOf(user: ApiUser, table: "records" | "checkin_links", id: string): Promise<{ childId: string; kind?: string } | null> {
  if (!UUID.test(id)) return null;
  const sql = table === "records" ? "select child_id, kind from records where id = $1" : "select child_id from checkin_links where id = $1";
  const row = await asUser(user.id, async (db) => (await db.query<{ child_id: string; kind?: string }>(sql, [id])).rows[0]);
  return row ? { childId: row.child_id, kind: row.kind } : null;
}
