"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — only render after mount
  useEffect(() => setMounted(true), []);
  if (!mounted) return <span className="w-7 h-5 inline-block" aria-hidden />;

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Bytt til lyst tema" : "Bytt til mørkt tema"}
      title={isDark ? "Bytt til lyst tema" : "Bytt til mørkt tema"}
      className="text-blue-200 hover:text-white transition text-base leading-none
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
