import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { rewindPeriods, rewindStats, makeRewindSlides, type RewindPhoto } from "../src/lib/rewind";
import type { Memory } from "../src/types/memory";
import AxeBuilder from "@axe-core/playwright";

test("rewind statistics handle empty periods, ties, missing moods and creation dates", () => {
  const memories = [
    { id: "a", memoryDate: "2025-01-01", createdAt: Date.parse("2026-02-01T12:00:00Z"), title: "A", favorite: true, mood: "happy", collectionId: "c" },
    { id: "b", memoryDate: "2025-02-01", createdAt: Date.parse("2025-02-01T12:00:00Z"), title: "B", favorite: false, mood: "peaceful" },
    { id: "c", memoryDate: "2024-01-01", createdAt: Date.parse("2024-01-01T12:00:00Z"), title: "C", favorite: false },
  ] as Memory[];
  expect(rewindPeriods(memories)).toEqual({ months: ["2025-02", "2025-01", "2024-01"], years: ["2025", "2024"] });
  const stats = rewindStats(memories, [{ id: "c", name: "Together", description: "", createdAt: 1, updatedAt: 1 }], "2025");
  expect(stats.memories).toHaveLength(2);
  expect(stats.created).toBe(1);
  expect(stats.favorites).toHaveLength(1);
  expect(stats.collections).toHaveLength(1);
  expect(stats.topMonths).toEqual(["2025-01", "2025-02"]);
  expect(stats.topMoods).toEqual(["happy", "peaceful"]);
  expect(rewindStats(memories, [], "2024").moods).toEqual([]);
  expect(rewindStats(memories, [], "2023").memories).toEqual([]);
  expect(makeRewindSlides(stats, 3, [], "2025").find((slide) => slide.kind === "stats")?.lines).toContain("3 attached photos");
});

test("rewind uses stable unique photos and builds real Favorite Moments slides", () => {
  const memories: Memory[] = [
    { id: "m1", title: "Garden day", description: "We stayed until sunset.", memoryDate: "2025-01-04", createdAt: Date.parse("2025-01-04T12:00:00Z"), updatedAt: 1, favorite: true, mood: "happy", collectionId: "c1" },
    { id: "m2", title: "At the coast", description: "The wind was wild.", memoryDate: "2025-02-12", createdAt: Date.parse("2025-02-12T12:00:00Z"), updatedAt: 1, favorite: false, mood: "peaceful", collectionId: "c1" },
    { id: "m3", title: "A quiet morning", description: "Coffee and slow plans.", memoryDate: "2025-03-18", createdAt: Date.parse("2025-03-18T12:00:00Z"), updatedAt: 1, favorite: false, mood: "happy", collectionId: "c2" },
    { id: "m4", title: "Our little trip", description: "A new road to remember.", memoryDate: "2025-04-09", createdAt: Date.parse("2025-04-09T12:00:00Z"), updatedAt: 1, favorite: false, mood: "nostalgic", collectionId: "c2" },
  ];
  const collections = [
    { id: "c1", name: "Outside", description: "", createdAt: 1, updatedAt: 1 },
    { id: "c2", name: "Little trips", description: "", createdAt: 1, updatedAt: 1 },
  ];
  const photos: RewindPhoto[] = memories.flatMap((memory, memoryIndex) =>
    Array.from({ length: memoryIndex === 0 ? 8 : memoryIndex === 3 ? 4 : 5 }, (_, photoIndex) => ({
      id: `photo-${memory.id}-${photoIndex}`,
      memoryId: memory.id,
      blob: new Blob([`${memory.id}-${photoIndex}`], { type: "image/jpeg" }),
      title: memory.title,
      story: memory.description,
      date: memory.memoryDate,
      mood: memory.mood,
      collectionId: memory.collectionId,
      favorite: memory.favorite,
    })),
  );
  const stats = rewindStats(memories, collections, "2025");
  const slides = makeRewindSlides(stats, photos.length, photos, "2025");
  const again = makeRewindSlides(stats, photos.length, photos, "2025");
  const moments = slides.filter((slide) => slide.kind.startsWith("favorite-"));
  const presented = slides.flatMap((slide) => slide.photos ?? []).map((photo) => photo.id);

  expect(photos).toHaveLength(22);
  expect(slides.find((slide) => slide.kind === "stats")?.lines).toContain("22 attached photos");
  expect(moments.length).toBeGreaterThanOrEqual(2);
  expect(moments.length).toBeLessThanOrEqual(4);
  expect(moments[0]?.title).toBe("Your Favorite Moments");
  expect(moments[0]?.subtitle).toBe("The little moments that made your story unforgettable.");
  expect(moments[0]?.photos?.[0]?.favorite).toBe(true);
  expect(moments[0]?.photos?.[0]?.memoryId).toBe("m1");
  expect(moments[0]?.story).toBe("We stayed until sunset.");
  expect(moments.some((slide) => slide.kind === "favorite-collage" && slide.photos?.length === 4)).toBe(true);
  expect(slides.find((slide) => slide.kind === "collections")?.collectionCards?.map((card) => card.name)).toEqual(["Outside", "Little trips"]);
  expect(new Set(presented).size).toBe(presented.length);
  expect(slides.map((slide) => [slide.kind, slide.photos?.map((photo) => photo.id)])).toEqual(again.map((slide) => [slide.kind, slide.photos?.map((photo) => photo.id)]));

  const oneMemoryPhotos = photos.filter((photo) => photo.memoryId === "m1");
  const oneMemoryStats = rewindStats([memories[0]!], collections, "2025-01");
  const oneMemorySlides = makeRewindSlides(oneMemoryStats, oneMemoryPhotos.length, oneMemoryPhotos, "2025-01");
  expect(oneMemorySlides.filter((slide) => slide.kind.startsWith("favorite-"))).toHaveLength(2);
  expect(oneMemorySlides.filter((slide) => slide.kind.startsWith("favorite-")).flatMap((slide) => slide.photos ?? []).every((photo) => photo.favorite)).toBe(true);
  const onePhotoSlides = makeRewindSlides(oneMemoryStats, 1, oneMemoryPhotos.slice(0, 1), "2025-01");
  expect(onePhotoSlides.filter((slide) => slide.kind.startsWith("favorite-"))).toHaveLength(0);
});

