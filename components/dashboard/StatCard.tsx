import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { CATEGORY_COLORS, type ColorFamily } from "@/lib/client/category-colors";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  href?: string;
  family: ColorFamily;
}

export function StatCard({ label, value, icon: Icon, href, family }: StatCardProps) {
  const colors = CATEGORY_COLORS[family];

  const content = (
    <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--accent)]">
      <div>
        <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{value}</p>
      </div>
      <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${colors.chip}`}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
