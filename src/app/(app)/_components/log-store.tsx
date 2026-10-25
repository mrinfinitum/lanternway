"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { LogEntry } from "@/lib/types";

// Stage 1: quick-log entries live in memory for this visit only.
// Stage 2 will save them to Supabase.

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type NewLogEntry = DistributiveOmit<LogEntry, "id">;

type LogStore = {
  added: LogEntry[];
  addLog: (entry: NewLogEntry) => LogEntry;
};

const LogContext = createContext<LogStore | null>(null);

export function LogProvider({ children }: { children: React.ReactNode }) {
  const [added, setAdded] = useState<LogEntry[]>([]);

  const addLog = useCallback((entry: NewLogEntry) => {
    const saved = { ...entry, id: `local-${crypto.randomUUID()}` } as LogEntry;
    setAdded((prev) => [...prev, saved]);
    return saved;
  }, []);

  const value = useMemo(() => ({ added, addLog }), [added, addLog]);
  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
}

export function useLogStore(): LogStore {
  const store = useContext(LogContext);
  if (!store) throw new Error("useLogStore must be used inside <LogProvider>");
  return store;
}
