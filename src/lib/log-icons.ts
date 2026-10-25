import { Moon, Smile, Star, StickyNote, Utensils, Waves, type LucideIcon } from "lucide-react";
import type { LogKind } from "@/lib/types";

export const logKindIcons: Record<LogKind, LucideIcon> = {
  mood: Smile,
  sleep: Moon,
  appetite: Utensils,
  meltdown: Waves,
  win: Star,
  note: StickyNote,
};

/** Order of quick-log buttons. */
export const logKindOrder: LogKind[] = ["mood", "sleep", "appetite", "meltdown", "win", "note"];
