/** Small medication look-ups the phone's Medications screens share. */
import type { Medication, MedicationChange, Provider } from "@lanternway/shared/types";

/** A medication's changes, oldest first. */
export const historyOf = (medId: string, changes: MedicationChange[]) =>
  changes.filter((c) => c.medicationId === medId).sort((a, b) => a.date.localeCompare(b.date));

export const latestChange = (medId: string, changes: MedicationChange[]) => historyOf(medId, changes).at(-1);

export const prescriberName = (m: Medication, team: Provider[]) => m.prescriberName || team.find((p) => p.id === m.prescriberId)?.name;

/** Who to ask for a refill, with their phone when they're on the care team (as on the website). */
export function prescriberContact(m: Medication, team: Provider[]): { name: string; phone?: string } | undefined {
  const p = team.find((t) => t.id === m.prescriberId);
  return m.prescriberName ? { name: m.prescriberName } : p ? { name: p.name, phone: p.phone } : undefined;
}
