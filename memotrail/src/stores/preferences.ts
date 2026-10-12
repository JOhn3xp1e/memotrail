import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

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
      storage: createJSONStorage(() => localStorage),
      partialize: ({ name, theme, sampleMode, reduceMotion }) => ({
        name,
        theme,
        sampleMode,
        reduceMotion,
      }),
    },
  ),
);
