"use client";

import { useTheme } from "@/lib/client/theme-context";
import clsx from "clsx";

export function AppearanceSettings() {
  const { theme, density, setTheme, setDensity } = useTheme();

  return (
    <div className="max-w-md space-y-6">
      <div>
        <span className="mb-2 block text-sm font-medium">Theme</span>
        <div className="flex gap-2">
          {(["light", "dark", "system"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={clsx(
                "flex-1 rounded-md border px-3 py-2 text-sm capitalize",
                theme === t ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]" : "border-[var(--border)]"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="mb-2 block text-sm font-medium">Density</span>
        <div className="flex gap-2">
          {(["comfortable", "compact"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDensity(d)}
              className={clsx(
                "flex-1 rounded-md border px-3 py-2 text-sm capitalize",
                density === d ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]" : "border-[var(--border)]"
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
