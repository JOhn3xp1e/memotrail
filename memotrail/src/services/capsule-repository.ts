import { getDatabase } from "./database";
import { createId, memoryRepository } from "./memory-repository";
import { localDate } from "@/lib/utils";
import type { TimeCapsule, CapsuleMetadata } from "@/types/capsule";

export function capsuleMetadata(capsule: TimeCapsule): CapsuleMetadata {
  const { message: _message, recipientName: _recipient, mood: _mood, ...metadata } = capsule;
  return metadata;
}
export function capsuleError(error: unknown) {
  return error instanceof Error && /quota/i.test(error.name + error.message)
    ? "Your browser storage is full. Free some space on this device, then try again."
    : error instanceof Error ? error.message : "Could not save on this device. Please try again.";
}
export const capsuleRepository = {
  async list() {
    return (await getDatabase().timeCapsules.orderBy("createdAt").reverse().toArray()).map(capsuleMetadata);
  },
  async seal(input: Pick<TimeCapsule, "title" | "message" | "recipientName" | "mood" | "unlockAt">, photos: Blob[]) {
    if (!input.title.trim() || !input.message.trim()) throw new Error("Give your capsule a title and a letter.");
    if (!Number.isFinite(Date.parse(input.unlockAt)) || Date.parse(input.unlockAt) <= Date.now()) throw new Error("Choose an unlock date and time in the future.");
    if (photos.length > 12 || photos.some((blob) => !(blob instanceof Blob) || !blob.size || blob.size > 20 * 1024 * 1024 || !/^image\/(jpeg|png|webp|gif)$/.test(blob.type))) throw new Error("Choose up to 12 JPG, PNG, WebP or GIF photos, each under 20 MB.");
    const database = getDatabase();
    const id = createId();
    const now = new Date().toISOString();
    await database.transaction("rw", database.timeCapsules, database.timeCapsuleMedia, async () => {
      await database.timeCapsules.add({ ...input, title: input.title.trim(), message: input.message.trim(), id, createdAt: now, updatedAt: now, status: "sealed" });
      if (photos.length) await database.timeCapsuleMedia.bulkAdd(photos.map((blob, order) => ({ id: createId(), capsuleId: id, blob, mimeType: blob.type, createdAt: now, order })));
    });
    return id;
  },
  async open(id: string) {
    const database = getDatabase();
    await database.transaction("rw", database.timeCapsules, async () => {
      const capsule = await database.timeCapsules.get(id);
      if (!capsule) throw new Error("This capsule is no longer available.");
      if (capsule.status === "opened") return;
      if (!Number.isFinite(Date.parse(capsule.unlockAt)) || Date.now() < Date.parse(capsule.unlockAt)) throw new Error("This capsule is still sealed. Its day will come.");
      const now = new Date().toISOString();
      await database.timeCapsules.update(id, { status: "opened", openedAt: now, updatedAt: now });
    });
  },
  async remove(id: string) {
    const database = getDatabase();
    await database.transaction("rw", database.timeCapsules, database.timeCapsuleMedia, async () => {
      await database.timeCapsuleMedia.where("capsuleId").equals(id).delete();
      await database.timeCapsules.delete(id);
    });
  },
  async saveAsMemory(id: string) {
    const database = getDatabase();
    return database.transaction("rw", [database.timeCapsules, database.timeCapsuleMedia, database.memories, database.media, database.collections], async () => {
      const capsule = await database.timeCapsules.get(id);
      if (!capsule || capsule.status !== "opened") throw new Error("Open this capsule before saving it as a memory.");
      if (capsule.memoryId) return capsule.memoryId;
      const media = await database.timeCapsuleMedia.where("capsuleId").equals(id).sortBy("order");
      const photos = media.filter((item) => item.blob instanceof Blob && item.blob.size).map((item) => item.blob);
      const memoryId = createId();
      const now = Date.now();
      await memoryRepository.saveMemory({ id: memoryId, title: capsule.title, description: capsule.message, memoryDate: localDate(new Date(capsule.createdAt)), createdAt: now, updatedAt: now, mood: capsule.mood ?? "nostalgic", favorite: false }, photos);
      await database.timeCapsules.update(id, { memoryId, updatedAt: new Date().toISOString() });
      return memoryId;
    });
  },
};