test("rewind uses actual periods, navigates stories and exports PNG offline", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/rewind");
  await expect(page.getByRole("heading", { name: "Your story is waiting to unfold." })).toBeVisible();
  await page.evaluate(async () => {
    const landscape = await (await fetch("/photos/lake-weekend.jpg")).blob();
    const canvas = document.createElement("canvas"); canvas.width = 200; canvas.height = 400;
    const drawing = canvas.getContext("2d")!; drawing.fillStyle = "#ab7fc3"; drawing.fillRect(0, 0, 200, 400);
    const portrait = await new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob!)));
    const database = await new Promise<IDBDatabase>((resolve) => { const request = indexedDB.open("memotrail"); request.onsuccess = () => resolve(request.result); });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(["memories", "media", "collections"], "readwrite");
      transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error);
      transaction.objectStore("collections").put({ id: "friends", name: "Our days", description: "", createdAt: 1, updatedAt: 1 });
      ["2026-04-01", "2026-04-15", "2026-05-10", "2025-06-01"].forEach((date, index) => {
        transaction.objectStore("memories").put({ id: `rewind-${index}`, title: `Moment ${index}`, description: "A lovely afternoon.", memoryDate: date, createdAt: Date.parse(`${date}T12:00:00Z`), updatedAt: 1, favorite: index === 0, mood: index === 3 ? undefined : "happy", collectionId: "friends" });
        if (index < 2) transaction.objectStore("media").put({ id: `photo-${index}`, memoryId: `rewind-${index}`, type: "image", blob: index ? portrait : landscape, mimeType: index ? "image/png" : "image/jpeg", order: 0, createdAt: 1 });
      });
      transaction.objectStore("media").put({ id: "missing", memoryId: "rewind-2", type: "image", blob: null, order: 0, createdAt: 1 });
    }); database.close();
  });
  await page.reload();
  await expect(page.locator(".rewind-period")).toHaveCount(3);
  await page.getByRole("button", { name: "Yearly Rewind", exact: true }).click();
  await expect(page.locator(".rewind-period")).toHaveCount(2);
  await page.locator(".rewind-period").filter({ hasText: "2026" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".rewind-slide h2")).toHaveText("2026");
  await expect(dialog.locator(".rewind-backdrop img")).toHaveAttribute("src", /^blob:/);
  await page.getByRole("button", { name: "Next slide", exact: true }).click();
  await expect(dialog.locator(".rewind-slide")).toContainText("3 moments worth keeping");
  await expect(dialog.locator(".rewind-slide")).toContainText("2 attached photos");
  await expect(dialog.locator(".rewind-slide")).toContainText("1 favorite memories");
  await page.keyboard.press("ArrowRight");
  await expect(dialog.locator(".rewind-slide h2")).toHaveText("happy");
  await page.keyboard.press("ArrowLeft");
  await expect(dialog.locator(".rewind-slide h2")).toHaveText("3 moments worth keeping");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  const download = await downloadPromise;
  await download.saveAs("artifacts/rewind-stats.png");
  const png = await readFile("artifacts/rewind-stats.png");
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  expect(png.readUInt32BE(16)).toBe(1080);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "Monthly Rewind", exact: true }).click();
  await page.locator(".rewind-period").filter({ hasText: "May 2026" }).click();
  await page.getByRole("button", { name: "Next slide", exact: true }).click();
  await expect(dialog.locator(".rewind-slide")).toContainText("1 moments worth keeping");
  await expect(dialog.locator(".rewind-slide")).toContainText("0 attached photos");
  await page.keyboard.press("Escape");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.context().setOffline(true);
  await page.goto("/rewind?period=2026-04");
  await expect(dialog.locator(".rewind-slide h2")).toHaveText("April 2026");
  const offlineDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  await (await offlineDownload).saveAs("artifacts/rewind-photo.png");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "artifacts/rewind-mobile.png", fullPage: true });
  await dialog.locator(".rewind-stage").evaluate((target) => {
    target.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [new Touch({ identifier: 1, target, clientX: 220, clientY: 200 })] }));
    target.dispatchEvent(new TouchEvent("touchend", { bubbles: true, changedTouches: [new Touch({ identifier: 1, target, clientX: 50, clientY: 205 })] }));
  });
  await expect(dialog.locator(".rewind-slide")).toContainText("2 moments worth keeping");
  await page.keyboard.press("Escape");
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Open Rewind", exact: true })).toBeVisible();
});

