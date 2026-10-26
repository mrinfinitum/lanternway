"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { persistRecord, removeRecord } from "./record-actions";
import type {
  Accommodation,
  Child,
  IepGoal,
  IepPlan,
  Medication,
  MedicationChange,
  Provider,
  SchoolMessage,
} from "@/lib/types";

// Records parents add, edit, or remove show up immediately (laid over the server's
// data with `useRecords`) and, for the family's own children, are saved to the
// database in order. Sample-family edits last for the visit only.

type Collections = {
  children: Child;
  medications: Medication;
  medicationChanges: MedicationChange;
  providers: Provider;
  iepPlans: IepPlan;
  iepGoals: IepGoal;
  accommodations: Accommodation;
  schoolMessages: SchoolMessage;
};
export type CollectionName = keyof Collections;

type Overlay = { [K in CollectionName]: { saved: Record<string, Collections[K]>; removed: string[] } };

const empty = (): Overlay => ({
  children: { saved: {}, removed: [] },
  medications: { saved: {}, removed: [] },
  medicationChanges: { saved: {}, removed: [] },
  providers: { saved: {}, removed: [] },
  iepPlans: { saved: {}, removed: [] },
  iepGoals: { saved: {}, removed: [] },
  accommodations: { saved: {}, removed: [] },
  schoolMessages: { saved: {}, removed: [] },
});

type Store = {
  overlay: Overlay;
  save: <K extends CollectionName>(collection: K, item: Collections[K]) => void;
  remove: (collection: CollectionName, id: string) => void;
};

const RecordsContext = createContext<Store | null>(null);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function RecordsProvider({ children }: { children: React.ReactNode }) {
  const [overlay, setOverlay] = useState<Overlay>(empty);
  const [problem, setProblem] = useState<string | null>(null);
  // Saves run one after another, so a dose change is saved after its medication.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const enqueue = useCallback((job: () => Promise<{ ok: boolean; error?: string }>) => {
    queue.current = queue.current
      .then(job)
      .then((r) => {
        if (!r.ok) setProblem(r.error ?? "Something didn't save. Please try again.");
      })
      .catch(() => setProblem("Something didn't save. Check your connection and try again."));
  }, []);

  const save = useCallback(<K extends CollectionName>(collection: K, item: Collections[K]) => {
    setOverlay((prev) => ({
      ...prev,
      [collection]: {
        saved: { ...prev[collection].saved, [item.id]: item },
        removed: prev[collection].removed.filter((id) => id !== item.id),
      },
    }));
    // About Me ("children") saves through its own action.
    if (collection !== "children" && UUID.test(item.id)) enqueue(() => persistRecord(collection, item));
  }, [enqueue]);

  const remove = useCallback((collection: CollectionName, id: string) => {
    setOverlay((prev) => {
      const { [id]: _gone, ...saved } = prev[collection].saved as Record<string, unknown>;
      void _gone;
      return { ...prev, [collection]: { saved, removed: [...prev[collection].removed, id] } };
    });
    if (collection !== "children" && UUID.test(id)) enqueue(() => removeRecord(id));
  }, [enqueue]);

  const value = useMemo(() => ({ overlay, save, remove }), [overlay, save, remove]);
  return (
    <RecordsContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-6">
        {problem && (
          <p className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-teal px-4 py-3 text-sm font-semibold text-paper shadow-lg">
            {problem}
            <button type="button" className="rounded-full px-2 underline underline-offset-4" onClick={() => setProblem(null)}>
              OK
            </button>
          </p>
        )}
      </div>
    </RecordsContext.Provider>
  );
}

function useStore(): Store {
  const store = useContext(RecordsContext);
  if (!store) throw new Error("Records hooks must be used inside <RecordsProvider>");
  return store;
}

/** Server records with this visit's edits applied: edited ones replaced, new ones added, removed ones dropped. */
export function useRecords<K extends CollectionName>(collection: K, fromServer: Collections[K][]): Collections[K][] {
  const { overlay } = useStore();
  return useMemo(() => {
    const { saved, removed } = overlay[collection];
    const merged = fromServer.filter((r) => !removed.includes(r.id)).map((r) => saved[r.id] ?? r);
    const added = Object.values(saved).filter((r) => !fromServer.some((s) => s.id === r.id));
    return [...merged, ...added];
  }, [overlay, collection, fromServer]);
}

export function useRecordActions() {
  const { save, remove } = useStore();
  return { save, remove };
}

/** True if the record was added or edited during this visit. */
export function useIsEditedThisVisit(collection: CollectionName, id: string): boolean {
  return id in useStore().overlay[collection].saved;
}

/** Ids for new records. Real UUIDs, so records for the family's own kids can be saved as-is. */
export const newId = (kind?: string) => {
  void kind; // callers pass a label for readability; ids are plain UUIDs
  return crypto.randomUUID();
};

/** Ids of records added or edited during this visit, for "Recorded this visit" lists. */
export function useEditedThisVisit(collection: CollectionName): Set<string> {
  const saved = useStore().overlay[collection].saved;
  return useMemo(() => new Set(Object.keys(saved)), [saved]);
}
