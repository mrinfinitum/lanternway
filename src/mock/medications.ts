import type { Medication, MedicationChange } from "@/lib/types";
import { CHILD_ID, MED_DATES } from "./calendar";

// What the parent recorded. Lanternway records these; it never recommends
// doses or changes.

export const medications: Medication[] = [
  {
    id: "med-methylphenidate",
    childId: CHILD_ID,
    name: "Methylphenidate ER",
    purpose: "Prescribed for ADHD (focus at school)",
    form: "Extended-release tablet, taken with breakfast",
    prescriberId: "prov-psychiatry",
    startDate: MED_DATES.methylphenidateStart,
    pharmacy: "Corner Street Pharmacy",
    lastFilledOn: "2026-09-28",
    daysSupply: 30,
  },
  {
    id: "med-guanfacine",
    childId: CHILD_ID,
    name: "Guanfacine ER",
    purpose: "Prescribed for ADHD (evenings and winding down)",
    form: "Extended-release tablet, taken at dinner",
    prescriberId: "prov-psychiatry",
    startDate: MED_DATES.guanfacineStart,
    pharmacy: "Corner Street Pharmacy",
    lastFilledOn: "2026-10-05",
    daysSupply: 30,
  },
];

export const medicationChanges: MedicationChange[] = [
  {
    id: "mc-01",
    medicationId: "med-methylphenidate",
    date: MED_DATES.methylphenidateStart,
    type: "start",
    doseMg: 18,
    schedule: "Once daily, morning",
    reason: "Dr. Marsh started this after we talked about focus at school.",
    sideEffectsObserved: ["Less hungry at lunch for the first two weeks"],
  },
  {
    id: "mc-02",
    medicationId: "med-methylphenidate",
    date: MED_DATES.methylphenidateTo27,
    type: "dose-change",
    doseMg: 27,
    schedule: "Once daily, morning",
    reason:
      "Dr. Marsh increased the dose at the February visit after we shared teacher check-ins showing focus fading by late morning.",
    sideEffectsObserved: ["Trouble falling asleep some nights"],
    notes: "Asked the school to keep sending weekly check-ins so we can compare.",
  },
  {
    id: "mc-03",
    medicationId: "med-guanfacine",
    date: MED_DATES.guanfacineStart,
    type: "start",
    doseMg: 1,
    schedule: "Once daily, with dinner",
    reason:
      "Dr. Marsh added this at the September visit. We'd talked about evening meltdowns and long bedtimes.",
    sideEffectsObserved: ["Sleepy in the evening for the first week"],
  },
  {
    id: "mc-04",
    medicationId: "med-methylphenidate",
    date: MED_DATES.methylphenidateTo36,
    type: "dose-change",
    doseMg: 36,
    schedule: "Once daily, morning",
    reason:
      "Dr. Marsh increased the dose after we shared Mr. Okafor's check-ins from January and February.",
    sideEffectsObserved: ["Smaller appetite at lunch", "Bigger snack after school"],
    notes: "Packing a smaller lunch plus a protein snack for after school.",
  },
];
