import { create } from "zustand";
import { sampleMemories } from "@/lib/sample-data";

interface SampleState {
  favorites: string[];
  toggleFavorite: (id: string) => void;
}
// Interactions with the demo are session-only, too.
export const useSamples = create<SampleState>((set) => ({
  favorites: sampleMemories
    .filter((memory) => memory.favorite)
    .map((memory) => memory.id),
  toggleFavorite: (id) =>
    set(({ favorites }) => ({
      favorites: favorites.includes(id)
        ? favorites.filter((item) => item !== id)
        : [...favorites, id],
    })),
}));
