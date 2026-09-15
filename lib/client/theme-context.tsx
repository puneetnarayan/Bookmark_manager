"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";
type Density = "compact" | "comfortable";

interface ThemeContextValue {
  theme: Theme;
  density: Density;
  setTheme: (theme: Theme) => void;
  setDensity: (density: Density) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "workspace-ui-prefs";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [density, setDensityState] = useState<Density>("comfortable");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.theme) setThemeState(parsed.theme);
        if (parsed.density) setDensityState(parsed.density);
      }
    } catch {
      // ignore — local prefs are a convenience, not the source of truth
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function applyResolvedTheme() {
      const resolved = theme === "system" ? (media.matches ? "dark" : "light") : theme;
      root.setAttribute("data-theme", resolved);
    }

    applyResolvedTheme();
    if (theme === "system") {
      media.addEventListener("change", applyResolvedTheme);
      return () => media.removeEventListener("change", applyResolvedTheme);
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-density", density);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, density }));
    } catch {
      // ignore — local prefs are a convenience, not the source of truth
    }
  }, [theme, density]);

  return (
    <ThemeContext.Provider
      value={{ theme, density, setTheme: setThemeState, setDensity: setDensityState }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
