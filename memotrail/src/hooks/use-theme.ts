import { useEffect, useSyncExternalStore } from "react";
import { usePreferences } from "@/stores/preferences";

const systemQuery = "(prefers-color-scheme: dark)";
function subscribeToSystemTheme(callback: () => void) {
  const query = window.matchMedia(systemQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export function useResolvedTheme() {
  const theme = usePreferences((state) => state.theme);
  const systemDark = useSyncExternalStore(subscribeToSystemTheme, () => window.matchMedia(systemQuery).matches);
  return theme === "dark" || (theme === "system" && systemDark);
}

export function useTheme() {
  const dark = useResolvedTheme();
  const reduceMotion = usePreferences((state) => state.reduceMotion);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.toggleAttribute("data-reduce-motion", reduceMotion);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#201e25" : "#FAF7F2");
  }, [dark, reduceMotion]);
}
