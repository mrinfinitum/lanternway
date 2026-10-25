import type { IsoDate } from "@/lib/types";

/** One row on the timeline. Plain data so it can go to the browser. */
export type TimelineEvent = {
  id: string;
  date: IsoDate;
  time?: string;
  category:
    | "diagnosis"
    | "medication"
    | "school"
    | "therapy"
    | "milestone"
    | "win"
    | "meltdown"
    | "check-in"
    | "note"
    | "visit"
    | "day";
  /**
   * major = shown at every zoom level; minor = year and closer;
   * daily = month and closer; summary = week only.
   */
  level: "major" | "minor" | "daily" | "summary";
  title: string;
  detail?: string;
};

export type Zoom = "week" | "month" | "year" | "all";

export const zoomLevels: Record<Zoom, TimelineEvent["level"][]> = {
  week: ["major", "minor", "daily", "summary"],
  month: ["major", "minor", "daily"],
  year: ["major", "minor"],
  all: ["major"],
};
