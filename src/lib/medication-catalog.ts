/**
 * Medication name suggestions for the "Add a medication" form.
 *
 * Reads the `medication_catalog` table in Neon (read-only role) when
 * DATABASE_URL is set; otherwise falls back to the same list bundled with
 * the app (db/seed/medication-catalog.json), so the feature always works.
 *
 * Reference data only: no family data is ever read or written here.
 * Server-only: imported by the search route, never by browser code.
 */

import { neon } from "@neondatabase/serverless";
import seed from "../../db/seed/medication-catalog.json";

export type CatalogMedication = {
  generic: string;
  brands: string[];
  drugClass: string;
  forms: string[];
  /** The brand the search matched, if it matched a brand rather than the generic name. */
  matchedBrand?: string;
};

const MAX_RESULTS = 8;

/** Find medications whose generic or brand name matches what was typed. */
export async function searchMedicationCatalog(query: string): Promise<CatalogMedication[]> {
  const q = query.trim().toLowerCase().slice(0, 40);
  if (q.length < 2) return [];
  const rows = process.env.DATABASE_URL ? await searchDatabase(q) : searchBundled(q);
  return rows.map((m) => ({ ...m, matchedBrand: m.brands.find((b) => b.toLowerCase().startsWith(q)) }));
}

async function searchDatabase(q: string): Promise<CatalogMedication[]> {
  const sql = neon(process.env.DATABASE_URL!);
  // Prefix matches on a word first, then substring and fuzzy (typo-tolerant) matches.
  const rows = await sql`
    select generic_name, brand_names, drug_class, forms,
      case when search_text like ${q + "%"} or search_text like ${"% " + q + "%"} then 1 else 0 end as prefix,
      word_similarity(${q}, search_text) as fuzzy
    from medication_catalog
    where search_text like ${"%" + q + "%"} or ${q} <% search_text
    order by prefix desc, fuzzy desc, generic_name
    limit ${MAX_RESULTS}`;
  return rows.map((r) => ({
    generic: r.generic_name as string,
    brands: r.brand_names as string[],
    drugClass: r.drug_class as string,
    forms: r.forms as string[],
  }));
}

function searchBundled(q: string): CatalogMedication[] {
  const words = (m: (typeof seed.medications)[number]) => [m.generic, ...m.brands].join(" ").toLowerCase();
  return seed.medications
    .map((m) => {
      const text = words(m);
      const prefix = text.startsWith(q) || text.includes(` ${q}`);
      return { m, score: prefix ? 2 : text.includes(q) ? 1 : 0 };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.m.generic.localeCompare(b.m.generic))
    .slice(0, MAX_RESULTS)
    .map(({ m }) => ({ generic: m.generic, brands: m.brands, drugClass: m.class, forms: m.forms }));
}
