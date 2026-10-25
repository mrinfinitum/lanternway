import {
  Ellipsis,
  FileText,
  HeartHandshake,
  History,
  House,
  IdCard,
  NotebookPen,
  Pill,
  School,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** Sidebar (desktop): every section. */
export const sidebarItems: NavItem[] = [
  { href: "/home", label: "Home", icon: House },
  { href: "/log", label: "Log", icon: NotebookPen },
  { href: "/timeline", label: "Timeline", icon: History },
  { href: "/medications", label: "Medications", icon: Pill },
  { href: "/therapy", label: "Therapy", icon: HeartHandshake },
  { href: "/school", label: "School", icon: School },
  { href: "/about-me", label: "About Me", icon: IdCard },
  { href: "/reports", label: "Reports", icon: FileText },
];

/** Pages reached through the "More" tab on phones. */
export const moreItems = sidebarItems.filter((item) =>
  ["/medications", "/therapy", "/about-me", "/reports"].includes(item.href),
);

/** Bottom tab bar (phone). */
export const tabItems: (NavItem & { matches: string[] })[] = [
  { href: "/home", label: "Home", icon: House, matches: ["/home"] },
  { href: "/log", label: "Log", icon: NotebookPen, matches: ["/log"] },
  { href: "/timeline", label: "Timeline", icon: History, matches: ["/timeline"] },
  { href: "/school", label: "School", icon: School, matches: ["/school"] },
  {
    href: "/more",
    label: "More",
    icon: Ellipsis,
    matches: ["/more", ...moreItems.map((item) => item.href)],
  },
];

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
