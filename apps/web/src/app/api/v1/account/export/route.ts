import { withUser } from "@/lib/api/http";
import { exportAccountData } from "@/lib/account";

/** GET /api/v1/account/export → everything stored for this account, as a JSON file (the same export as the website). */
export const GET = withUser(async (_request, user) => {
  const data = await exportAccountData(user);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="lanternway-data-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
