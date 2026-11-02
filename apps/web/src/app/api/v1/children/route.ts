import { fail, json, readBody, todayFor, withUser } from "@/lib/api/http";
import { MAX_CHILDREN, buildChild } from "@/lib/child-profile";
import { insertChild, listChildren } from "@/lib/families";

/**
 * POST /api/v1/children (the "Add a child" answers, same shape as the website's
 * wizard) → { id }. The child goes into a family this person is an admin of, or a new one.
 */
export const POST = withUser(async (request, user) => {
  const body = await readBody(request);
  if (!body) return fail(400, "Please fill in the child's details.");
  const child = buildChild(body, "new", todayFor(request));
  if (typeof child === "string") return fail(400, child);
  if ((await listChildren(user.id)).length >= MAX_CHILDREN) return fail(400, `A family can have up to ${MAX_CHILDREN} kids in this prototype.`);
  const { id: _placeholder, ...profile } = child;
  void _placeholder;
  return json({ id: await insertChild(user.id, profile) });
});
