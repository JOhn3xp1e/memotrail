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
      const photos: RewindPhoto[] = [];
      let photoCount = 0;
      if (owners.size) await database.media.where("memoryId").anyOf([...owners.keys()]).each((media) => {
        if (media.type !== "image" || !(media.blob instanceof Blob) || !media.blob.size) return;
        photoCount++;
        const memory = owners.get(media.memoryId)!;
        const photo = { id: media.id, blob: media.blob, title: memory.title, favorite: memory.favorite };
        if (photos.length < 12) photos.push(photo);
        else if (memory.favorite) {
          const index = photos.findIndex((item) => !item.favorite);
          if (index >= 0) photos[index] = photo;
        }
      });
      return { stats, photos, photoCount, error: "" };
    } catch { return { error: "This rewind couldn’t be opened. Please try again." }; }
  }, [period, retry]);
}
