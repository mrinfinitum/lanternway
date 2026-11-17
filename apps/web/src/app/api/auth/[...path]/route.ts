import { auth } from "@/lib/auth/server";

/**
 * The public face of Neon Auth on our domain. The website signs in, signs up and
 * changes passwords from the server (server actions and /api/v1 call Neon Auth
 * directly), so the browser never needs this route for that.
 *
 * Only the link-style GETs an email can point at are passed through. Everything
 * else Better Auth offers (sign-up without our consent boxes, organizations and
 * their invitation emails, change-email, update-user, JWTs, the API reference page,
 * admin endpoints) answers 404 here. Pen test, Nov 17, 2026 (COMPLIANCE.md).
 */
const upstream = auth.handler();

const ALLOWED_GET = [/^reset-password\/[A-Za-z0-9_-]{1,200}$/, /^verify-email$/, /^error$/];

const notFound = () => Response.json({ error: "Not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });

type Context = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, context: Context) {
  const { path } = await context.params;
  if (!ALLOWED_GET.some((pattern) => pattern.test(path.join("/")))) return notFound();
  return upstream.GET(request, context);
}

export function POST() {
  return notFound();
}
