import { useLiveQuery } from "dexie-react-hooks";
import { getDatabase } from "@/services/database";

export function useHeroPhotos() {
  return useLiveQuery(async () => {
    const database = getDatabase();
    const [memories, media] = await Promise.all([
      database.memories.orderBy("createdAt").reverse().toArray(),
      database.media.toArray(),
    ]);
    // Collections group these same memories; coverMediaId is not another upload.
    const photos = memories.flatMap((memory) =>
      media
        .filter((item) =>
          item.memoryId === memory.id &&
          item.type === "image" &&
          item.blob instanceof Blob &&
          item.blob.size > 0,
        )
        .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
        .map((photo) => ({ photo, memory })),
    );
    const left = photos[0];
    const others = photos.filter((item) => item.photo.id !== left?.photo.id);
    const right =
      others.find((item) => item.memory.favorite) ??
      others.find((item) => item.memory.id !== left?.memory.id) ??
      others[0];
    return { left, right };
  }, []);
}
