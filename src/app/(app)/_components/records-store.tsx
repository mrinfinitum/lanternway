"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type {
  Accommodation,
  IepGoal,
  IepPlan,
  Medication,
  MedicationChange,
  Provider,
  SchoolMessage,
} from "@/lib/types";

// Stage 1: records parents add, edit, or remove live in memory for this visit only
// (like quick-log entries). Screens get records from the server, then lay these
// edits over them with `useRecords`. Stage 2 replaces this with Supabase writes.

type Collections = {
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

export function RecordsProvider({ children }: { children: React.ReactNode }) {
  const [overlay, setOverlay] = useState<Overlay>(empty);

  const save = useCallback(<K extends CollectionName>(collection: K, item: Collections[K]) => {
    setOverlay((prev) => ({
      ...prev,
      [collection]: {
        saved: { ...prev[collection].saved, [item.id]: item },
        removed: prev[collection].removed.filter((id) => id !== item.id),
      },
    }));
  }, []);

  const remove = useCallback((collection: CollectionName, id: string) => {
    setOverlay((prev) => {
      const { [id]: _gone, ...saved } = prev[collection].saved as Record<string, unknown>;
      void _gone;
      return { ...prev, [collection]: { saved, removed: [...prev[collection].removed, id] } };
    });
  }, []);

  const value = useMemo(() => ({ overlay, save, remove }), [overlay, save, remove]);
  return <RecordsContext.Provider value={value}>{children}</RecordsContext.Provider>;
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

export const newId = (prefix: string) => `${prefix}-local-${crypto.randomUUID().slice(0, 8)}`;
