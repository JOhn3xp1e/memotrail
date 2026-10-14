import "fake-indexeddb/auto";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import Dexie from "dexie";

const legacy = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", { value: { getItem: (key: string) => legacy.get(key) ?? null } });
Object.defineProperty(navigator, "storage", { configurable: true, value: { estimate: async () => ({ quota: 2 ** 32, usage: 0 }) } });
const { getDatabase } = await import("../src/services/database");
const { usePreferences } = await import("../src/stores/preferences");
const { exportBackup, validateBackup, restoreBackup, previewMerge, sha256, journalTables, backupStatus, saveBackupStatus } = await import("../src/services/backup");
const db = getDatabase();

beforeEach(async () => {
  await db.transaction("rw", db.tables, async () => { for (const table of db.tables) await table.clear(); });
  await usePreferences.persist.rehydrate();
  Object.defineProperty(navigator, "storage", { configurable: true, value: { estimate: async () => ({ quota: 2 ** 32, usage: 0 }) } });
});
async function seed(large = false) {
  await db.memories.bulkAdd([1, 2].map((i) => ({ id: `m${i}`, title: `Memory ${i}`, description: `Story ${i}`, memoryDate: "2025-06-07", createdAt: i, updatedAt: i, mood: "happy" as const, favorite: i === 1, collectionId: "c1", locationName: "Singapore", latitude: 1.35, longitude: 103.8 })));
  const photos = [new Blob([large ? new Uint8Array(12 * 1024 * 1024).fill(91) : "original-photo-one"], { type: "image/png" }), new Blob(["original-photo-two"], { type: "image/jpeg" })];
  await db.media.bulkAdd(photos.map((blob, i) => ({ id: `p${i}`, memoryId: `m${i + 1}`, blob, mimeType: blob.type, size: blob.size, type: "image" as const, createdAt: 1, order: 0 })));
  await db.collections.add({ id: "c1", name: "Our days", description: "Together", coverMediaId: "p0", createdAt: 1, updatedAt: 1 });
  await db.tags.add({ id: "t1", name: "family" });
  await db.memoryTags.add({ memoryId: "m1", tagId: "t1" });
  await db.timeCapsules.add({ id: "cap1", title: "Tomorrow", message: "A sealed letter", recipientName: "Me", mood: "peaceful", createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z", unlockAt: "2030-01-01T00:00:00Z", status: "sealed", memoryId: "m1" });
  await db.timeCapsuleMedia.add({ id: "cp1", capsuleId: "cap1", blob: new Blob(["capsule-original"], { type: "image/png" }), mimeType: "image/png", createdAt: "2025-01-01T00:00:00Z", order: 0 });
  await db.settings.put({ key: "memotrail-preferences", value: JSON.stringify({ state: { name: "Memory keeper", theme: "dark", sampleMode: false, reduceMotion: true }, version: 1 }) });
  await saveBackupStatus({ reminders: false, lastBackup: 123 });
}
async function contents() {
  const result: Record<string, unknown> = {};
  for (const table of journalTables) {
    const rows = await db.table(table).toArray();
    result[table] = await Promise.all(rows.map(async (row) => {
      if (!(row.blob instanceof Blob)) return row;
      const { blob, ...rest } = row;
      return { ...rest, blobType: blob.type, blobHash: await sha256(new Uint8Array(await blob.arrayBuffer())) };
    }));
  }
  return result;
}
async function makeBackup() { await seed(); return exportBackup(); }
async function mutate(blob: Blob, action: (files: Record<string, Uint8Array>) => void, resign = false) {
  const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  action(files);
  if (resign) {
    const manifest = JSON.parse(strFromU8(files["manifest.json"]!));
    manifest.files = await Promise.all(manifest.files.map(async (entry: { path: string }) => ({ path: entry.path, size: files[entry.path]?.length ?? 0, sha256: await sha256(files[entry.path] ?? new Uint8Array()) })));
    files["manifest.json"] = strToU8(JSON.stringify(manifest));
  }
  return new Blob([zipSync(files) as Uint8Array<ArrayBuffer>]);
}

test("all seven journal tables, capsule letters, original bytes and settings round-trip into an empty database", async () => {
  const file = await makeBackup(); const original = await contents();
  const files = unzipSync(new Uint8Array(await file.arrayBuffer()));
  assert.ok(files["manifest.json"] && files["data.json"]);
  assert.equal(Object.keys(files).length, 5);
  const structured = strFromU8(files["data.json"]!);
  assert.ok(!structured.includes('"blob"') && !structured.includes("blob:"));
  const backup = await validateBackup(file);
  await db.transaction("rw", db.tables, async () => { for (const table of db.tables) await table.clear(); });
  await restoreBackup(backup, "merge");
  assert.deepEqual(await contents(), original);
  assert.equal(usePreferences.getState().name, "Memory keeper");
  assert.equal((await backupStatus()).reminders, false);
});
test("merge skips identical records on every repeated restore and preserves existing settings", async () => {
  const backup = await validateBackup(await makeBackup());
  const original = await contents();
  assert.equal((await previewMerge(backup)).additions, 0);
  await db.memories.add({ id: "extra", title: "New day", description: "Keep me", memoryDate: "2026-10-14", createdAt: 9, updatedAt: 9, mood: "grateful", favorite: false });
  await db.settings.put({ key: "memotrail-preferences", value: JSON.stringify({ state: { name: "Current name", theme: "light", sampleMode: false, reduceMotion: false }, version: 1 }) });
  await restoreBackup(backup, "merge"); await restoreBackup(backup, "merge");
  assert.equal(await db.memories.count(), 3); assert.equal(await db.media.count(), 2);
  assert.equal(usePreferences.getState().name, "Current name");
  assert.deepEqual((await contents()).media, original.media);
});
test("merge adds new related records to a populated journal", async () => {
  const backup = await validateBackup(await makeBackup());
  for (const table of journalTables) await db.table(table).clear();
  await db.memories.add({ id: "existing", title: "Keep", description: "Keep", memoryDate: "2025-01-01", createdAt: 1, updatedAt: 1, mood: "peaceful", favorite: false });
  await restoreBackup(backup, "merge");
  assert.equal(await db.memories.count(), 3); assert.equal((await db.collections.get("c1"))?.coverMediaId, "p0");
});
test("changed IDs and changed media bytes stop merge without overwriting any record", async () => {
  const backup = await validateBackup(await makeBackup());
  await db.memories.update("m1", { description: "A newer story" });
  const before = await contents();
  await assert.rejects(restoreBackup(backup, "merge"), /ID conflict/);
  assert.deepEqual(await contents(), before);
  await db.memories.update("m1", { description: "Story 1" });
  await db.media.update("p0", { blob: new Blob(["different-photo!!!"], { type: "image/png" }) });
  await assert.rejects(previewMerge(backup), /ID conflict in media/);
});
test("replace requires confirmation and restores exactly; last backup date remains local", async () => {
  const backup = await validateBackup(await makeBackup()); const original = await contents();
  await db.memories.update("m1", { title: "Newer" });
  await assert.rejects(restoreBackup(backup, "replace"), /confirmation/);
  assert.equal((await db.memories.get("m1"))?.title, "Newer");
  await saveBackupStatus({ lastBackup: 999 });
  await restoreBackup(backup, "replace", true);
  assert.deepEqual(await contents(), original); assert.equal((await backupStatus()).lastBackup, 999);
});
test("corrupt ZIP, wrong version, missing media, corrupt bytes, duplicates and broken relationships fail before import", async () => {
  const file = await makeBackup(); const before = await contents();
  await assert.rejects(validateBackup(new Blob(["not a zip"])));
  await assert.rejects(validateBackup(new Blob([new Uint8Array(await file.arrayBuffer()).slice(0, 100)])));
  await assert.rejects(validateBackup(await mutate(file, (files) => { const m = JSON.parse(strFromU8(files["manifest.json"]!)); m.formatVersion = 99; files["manifest.json"] = strToU8(JSON.stringify(m)); })), /version/);
  await assert.rejects(validateBackup(await mutate(file, (files) => { delete files["media/media/0.bin"]; })), /Missing/);
  await assert.rejects(validateBackup(await mutate(file, (files) => { files["media/media/0.bin"]![0] ^= 1; })), /Integrity/);
  for (const change of ["duplicate", "missing-reference", "invalid-field"] as const) {
    const modified = await mutate(file, (files) => {
      const body = JSON.parse(strFromU8(files["data.json"]!));
      if (change === "duplicate") body.data.memories.push(body.data.memories[0]);
      if (change === "missing-reference") body.data.media[0].memoryId = "missing";
      if (change === "invalid-field") body.data.memories[0].favorite = "yes";
      files["data.json"] = strToU8(JSON.stringify(body));
    }, true);
    await assert.rejects(validateBackup(modified));
  }
  assert.deepEqual(await contents(), before);
});
test("large stored photo backup preserves all 12 MiB byte-for-byte", async () => {
  await seed(true); const original = await contents(); const backup = await validateBackup(await exportBackup());
  await restoreBackup(backup, "replace", true); assert.deepEqual(await contents(), original);
});
test("insufficient estimated storage refuses restore without deleting data", async () => {
  const backup = await validateBackup(await makeBackup()); const before = await contents();
  Object.defineProperty(navigator, "storage", { configurable: true, value: { estimate: async () => ({ quota: 10, usage: 9 }) } });
  await assert.rejects(restoreBackup(backup, "replace", true), /Not enough/); assert.deepEqual(await contents(), before);
});
test("quota error during writes rolls back cleared tables, partially added rows and settings", async () => {
  const backup = await validateBackup(await makeBackup()); await db.memories.update("m1", { title: "Keep this newer title" });
  const before = await contents(); const settings = await db.settings.toArray();
  const fail = () => { throw new DOMException("No space", "QuotaExceededError"); };
  db.collections.hook("creating", fail);
  try { await assert.rejects(restoreBackup(backup, "replace", true), /No space/); }
  finally { db.collections.hook("creating").unsubscribe(fail); }
  assert.deepEqual(await contents(), before); assert.deepEqual(await db.settings.toArray(), settings);
  await restoreBackup(backup, "replace", true); assert.equal((await db.memories.get("m1"))?.title, "Memory 1");
});
test("interrupted write transaction is atomic and a retry succeeds", async () => {
  const backup = await validateBackup(await makeBackup()); await db.memories.update("m1", { title: "Keep" }); const before = await contents();
  const abort = () => { Dexie.currentTransaction!.abort(); };
  db.media.hook("creating", abort);
  try { await assert.rejects(restoreBackup(backup, "replace", true)); }
  finally { db.media.hook("creating").unsubscribe(abort); }
  assert.deepEqual(await contents(), before); await restoreBackup(backup, "replace", true);
});
test("unexpected paths, unreferenced files and safe extraction limits are rejected", async () => {
  const file = await makeBackup();
  await assert.rejects(validateBackup(await mutate(file, (files) => { files["../private.json"] = strToU8("{}"); })), /path/);
  await assert.rejects(validateBackup(await mutate(file, (files) => { files["media/media/999.bin"] = strToU8("extra"); })), /manifest/);
  const jsonBomb = new Blob([zipSync({ "data.json": new Uint8Array(17 * 1024 * 1024), "manifest.json": strToU8("{}") }) as Uint8Array<ArrayBuffer>]);
  await assert.rejects(validateBackup(jsonBomb), /limits/);
});
