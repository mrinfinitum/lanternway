import { json, withUser } from "@/lib/api/http";
import { listChildren } from "@/lib/families";
import { getAccessForChild, listMyFamilies } from "@/lib/sharing";
import type { MeResponse } from "@lanternway/shared/api";

/**
 * GET /api/v1/me → the signed-in user, their families (members, and invites for
 * admins; never invite tokens), and every child they can see with their role.
 */
export const GET = withUser(async (_request, user) => {
  const [families, kids] = await Promise.all([listMyFamilies(user.id), listChildren(user.id)]);
  const children = await Promise.all(
    kids.map(async (child) => ({ child, role: (await getAccessForChild(user.id, child.id))?.role ?? "view" })),
  );
  return json({ user, families, children } satisfies MeResponse);
});
