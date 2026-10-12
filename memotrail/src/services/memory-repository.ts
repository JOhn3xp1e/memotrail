import type { Collection, Memory, MemoryPhoto } from "@/types/memory";

/** Phase 2 boundary: implement atomic writes, photo lifecycle, and migrations here. */
export interface MemoryRepository {
  listMemories(): Promise<Memory[]>;
  getMemory(id: string): Promise<Memory | undefined>;
  saveMemory(memory: Memory, photos: MemoryPhoto[]): Promise<void>;
  deleteMemory(id: string): Promise<void>;
  listCollections(): Promise<Collection[]>;
  saveCollection(collection: Collection): Promise<void>;
}
