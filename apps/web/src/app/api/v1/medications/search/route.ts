import { json, withUser } from "@/lib/api/http";
import { searchMedicationCatalog } from "@/lib/medication-catalog";

/** GET /api/v1/medications/search?q= → medication names for type-ahead (names, classes and forms; never doses). */
export const GET = withUser(async (request) => {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  return json({ results: q.length >= 2 ? await searchMedicationCatalog(q) : [] });
});
