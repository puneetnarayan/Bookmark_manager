import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  href?: string;
  tone?: "default" | "warning" | "danger";
}

const toneClasses = {
  default: "text-[var(--foreground)]",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-red-600 dark:text-red-400",
};

export function StatCard({ label, value, icon: Icon, href, tone = "default" }: StatCardProps) {
  const content = (
    <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--accent)]">
      <div>
        <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
        <p className={`mt-1 text-2xl font-semibold ${toneClasses[tone]}`}>{value}</p>
      </div>
      <Icon className="h-6 w-6 text-[var(--muted)]" aria-hidden />
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
