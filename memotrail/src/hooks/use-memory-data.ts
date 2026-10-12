import { sampleCollections, sampleMemories } from "@/lib/sample-data";
import { usePreferences } from "@/stores/preferences";

export function useMemoryData() {
  const sampleMode = usePreferences((state) => state.sampleMode);
  return {
    isSample: sampleMode,
    memories: sampleMode ? sampleMemories : [],
    collections: sampleMode ? sampleCollections : [],
  };
}
