// Request and response shapes of the mobile API (/api/v1), shared by the website's
// route handlers and the phone app so both compile against the same contract.
// Routes not listed here yet return the shapes in their route files' doc comments.

import type { Family, FamilyRole } from "./family-roles";
import type { Child } from "./types";

export type ApiUser = { id: string; name: string; email: string };

/** Every error response: a plain-English message the app can show as-is. */
export type ApiError = { error: string };

/** GET /api/v1/me */
export type MeResponse = {
  user: ApiUser;
  families: Family[];
  children: { child: Child; role: FamilyRole }[];
};

/** POST /api/v1/auth/sign-in { email, password } */
export type SignInResponse = { token: string; user: ApiUser };
