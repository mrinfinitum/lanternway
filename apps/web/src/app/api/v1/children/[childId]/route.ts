import { childAccess, fail, json, readBody, todayFor, withUser } from "@/lib/api/http";
import { sanitizeChild } from "@/lib/child-profile";
import { deleteChild, listChildren, updateChild } from "@/lib/families";
import type { ChildResponse } from "@lanternway/shared/api";

type Params = { childId: string };

/** GET /api/v1/children/:childId → { child, access } (About Me and the header). */
export const GET = withUser<Params>(async (_request, user, { childId }) => {
  const access = await childAccess(user, childId);
  if (access instanceof Response) return access;
  const child = (await listChildren(user.id)).find((c) => c.id === childId);
  if (!child) return fail(404, "We couldn't find that.");
  return json({ child, access } satisfies ChildResponse);
});

/** PATCH /api/v1/children/:childId (the whole About Me profile, as the website saves it) → { ok }. Admins. */
export const PATCH = withUser<Params>(async (request, user, { childId }) => {
  const access = await childAccess(user, childId, "admin");
  if (access instanceof Response) return access;
  const body = await readBody(request);
  if (!body) return fail(400, "Nothing to save.");
  const child = sanitizeChild({ ...body, id: childId }, childId, todayFor(request));
  if (typeof child === "string") return fail(400, child);
  return (await updateChild(user.id, child)) ? json({ ok: true }) : fail(502, "We couldn't save that change. Please try again.");
});

/** DELETE /api/v1/children/:childId → removes the child and all their records. Admins. */
export const DELETE = withUser<Params>(async (_request, user, { childId }) => {
  const access = await childAccess(user, childId, "admin");
  if (access instanceof Response) return access;
  return (await deleteChild(user.id, childId)) ? json({ ok: true }) : fail(502, "We couldn't remove that child. Please try again.");
});
