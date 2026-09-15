"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Plus } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";
import { CATEGORY_COLORS } from "@/lib/client/category-colors";
import { useQuickActions } from "@/lib/client/quick-actions-context";

export function MobileNav() {
  const pathname = usePathname();
  const { openAddResource } = useQuickActions();
  const items = NAV_ITEMS.filter((item) => item.mobilePriority);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-[var(--border)] bg-[var(--surface)] pb-[env(safe-area-inset-bottom,0px)] md:hidden"
      aria-label="Mobile navigation"
    >
      {items.slice(0, 2).map((item) => (
        <MobileNavLink key={item.href} item={item} active={pathname.startsWith(item.href)} />
      ))}
      <button
        onClick={() => openAddResource()}
        aria-label="Add resource"
        className="-mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg"
      >
        <Plus className="h-5 w-5" />
      </button>
      {items.slice(2).map((item) => (
        <MobileNavLink key={item.href} item={item} active={pathname.startsWith(item.href)} />
      ))}
    </nav>
  );
}

function MobileNavLink({
  item,
  active,
}: {
  item: (typeof NAV_ITEMS)[number];
  active: boolean;
}) {
  const colors = CATEGORY_COLORS[item.family];
  return (
    <Link
      href={item.href}
      className={clsx(
        "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
        active ? colors.icon : "text-[var(--muted)]"
      )}
      aria-current={active ? "page" : undefined}
    >
      <item.icon className="h-5 w-5" aria-hidden />
      {item.label}
    </Link>
  );
}
