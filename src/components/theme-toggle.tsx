"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { setTheme, useTheme } from "@/lib/theme-store";

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md border border-border",
        "text-muted hover:text-foreground hover:bg-surface-2 transition-colors",
        className,
      )}
    >
      {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
