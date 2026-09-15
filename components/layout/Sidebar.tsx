"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { NAV_ITEMS } from "./nav-items";
import { CATEGORY_COLORS } from "@/lib/client/category-colors";
import { Boxes } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] md:flex">
      <div className="flex items-center gap-2 px-5 py-5">
        <Boxes className="h-5 w-5 text-[var(--accent)]" aria-hidden />
        <span className="text-sm font-semibold">Workspace</span>
      </div>
      <nav className="flex-1 space-y-0.5 px-3" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const colors = CATEGORY_COLORS[item.family];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? colors.chip : "text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
              )}
              aria-current={active ? "page" : undefined}
            >
              <item.icon className={clsx("h-4 w-4 shrink-0", !active && colors.icon)} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
