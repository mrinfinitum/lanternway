"use client";

import { useEffect } from "react";
import { TIME_ZONE_COOKIE } from "@/lib/dates";

/** Remembers the browser's time zone so "today" on the server matches the family's day. */
export function TimeZoneCookie() {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && !document.cookie.split("; ").includes(`${TIME_ZONE_COOKIE}=${encodeURIComponent(tz)}`)) {
      document.cookie = `${TIME_ZONE_COOKIE}=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax; secure`;
    }
  }, []);
  return null;
}
