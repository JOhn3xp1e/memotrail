// This helper is used only by isolated Playwright contexts. Schema: Dexie v4,
// native IDB version 40; see src/services/database.ts. Never a real profile.
export async function seedHelpJournal(page) {
  await page.evaluate(async () => {
    const images = await Promise.all(["golden-hour", "lake-weekend", "mountain-air"].map(async (name) => {
      const response = await fetch(`/photos/${name}.jpg`);
      if (!response.ok) throw new Error(`Missing local demo image ${name}`);
      return response.blob();
    }));
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open("memotrail"); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    if (database.version !== 40) throw new Error("Screenshot fixture needs the documented Dexie v4 schema.");
    const tx = database.transaction(["memories", "media", "collections", "timeCapsules", "timeCapsuleMedia", "settings"], "readwrite");
    const now = Date.parse("2026-10-14T04:00:00Z");
    const memories = [
      { id: "help-sea", title: "Weekend by the Sea", description: "A peaceful afternoon watching the sunset with friends.", memoryDate: "2025-06-07", favorite: true },
      { id: "help-anniversary", title: "A day to remember", description: "We took the long way home and watched the mountains turn golden.", memoryDate: "2025-10-14", favorite: true },
      { id: "help-lake", title: "Our little lake escape", description: "Slow conversations, still water, and a pocket full of happy moments.", memoryDate: "2025-06-08", favorite: false },
    ];
    for (const memory of memories) tx.objectStore("memories").put({ ...memory, createdAt: now, updatedAt: now, mood: "happy", collectionId: "help-adventures", locationName: "By the water" });
    for (const [index, blob] of images.entries()) tx.objectStore("media").put({ id: `help-photo-${index}`, memoryId: index < 2 ? "help-sea" : "help-anniversary", type: "image", blob, mimeType: blob.type, size: blob.size, order: index === 1 ? 1 : 0, createdAt: now });
    tx.objectStore("collections").put({ id: "help-adventures", name: "Favorite Adventures", description: "The places and people we want to remember.", coverMediaId: "help-photo-0", createdAt: now, updatedAt: now });
    for (const [id, title, unlockAt] of [["help-ready", "A little letter from yesterday", "2025-10-14T04:00:00Z"], ["help-future", "For a brighter tomorrow", "2035-10-14T04:00:00Z"]]) tx.objectStore("timeCapsules").put({ id, title, message: "Dear future me, remember the wonderful afternoon by the lake. Keep making time for the little things.", recipientName: "Future me", mood: "grateful", createdAt: "2025-01-01T04:00:00Z", updatedAt: "2025-01-01T04:00:00Z", unlockAt, status: "sealed" });
    tx.objectStore("timeCapsuleMedia").put({ id: "help-capsule-photo", capsuleId: "help-ready", blob: images[0], mimeType: images[0].type, createdAt: "2025-01-01T04:00:00Z", order: 0 });
    tx.objectStore("settings").put({ key: "memotrail-preferences", value: JSON.stringify({ state: { name: "memory keeper", theme: "dark", sampleMode: false, reduceMotion: true }, version: 1 }) });
    tx.objectStore("settings").put({ key: "onboarding", value: JSON.stringify({ completed: true, step: 4 }) });
    tx.objectStore("settings").put({ key: "backup-status", value: JSON.stringify({ reminders: false }) });
    await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onabort = () => reject(tx.error); tx.onerror = () => reject(tx.error); }); database.close();
  });
}
