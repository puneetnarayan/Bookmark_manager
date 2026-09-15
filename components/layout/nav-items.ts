import {
  LayoutDashboard,
  FolderKanban,
  ListChecks,
  Link2,
  Library,
  Star,
  Tag,
  Archive,
  Trash2,
  Search,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { ColorFamily } from "@/lib/client/category-colors";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  family: ColorFamily;
  mobilePriority?: boolean;
}

// Families here match the same categories used on the Dashboard stat cards, so a
// given kind of thing (Spaces, Favorites, Trash, ...) reads in the same hue everywhere.
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, family: "slate" },
  { label: "Spaces", href: "/spaces", icon: FolderKanban, family: "violet", mobilePriority: true },
  { label: "Next", href: "/next", icon: ListChecks, family: "teal", mobilePriority: true },
  { label: "Quick Links", href: "/quick-links", icon: Link2, family: "cyan", mobilePriority: true },
  { label: "All Resources", href: "/resources", icon: Library, family: "sky" },
  { label: "Favorites", href: "/favorites", icon: Star, family: "amber" },
  { label: "Tags", href: "/tags", icon: Tag, family: "pink" },
  { label: "Archive", href: "/archive", icon: Archive, family: "stone" },
  { label: "Trash", href: "/trash", icon: Trash2, family: "slate" },
  { label: "Search", href: "/search", icon: Search, family: "indigo", mobilePriority: true },
  { label: "Settings", href: "/settings", icon: Settings, family: "slate" },
];
