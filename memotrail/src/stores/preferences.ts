import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getDatabase } from "@/services/database";

export type Theme = "light" | "dark" | "system";
interface Preferences {
  name: string;
  theme: Theme;
  sampleMode: boolean;
  reduceMotion: boolean;
  setName: (name: string) => void;
  setTheme: (theme: Theme) => void;
  setSampleMode: (value: boolean) => void;
  setReduceMotion: (value: boolean) => void;
}

export const usePreferences = create<Preferences>()(
  persist(
    (set) => ({
      name: "",
      theme: "light",
      sampleMode: true,
      reduceMotion: false,
      setName: (name) => set({ name }),
      setTheme: (theme) => set({ theme }),
      setSampleMode: (sampleMode) => set({ sampleMode }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
    }),
    {
      name: "memotrail-preferences",
      version: 1,
      storage: createJSONStorage(() => ({
        async getItem(key: string) {
          const stored = await getDatabase().settings.get(key);
          // Read legacy preferences without deleting them during migration.
          return stored?.value ?? localStorage.getItem(key);
        },
        async setItem(key: string, value: string) {
          await getDatabase().settings.put({ key, value });
        },
        async removeItem(key: string) { await getDatabase().settings.delete(key); },
      })),
      partialize: ({ name, theme, sampleMode, reduceMotion }) => ({
        name,
        theme,
        sampleMode,
        reduceMotion,
      }),
    },
  ),
);
