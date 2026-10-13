import { useLiveQuery } from "dexie-react-hooks";
import { memoryRepository } from "@/services/memory-repository";
import { getDatabase } from "@/services/database";
import { sampleMemories, sampleCollections } from "@/lib/sample-data";

export function useMemoryDetails(id: string, sample: boolean, retry: number) {
  return useLiveQuery(async () => {
    try {
      if (sample) {
        const memory = sampleMemories.find((item) => item.id === id);
        if (!memory) return { missing: true as const };
        const collection = sampleCollections.find((item) => item.category === memory.category);
        return { memory: { ...memory, memoryDate: memory.date, description: memory.story, locationName: memory.location },
          photos: [{ id: memory.id, source: memory.image as Blob | string }],
          collection: collection ? { id: collection.id, name: collection.title } : undefined };
      }
      const memory = await memoryRepository.getMemory(id);
      if (!memory) return { missing: true as const };
      const [media, collection] = await Promise.all([
        memoryRepository.listMedia(id),
        memory.collectionId ? getDatabase().collections.get(memory.collectionId) : undefined,
      ]);
      return { memory, collection, photos: media.filter((photo) => photo.type === "image" && photo.blob instanceof Blob && photo.blob.size > 0)
        .map((photo) => ({ id: photo.id, source: photo.blob as Blob | string })) };
    } catch {
      return { error: "We couldn’t open this memory. Please try again." };
    }
  }, [id, sample, retry]);
}
