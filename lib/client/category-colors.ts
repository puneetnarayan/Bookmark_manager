/**
 * Named pastel color families, used consistently across the app so the same *kind*
 * of thing (a priority level, a link status, a nav section) always reads in the
 * same hue wherever it appears. Every entry pairs a light pastel background with
 * a darker, readable text color of the same hue (and a dark-mode equivalent) —
 * classes are written out literally (not built from template strings) so
 * Tailwind's build-time scanner picks them up.
 */
export const CATEGORY_COLORS = {
  violet: { chip: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", icon: "text-violet-500 dark:text-violet-400" },
  sky: { chip: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300", icon: "text-sky-500 dark:text-sky-400" },
  amber: { chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", icon: "text-amber-500 dark:text-amber-400" },
  indigo: { chip: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300", icon: "text-indigo-500 dark:text-indigo-400" },
  teal: { chip: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300", icon: "text-teal-500 dark:text-teal-400" },
  rose: { chip: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300", icon: "text-rose-500 dark:text-rose-400" },
  emerald: { chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", icon: "text-emerald-500 dark:text-emerald-400" },
  stone: { chip: "bg-stone-100 text-stone-700 dark:bg-stone-800/60 dark:text-stone-300", icon: "text-stone-500 dark:text-stone-400" },
  slate: { chip: "bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300", icon: "text-slate-500 dark:text-slate-400" },
  orange: { chip: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300", icon: "text-orange-500 dark:text-orange-400" },
  pink: { chip: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300", icon: "text-pink-500 dark:text-pink-400" },
  cyan: { chip: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300", icon: "text-cyan-500 dark:text-cyan-400" },
} as const;

export type ColorFamily = keyof typeof CATEGORY_COLORS;

/** Deterministic family assignment for open-ended sets (tags) — same input always gets the same color. */
const ROTATION: ColorFamily[] = ["violet", "sky", "amber", "emerald", "rose", "teal", "pink", "orange", "cyan", "indigo"];

export function familyForKey(key: string): ColorFamily {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return ROTATION[hash % ROTATION.length];
}

export function chipClasses(family: ColorFamily): string {
  return CATEGORY_COLORS[family].chip;
}
