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

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  mobilePriority?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Spaces", href: "/spaces", icon: FolderKanban, mobilePriority: true },
  { label: "Next", href: "/next", icon: ListChecks, mobilePriority: true },
  { label: "Quick Links", href: "/quick-links", icon: Link2, mobilePriority: true },
  { label: "All Resources", href: "/resources", icon: Library },
  { label: "Favorites", href: "/favorites", icon: Star },
  { label: "Tags", href: "/tags", icon: Tag },
  { label: "Archive", href: "/archive", icon: Archive },
  { label: "Trash", href: "/trash", icon: Trash2 },
  { label: "Search", href: "/search", icon: Search, mobilePriority: true },
  { label: "Settings", href: "/settings", icon: Settings },
];
