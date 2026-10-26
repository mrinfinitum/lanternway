import { getSignedInUser } from "@/lib/auth/server";
import { exportAccountData } from "@/lib/account";

/** GET /api/account/export → a JSON file of everything stored for this account. */
export async function GET() {
  const user = await getSignedInUser();
  if (!user) return new Response("Please sign in.", { status: 401 });
  const data = await exportAccountData(user);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="lanternway-data-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
