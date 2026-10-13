import { useLiveQuery } from "dexie-react-hooks";
import { getDatabase } from "@/services/database";
import { rewindStats, type RewindPhoto } from "@/lib/rewind";

export function useRewindLibrary(retry = 0) {
  return useLiveQuery(async () => {
    try {
      const database = getDatabase();
      const [memories, collections] = await Promise.all([database.memories.orderBy("memoryDate").reverse().toArray(), database.collections.toArray()]);
      return { memories, collections, error: "" };
    } catch { return { memories: [], collections: [], error: "Your memories couldn’t be loaded. Please try again." }; }
  }, [retry]);
}
export function useRewind(period: string, retry = 0) {
  return useLiveQuery(async () => {
    try {
      const database = getDatabase();
      const [memories, collections] = await Promise.all([database.memories.toArray(), database.collections.toArray()]);
      const stats = rewindStats(memories, collections, period);
      const owners = new Map(stats.memories.map((memory) => [memory.id, memory]));
      const media = owners.size
        ? await database.media.where("memoryId").anyOf([...owners.keys()]).toArray()
        : [];
      const seen = new Set<string>();
      const photos: RewindPhoto[] = media
        .filter((item) => {
          if (seen.has(item.id) || item.type !== "image" || !(item.blob instanceof Blob) || !item.blob.size || !owners.has(item.memoryId)) return false;
          seen.add(item.id);
          return true;
        })
        .sort((a, b) => {
          const aMemory = owners.get(a.memoryId)!;
          const bMemory = owners.get(b.memoryId)!;
          return aMemory.memoryDate.localeCompare(bMemory.memoryDate) || a.memoryId.localeCompare(b.memoryId) || a.order - b.order || a.id.localeCompare(b.id);
        })
        .map((item) => {
          const memory = owners.get(item.memoryId)!;
          return {
            id: item.id,
            memoryId: memory.id,
            blob: item.blob,
            title: memory.title,
            story: memory.description,
            date: memory.memoryDate,
            mood: memory.mood,
            collectionId: memory.collectionId,
            favorite: memory.favorite,
          };
        });
      const photoCount = photos.length;
      return { stats, photos, photoCount, error: "" };
    } catch { return { error: "This rewind couldn’t be opened. Please try again." }; }
  }, [period, retry]);
}
