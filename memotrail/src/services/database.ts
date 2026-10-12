import Dexie, { type EntityTable } from "dexie";
import type { Collection, Memory, MemoryPhoto } from "@/types/memory";

export class MemoTrailDatabase extends Dexie {
  memories!: EntityTable<Memory, "id">;
  photos!: EntityTable<MemoryPhoto, "id">;
  collections!: EntityTable<Collection, "id">;

  constructor() {
    super("memotrail");
    this.version(1).stores({
      memories: "id, date, createdAt, updatedAt, *tags, *collectionIds",
      photos: "id, memoryId, [memoryId+order]",
      collections: "id, title, createdAt",
    });
  }
}

// Lazy foundation. Phase 1 never opens or seeds the database.
let database: MemoTrailDatabase | undefined;
export function getDatabase() {
  return (database ??= new MemoTrailDatabase());
}
