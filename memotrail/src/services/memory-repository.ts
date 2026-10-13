import type { Collection, Media, Memory, MemoryTag } from "@/types/memory";
import { getDatabase } from "@/services/database";

export function createId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  const bytes = globalThis.crypto?.getRandomValues
    ? globalThis.crypto.getRandomValues(new Uint8Array(16))
    : Uint8Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

export interface MemoryRepository {
  listMemories(): Promise<Memory[]>;
  getMemory(id: string): Promise<Memory | undefined>;
  listMedia(memoryId: string): Promise<Media[]>;
  saveMemory(memory: Memory, photos: Blob[]): Promise<void>;
  deleteMemory(id: string): Promise<void>;
  toggleFavorite(id: string): Promise<void>;
  listCollections(): Promise<Collection[]>;
  saveCollection(collection: Collection): Promise<void>;
  setCollectionCover(collectionId: string, mediaId?: string): Promise<void>;
  deleteCollection(id: string): Promise<void>;
  replaceMemoryTags(memoryId: string, tagIds: string[]): Promise<void>;
}

export const memoryRepository: MemoryRepository = {
  async listMemories() {
    return getDatabase().memories.orderBy("memoryDate").reverse().toArray();
  },

  async getMemory(id) {
    return getDatabase().memories.get(id);
  },

  async listMedia(memoryId) {
    return getDatabase().media
      .where("memoryId")
      .equals(memoryId)
      .sortBy("order");
  },

  async saveMemory(memory, photos) {
    const database = getDatabase();
    await database.transaction(
      "rw",
      database.memories,
      database.media,
      database.collections,
      async () => {
        if (
          memory.collectionId &&
          !(await database.collections.get(memory.collectionId))
        ) {
          throw new Error(
            "That collection is no longer available. Choose another collection.",
          );
        }
        if (photos.some((blob) => !(blob instanceof Blob))) {
          throw new Error("One or more photos are no longer available.");
        }
        const oldMedia = await database.media
          .where("memoryId")
          .equals(memory.id)
          .toArray();
        await database.memories.put(memory);
        await database.media.where("memoryId").equals(memory.id).delete();
        if (photos.length) {
          const createdAt = Date.now();
          await database.media.bulkAdd(
            photos.map((blob, order) => ({
              id: createId(),
              memoryId: memory.id,
              type: "image" as const,
              blob,
              mimeType: blob.type || "image/jpeg",
              size: blob.size,
              createdAt,
              order,
            })),
          );
        }
        const oldIds = new Set(oldMedia.map((item) => item.id));
        if (oldIds.size) {
          await database.collections.toCollection().modify((collection) => {
            if (collection.coverMediaId && oldIds.has(collection.coverMediaId)) {
              delete collection.coverMediaId;
              collection.updatedAt = Date.now();
            }
          });
        }
      },
    );
  },

  async deleteMemory(id) {
    const database = getDatabase();
    await database.transaction(
      "rw",
      database.memories,
      database.media,
      database.memoryTags,
      database.collections,
      async () => {
        const media = await database.media.where("memoryId").equals(id).toArray();
        const removedMedia = new Set(media.map((item) => item.id));
        await database.media.where("memoryId").equals(id).delete();
        await database.memories.delete(id);
        await database.memoryTags.where("memoryId").equals(id).delete();
        if (removedMedia.size) {
          await database.collections.toCollection().modify((collection) => {
            if (collection.coverMediaId && removedMedia.has(collection.coverMediaId)) {
              delete collection.coverMediaId;
              collection.updatedAt = Date.now();
            }
          });
        }
      },
    );
  },

  async toggleFavorite(id) {
    const database = getDatabase();
    const updated = await database.memories.update(id, (memory) => {
      memory.favorite = !memory.favorite;
      memory.updatedAt = Date.now();
    });
    if (!updated) throw new Error("This memory is no longer available.");
  },

  async listCollections() {
    return getDatabase().collections.orderBy("createdAt").reverse().toArray();
  },

  async saveCollection(collection) {
    await getDatabase().collections.put(collection);
  },

  async setCollectionCover(collectionId, mediaId) {
    const database = getDatabase();
    await database.transaction("rw", database.collections, database.memories, database.media, async () => {
      if (!(await database.collections.get(collectionId))) {
        throw new Error("This collection is no longer available.");
      }
      if (mediaId) {
        const photo = await database.media.get(mediaId);
        const memory = photo && await database.memories.get(photo.memoryId);
        if (!photo || photo.type !== "image" || !(photo.blob instanceof Blob) || !photo.blob.size || memory?.collectionId !== collectionId) {
          throw new Error("This photo is no longer in this collection. Choose another photo.");
        }
      }
      await database.collections.update(collectionId, (collection) => {
        if (mediaId) collection.coverMediaId = mediaId;
        else delete collection.coverMediaId;
        collection.updatedAt = Date.now();
      });
    });
  },

  async deleteCollection(id) {
    const database = getDatabase();
    await database.transaction(
      "rw",
      database.collections,
      database.memories,
      async () => {
        await database.collections.delete(id);
        await database.memories
          .where("collectionId")
          .equals(id)
          .modify((memory) => {
            delete memory.collectionId;
            memory.updatedAt = Date.now();
          });
      },
    );
  },

  async replaceMemoryTags(memoryId, tagIds) {
    const database = getDatabase();
    await database.transaction(
      "rw",
      database.memoryTags,
      database.tags,
      async () => {
      const tags = [...new Set(tagIds)];
      const existingTags = await database.tags.bulkGet(tags);
      if (existingTags.some((tag) => !tag)) {
        throw new Error("One or more selected tags are no longer available.");
      }
      await database.memoryTags.where("memoryId").equals(memoryId).delete();
      const links: MemoryTag[] = tags.map((tagId) => ({
        memoryId,
        tagId,
      }));
      if (links.length) await database.memoryTags.bulkAdd(links);
      },
    );
  },
};
