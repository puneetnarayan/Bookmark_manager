/**
 * Named pastel color families, used consistently across the app so the same *kind*
 * of thing (a priority level, a link status, a nav section) always reads in the
 * same hue wherever it appears. Every entry pairs a light pastel background with
 * a darker, readable text color of the same hue (and a dark-mode equivalent) —
 * classes are written out literally (not built from template strings) so
 * Tailwind's build-time scanner picks them up.
 */
export const CATEGORY_COLORS = {
  violet: {
    chip: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    icon: "text-violet-500 dark:text-violet-400",
    card: "border-violet-200 bg-violet-50 hover:bg-violet-100 dark:border-violet-800/50 dark:bg-violet-950/20 dark:hover:bg-violet-950/40",
  },
  sky: {
    chip: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    icon: "text-sky-500 dark:text-sky-400",
    card: "border-sky-200 bg-sky-50 hover:bg-sky-100 dark:border-sky-800/50 dark:bg-sky-950/20 dark:hover:bg-sky-950/40",
  },
  amber: {
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    icon: "text-amber-500 dark:text-amber-400",
    card: "border-amber-200 bg-amber-50 hover:bg-amber-100 dark:border-amber-800/50 dark:bg-amber-950/20 dark:hover:bg-amber-950/40",
  },
  indigo: {
    chip: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    icon: "text-indigo-500 dark:text-indigo-400",
    card: "border-indigo-200 bg-indigo-50 hover:bg-indigo-100 dark:border-indigo-800/50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40",
  },
  teal: {
    chip: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
    icon: "text-teal-500 dark:text-teal-400",
    card: "border-teal-200 bg-teal-50 hover:bg-teal-100 dark:border-teal-800/50 dark:bg-teal-950/20 dark:hover:bg-teal-950/40",
  },
  rose: {
    chip: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    icon: "text-rose-500 dark:text-rose-400",
    card: "border-rose-200 bg-rose-50 hover:bg-rose-100 dark:border-rose-800/50 dark:bg-rose-950/20 dark:hover:bg-rose-950/40",
  },
  emerald: {
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    icon: "text-emerald-500 dark:text-emerald-400",
    card: "border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-800/50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40",
  },
  stone: {
    chip: "bg-stone-100 text-stone-700 dark:bg-stone-800/60 dark:text-stone-300",
    icon: "text-stone-500 dark:text-stone-400",
    card: "border-stone-200 bg-stone-50 hover:bg-stone-100 dark:border-stone-700/50 dark:bg-stone-900/30 dark:hover:bg-stone-900/50",
  },
  slate: {
    chip: "bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
    icon: "text-slate-500 dark:text-slate-400",
    card: "border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-700/50 dark:bg-slate-900/30 dark:hover:bg-slate-900/50",
  },
  orange: {
    chip: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    icon: "text-orange-500 dark:text-orange-400",
    card: "border-orange-200 bg-orange-50 hover:bg-orange-100 dark:border-orange-800/50 dark:bg-orange-950/20 dark:hover:bg-orange-950/40",
  },
  pink: {
    chip: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
    icon: "text-pink-500 dark:text-pink-400",
    card: "border-pink-200 bg-pink-50 hover:bg-pink-100 dark:border-pink-800/50 dark:bg-pink-950/20 dark:hover:bg-pink-950/40",
  },
  cyan: {
    chip: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
    icon: "text-cyan-500 dark:text-cyan-400",
    card: "border-cyan-200 bg-cyan-50 hover:bg-cyan-100 dark:border-cyan-800/50 dark:bg-cyan-950/20 dark:hover:bg-cyan-950/40",
  },
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