test("four-photo story collage stays inside the card with mobile controls visible", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/rewind");
  await expect(page.getByRole("heading", { name: "Your story is waiting to unfold." })).toBeVisible();
  await page.evaluate(async () => {
    const memories = [
      { id: "story-1", title: "Garden day", description: "We stayed until sunset.", memoryDate: "2025-01-04", favorite: true, mood: "happy", collectionId: "story-c1" },
      { id: "story-2", title: "At the coast", description: "The wind was wild.", memoryDate: "2025-02-12", favorite: false, mood: "peaceful", collectionId: "story-c1" },
      { id: "story-3", title: "A quiet morning", description: "Coffee and slow plans.", memoryDate: "2025-03-18", favorite: false, mood: "happy", collectionId: "story-c2" },
      { id: "story-4", title: "Our little trip", description: "A new road to remember.", memoryDate: "2025-04-09", favorite: false, mood: "nostalgic", collectionId: "story-c2" },
    ];
    const attachments = [];
    for (const [memoryIndex, memory] of memories.entries()) {
      const count = memoryIndex === 0 ? 8 : memoryIndex === 3 ? 4 : 5;
      for (let photoIndex = 0; photoIndex < count; photoIndex++) {
        const canvas = document.createElement("canvas"); canvas.width = 120; canvas.height = 180;
        const context = canvas.getContext("2d")!;
        context.fillStyle = `hsl(${(memoryIndex * count + photoIndex) * 29} 45% 58%)`;
        context.fillRect(0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob>((resolve) => canvas.toBlob((image) => resolve(image!)));
        attachments.push({ id: `story-photo-${memory.id}-${photoIndex}`, memoryId: memory.id, type: "image", blob, mimeType: "image/png", size: blob.size, order: photoIndex, createdAt: 1 });
      }
    }
    const database = await new Promise<IDBDatabase>((resolve) => { const request = indexedDB.open("memotrail"); request.onsuccess = () => resolve(request.result); });
    const transaction = database.transaction(["memories", "media", "collections"], "readwrite");
    transaction.objectStore("collections").put({ id: "story-c1", name: "Outside", description: "", createdAt: 1, updatedAt: 1 });
    transaction.objectStore("collections").put({ id: "story-c2", name: "Little trips", description: "", createdAt: 1, updatedAt: 1 });
    for (const memory of memories) transaction.objectStore("memories").put({ ...memory, createdAt: Date.parse(`${memory.memoryDate}T12:00:00Z`), updatedAt: 1 });
    for (const attachment of attachments) transaction.objectStore("media").put(attachment);
    await new Promise<void>((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); });
    database.close();
  });
  await page.reload();
  await page.getByRole("button", { name: "Yearly Rewind", exact: true }).click();
  await page.locator(".rewind-period").filter({ hasText: "2025" }).click();
  const dialog = page.getByRole("dialog");
  const pauseButton = dialog.locator(".rewind-controls button").nth(1);
  await expect(pauseButton).toBeVisible();
  if (await pauseButton.getAttribute("aria-label") === "Pause rewind") await pauseButton.click();
  const collage = dialog.locator(".rewind-slide.rewind-favorite-collage");
  for (let step = 0; step < 12 && !(await collage.count()); step++) {
    await page.getByRole("button", { name: "Next slide" }).click();
  }
  await expect(collage).toBeVisible();
  await expect(collage.locator(".rewind-collage > .rewind-photo-tile")).toHaveCount(4);
  await expect(collage.locator(".rewind-photo-caption")).toHaveCount(4);
  const geometry = await page.evaluate(() => {
    const card = document.querySelector(".rewind-favorite-collage")!.getBoundingClientRect();
    const tiles = [...document.querySelectorAll(".rewind-favorite-collage .rewind-collage > .rewind-photo-tile")].map((tile) => {
      const bounds = tile.getBoundingClientRect();
      return { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom, width: bounds.width, height: bounds.height };
    });
    const controls = document.querySelector(".rewind-controls")!.getBoundingClientRect();
    const close = document.querySelector(".rewind-player .dialog-close")!.getBoundingClientRect();
    return { card: { left: card.left, top: card.top, right: card.right, bottom: card.bottom }, controls: { top: controls.top, bottom: controls.bottom }, close: { top: close.top, bottom: close.bottom }, tiles, width: innerWidth, height: innerHeight };
  });
  expect(geometry.tiles).toHaveLength(4);
  for (const tile of geometry.tiles) {
    expect(tile.left).toBeGreaterThanOrEqual(geometry.card.left);
    expect(tile.top).toBeGreaterThanOrEqual(geometry.card.top);
    expect(tile.right).toBeLessThanOrEqual(geometry.card.right);
    expect(tile.bottom).toBeLessThanOrEqual(geometry.card.bottom);
  }
  expect(geometry.tiles[0]!.width).toBeCloseTo(geometry.tiles[1]!.width, 0);
  expect(geometry.tiles[0]!.height).toBeCloseTo(geometry.tiles[2]!.height, 0);
  expect(geometry.controls.top).toBeGreaterThanOrEqual(0);
  expect(geometry.controls.bottom).toBeLessThanOrEqual(geometry.height);
  expect(geometry.close.top).toBeGreaterThanOrEqual(0);
  expect(geometry.close.bottom).toBeLessThanOrEqual(geometry.height);
  expect(await page.getByRole("button", { name: "Previous slide" }).isVisible()).toBe(true);
  expect(await page.getByRole("button", { name: "Resume rewind" }).isVisible()).toBe(true);
  expect(await page.getByRole("button", { name: "Next slide" }).isVisible()).toBe(true);
  expect(await page.getByRole("button", { name: "Export PNG" }).isVisible()).toBe(true);
  expect(await dialog.getByRole("button", { name: "Close" }).isVisible()).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("rewind dashboard is accessible in light and dark themes", async ({ page }) => {
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/rewind");
    for (const theme of ["light", "dark"]) {
      if (theme === "dark") await page.getByRole("button", { name: "Switch to dark theme" }).click();
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(result.violations).toEqual([]);
    }
    await page.getByRole("button", { name: "Switch to light theme" }).click();
  }
});
