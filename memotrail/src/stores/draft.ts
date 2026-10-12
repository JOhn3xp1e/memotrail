import { create } from "zustand";
import { localDate } from "@/lib/utils";
import type { Mood } from "@/types/memory";

export interface MemoryDraft {
  title: string;
  story: string;
  date: string;
  location: string;
  mood: Mood;
  photos: File[];
}
const blankDraft = (): MemoryDraft => ({
  title: "",
  story: "",
  date: localDate(),
  location: "",
  mood: "grateful",
  photos: [],
});
interface DraftStore {
  draft: MemoryDraft;
  update: (fields: Partial<MemoryDraft>) => void;
  reset: () => void;
}

// Intentionally ephemeral: survives route changes, never saved to a database or localStorage.
export const useDraft = create<DraftStore>((set) => ({
  draft: blankDraft(),
  update: (fields) =>
    set((state) => ({ draft: { ...state.draft, ...fields } })),
  reset: () => set({ draft: blankDraft() }),
}));
