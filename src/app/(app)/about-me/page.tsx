import type { Metadata } from "next";
import { getCurrentChild, getMedicationChanges, getMedications, getToday } from "@/lib/data";
import { AboutMeView } from "./about-me-view";

// Reads the signed-in session, so navigations wait for the server (see app layout).
export const instant = false;

export const metadata: Metadata = { title: "About Me · Lanternway" };

export default async function AboutMePage({ searchParams }: PageProps<"/about-me">) {
  const { welcome } = await searchParams;
  const [child, today] = await Promise.all([getCurrentChild(), getToday()]);
  const [medications, changes] = await Promise.all([getMedications(child.id), getMedicationChanges(child.id)]);
  // Medications stay owned by the Medications screen; About Me only shows the current list.
  const meds = medications
    .filter((m) => !m.stopDate)
    .map((m) => {
      const latest = changes.filter((c) => c.medicationId === m.id).at(-1);
      return `${m.name} ${latest?.doseMg} mg — ${latest?.schedule.toLowerCase()}`;
    });

  return <AboutMeView key={child.id} child={child} today={today} meds={meds} welcome={welcome === "1"} />;
}
