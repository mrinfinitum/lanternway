import { searchMedicationCatalog } from "@/lib/medication-catalog";

/** GET /api/medications/search?q=conc → up to 8 name suggestions. Reference data only. */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  try {
    const results = await searchMedicationCatalog(q);
    return Response.json({ results }, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    // If the database is unreachable, the form still works: parents just type the name.
    return Response.json({ results: [] }, { status: 503 });
  }
}
