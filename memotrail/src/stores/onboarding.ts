import { create } from "zustand";
import { readIntroduction, saveIntroduction } from "@/services/onboarding";
import { usePreferences } from "./preferences";
type Status = "loading" | "required" | "ready" | "error";
let initialization: Promise<void> | undefined;
export const useIntroduction = create<{ status: Status; step: number; error: string; initialize: () => Promise<void>; advance: (step: number) => Promise<void>; complete: () => Promise<void> }>((set, get) => ({
  status: "loading", step: 0, error: "",
  initialize() {
    if (initialization) return initialization;
    if (get().status === "ready" || get().status === "required") return Promise.resolve();
    set({ status: "loading", error: "" });
    initialization = (async () => {
      try {
        if (!usePreferences.persist.hasHydrated()) await usePreferences.persist.rehydrate();
        const state = await readIntroduction();
        set({ status: state.completed ? "ready" : "required", step: state.step });
      } catch { set({ status: "error", error: "Your local journal could not be opened. Try again; your memories have not been changed." }); }
    })().finally(() => { initialization = undefined; });
    return initialization;
  },
  async advance(step) { await saveIntroduction({ completed: false, step }); set({ step }); },
  async complete() { await saveIntroduction({ completed: true, step: 0 }); set({ status: "ready", step: 0 }); },
}));
