import { authForRequest } from "@/lib/api/auth";
import { json, withUser } from "@/lib/api/http";

/** POST /api/v1/account/sign-out-everywhere → ends every session for this account, this one included. */
export const POST = withUser(async (request) => {
  const { server } = authForRequest(request);
  await server.revokeSessions();
  await server.signOut();
  return json({ ok: true });
});
