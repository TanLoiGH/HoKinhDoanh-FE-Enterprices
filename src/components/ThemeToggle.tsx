"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "hkd-theme";

function resolveInitialTheme(): Theme {
  if (typeof document !== "undefined") {
    const current = document.documentElement.dataset.theme;
    if (current === "light" || current === "dark") {
      return current;
    }
  }

  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem(STORAGE_KEY, theme);
}

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>(() => resolveInitialTheme());

  const handleToggle = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={compact ? "theme-toggle-button h-11 w-11 justify-center p-0" : "theme-toggle-button px-3 py-2"}
      aria-label={theme === "light" ? "Chuyển sang giao diện tối" : "Chuyển sang giao diện sáng"}
      title={theme === "light" ? "Dark mode" : "Light mode"}
    >
      <span className="theme-toggle-chip" aria-hidden="true">
        {theme === "light" ? <MoonStar className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
      </span>
      {!compact && (
        <span className="text-left">
          <span className="block text-[10px] font-black uppercase tracking-widest text-app-soft">Theme</span>
          <span className="block text-xs font-black text-app-strong">{theme === "light" ? "Dark" : "Light"}</span>
        </span>
      )}
    </button>
  );
}
