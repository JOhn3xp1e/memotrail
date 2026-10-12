import { useLiveQuery } from "dexie-react-hooks";
import { sampleCollections, sampleMemories } from "@/lib/sample-data";
import { getDatabase } from "@/services/database";
import { usePreferences } from "@/stores/preferences";
import type {
  CollectionView,
  MemoryView,
  PersonalCollectionView,
  PersonalMemoryView,
} from "@/types/memory";

export function useMemoryData() {
  const sampleMode = usePreferences((state) => state.sampleMode);
  const localData = useLiveQuery(async () => {
    const database = getDatabase();
    const [memories, media, collections] = await Promise.all([
      database.memories.orderBy("memoryDate").reverse().toArray(),
      database.media.toArray(),
      database.collections.orderBy("createdAt").reverse().toArray(),
    ]);
    const validMedia = media.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.memoryId === "string" &&
        item.blob instanceof Blob,
    );
    const mediaByMemory = new Map<string, (typeof validMedia)[number][]>();
    for (const item of validMedia) {
      const items = mediaByMemory.get(item.memoryId) ?? [];
      items.push(item);
      mediaByMemory.set(item.memoryId, items);
    }
    const mediaById = new Map(validMedia.map((item) => [item.id, item]));
    const memoriesView: PersonalMemoryView[] = memories.map((memory) => {
      const photos = (mediaByMemory.get(memory.id) ?? []).sort(
        (left, right) => left.order - right.order,
      );
      return {
        source: "personal",
        id: memory.id,
        title: memory.title,
        story: memory.description,
        date: memory.memoryDate,
        location: memory.locationName ?? "",
        mood: memory.mood,
        favorite: memory.favorite,
        collectionId: memory.collectionId,
        photos,
        image: photos[0]?.blob ?? null,
      };
    });
    const collectionsView: PersonalCollectionView[] = collections.map(
      (collection, index) => ({
        source: "personal",
        id: collection.id,
        title: collection.name,
        subtitle: collection.description || "A little chapter of your life",
        description: collection.description,
        coverMediaId: collection.coverMediaId,
        cover: collection.coverMediaId
          ? (mediaById.get(collection.coverMediaId)?.blob ?? null)
          : null,
        color: ["lavender", "peach", "rose"][index % 3] ?? "lavender",
        memoryCount: memories.filter(
          (memory) => memory.collectionId === collection.id,
        ).length,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt,
      }),
    );
    return { memories: memoriesView, collections: collectionsView };
  }, []);

  let memories: MemoryView[] = [];
  let collections: CollectionView[] = [];
  if (sampleMode) {
    memories = sampleMemories;
    collections = sampleCollections;
  } else if (localData) {
    memories = localData.memories;
    collections = localData.collections;
  }

  return {
    isSample: sampleMode,
    isLoading: !sampleMode && !localData,
    memories,
    collections,
    personalMemories: localData?.memories ?? [],
    personalCollections: localData?.collections ?? [],
  };
}
