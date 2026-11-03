import { json, withUser } from "@/lib/api/http";
import { listMyFamilies } from "@/lib/sharing";
import type { FamiliesResponse } from "@lanternway/shared/api";

/** GET /api/v1/families → my families, members, and (for admins) invites. Invite tokens are never included. */
export const GET = withUser(async (_request, user) => json({ families: await listMyFamilies(user.id) } satisfies FamiliesResponse));
