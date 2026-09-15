/** A curated set of light pastel swatches for user-chosen colors (Spaces, Collections, Quick Links). */
export const PASTEL_SWATCHES = [
  "#c4b5fd", // violet
  "#7dd3fc", // sky
  "#fcd34d", // amber
  "#6ee7b7", // emerald
  "#fda4af", // rose
  "#5eead4", // teal
  "#f9a8d4", // pink
  "#fdba74", // orange
];

/**
 * Picks readable text color (near-black or white) for a given hex background,
 * using relative luminance so both legacy vivid colors and new light pastels
 * render with accessible contrast automatically — no per-color lookup table needed.
 */
/**
 * A light tint of a user-chosen color, for use as a whole card's background —
 * paired with the `hover-darken` class below, which uses a CSS brightness
 * filter so hovering visibly darkens the tint regardless of the underlying hue.
 */
export function cardTintStyle(hex: string): { backgroundColor: string; borderColor: string } {
  return { backgroundColor: `${hex}26`, borderColor: `${hex}55` };
}

export const HOVER_DARKEN_CLASS = "transition-[filter] hover:brightness-90 dark:hover:brightness-150";

export function getReadableTextColor(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#ffffff";
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance > 0.45 ? "#1e293b" : "#ffffff";
}
