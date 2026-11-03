/**
 * Loads one screen's data for the current child: shows the copy saved on the phone
 * straight away, then asks Lanternway for a fresh one and saves that. When the
 * phone is offline (or Lanternway is busy) the saved copy stays, with `offline` set.
 */
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import type { ApiResult } from "@/lib/api";
import { readCache, writeCache } from "@/lib/local-db";

type Loaded<T> = { data: T; savedAt: string; key: string };

/** `fetcher` should be a module-level function (e.g. getTimeline), so it never changes. Cached as "screen:childId". */
export function useCachedScreen<T>(screen: string, userId: string, childId: string | null, fetcher: (childId: string) => Promise<ApiResult<T>>) {
  const key = childId ? `${screen}:${childId}` : null;
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!key || !childId || !userId) return;
    const cached = await readCache<T>(userId, key);
    if (cached) setLoaded((prev) => (prev?.key === key ? prev : { data: cached.body, savedAt: cached.savedAt, key }));
    const result = await fetcher(childId);
    if (result.ok) {
      const savedAt = await writeCache(userId, key, result.data);
      setLoaded({ data: result.data, savedAt, key });
      setOffline(false);
    } else if (result.status !== 401) {
      setOffline(true);
    }
  }, [key, childId, userId, fetcher]);

  // Load whenever the screen shows, and when the child (key) changes.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const refresh = useCallback(
    async (alsoDo?: () => Promise<unknown>) => {
      setRefreshing(true);
      await alsoDo?.();
      await load();
      setRefreshing(false);
    },
    [load],
  );

  const current = loaded?.key === key ? loaded : null;
  return { data: current?.data ?? null, savedAt: current?.savedAt ?? null, offline, refreshing, refresh, reload: load };
}

/** "just now", "12 min ago", "3 hr ago", or a date. */
export function updatedAgo(iso: string): string {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
