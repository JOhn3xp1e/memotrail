import Dexie, { type EntityTable, type Table } from "dexie";
import type {
  Collection,
  Media,
  Memory,
  MemoryTag,
  Tag,
} from "@/types/memory";

export class MemoTrailDatabase extends Dexie {
  memories!: EntityTable<Memory, "id">;
  media!: EntityTable<Media, "id">;
  collections!: EntityTable<Collection, "id">;
  tags!: EntityTable<Tag, "id">;
  memoryTags!: Table<MemoryTag, [string, string]>;

  constructor() {
    super("memotrail");
    this.version(1).stores({
      memories: "id, date, createdAt, updatedAt, *tags, *collectionIds",
      photos: "id, memoryId, [memoryId+order]",
      collections: "id, title, createdAt",
    });
    this.version(2)
      .stores({
        memories:
          "id, memoryDate, createdAt, updatedAt, favorite, collectionId",
        media: "id, memoryId, [memoryId+order], createdAt",
        photos: null,
        collections: "id, name, createdAt, updatedAt",
        tags: "id, &name",
        memoryTags: "&[memoryId+tagId], memoryId, tagId",
      })
      .upgrade(async (transaction) => {
        const memories = transaction.table("memories");
        await memories.toCollection().modify((memory) => {
          const now = Date.now();
          memory.description ??= memory.story ?? "";
          memory.memoryDate ??= memory.date ?? new Date().toISOString().slice(0, 10);
          memory.createdAt ??= now;
          memory.updatedAt ??= memory.createdAt;
          memory.favorite ??= false;
          memory.mood ??= "grateful";
          memory.locationName ??= memory.location;
          delete memory.story;
          delete memory.date;
          delete memory.location;
          delete memory.tags;
          delete memory.collectionIds;
        });

        const photos = transaction.table("photos");
        const legacyPhotos = await photos.toArray();
        if (legacyPhotos.length) {
          const migrated: Media[] = legacyPhotos
            .filter((photo) => photo.blob instanceof Blob)
            .map((photo, order) => ({
            id: photo.id,
            memoryId: photo.memoryId,
            type: "image",
            blob: photo.blob,
            mimeType: photo.blob?.type ?? "image/jpeg",
            size: photo.blob?.size ?? 0,
            createdAt: Date.now(),
            order: photo.order ?? order,
            }));
          await transaction.table("media").bulkPut(migrated);
        }

        await transaction.table("collections").toCollection().modify((item) => {
          item.name ??= item.title ?? "Untitled collection";
          item.description ??= "";
          item.createdAt ??= Date.now();
          item.updatedAt ??= item.createdAt ?? Date.now();
          delete item.title;
        });
      });
  }
}

let database: MemoTrailDatabase | undefined;
export function getDatabase() {
  return (database ??= new MemoTrailDatabase());
}
