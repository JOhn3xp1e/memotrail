import Dexie from "dexie";
import { zip, unzip, strToU8, strFromU8, type AsyncZippable } from "fflate";
import { getDatabase } from "./database";
import { usePreferences } from "@/stores/preferences";

export const journalTables = ["memories", "media", "collections", "tags", "memoryTags", "timeCapsules", "timeCapsuleMedia"] as const;
type TableName = typeof journalTables[number];
type Row = Record<string, unknown>;
type Data = Record<TableName, Row[]>;
export type BackupSettings = { name: string; theme: "light" | "dark" | "system"; sampleMode: boolean; reduceMotion: boolean; reminders: boolean };
type FileInfo = { path: string; size: number; sha256: string };
type Manifest = { app: "MemoTrail"; formatVersion: 1; databaseVersion: 4; exportedAt: string; files: FileInfo[] };
export type ValidatedBackup = { manifest: Manifest; data: Data; settings: BackupSettings; mediaBytes: number };
export type Progress = (message: string) => void;
export const backupLimit = 512 * 1024 * 1024;
const jsonLimit = 16 * 1024 * 1024;
const preferencesKey = "memotrail-preferences";
export const backupStatusKey = "backup-status";
export type BackupStatus = { lastBackup?: number; dismissedAt?: number; reminders: boolean };

export async function backupStatus(): Promise<BackupStatus> {
  const stored = await getDatabase().settings.get(backupStatusKey);
  return stored ? JSON.parse(stored.value) : { reminders: true };
}
export async function saveBackupStatus(fields: Partial<BackupStatus>) {
  const db = getDatabase();
  await db.transaction("rw", db.settings, async () => {
    const state = await backupStatus();
    await db.settings.put({ key: backupStatusKey, value: JSON.stringify({ ...state, ...fields }) });
  });
}
export async function sha256(bytes: Uint8Array) {
  const hash = await crypto.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>);
  return Array.from(new Uint8Array(hash), (n) => n.toString(16).padStart(2, "0")).join("");
}
function requireValid(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
function object(value: unknown): value is Row { return !!value && typeof value === "object" && !Array.isArray(value); }
const text = (v: unknown) => typeof v === "string";
const id = (v: unknown) => text(v) && (v as string).length > 0 && (v as string).length <= 512;
const number = (v: unknown) => typeof v === "number" && Number.isFinite(v);
const timestamp = (v: unknown) => text(v) && Number.isFinite(Date.parse(v as string));
const mood = (v: unknown) => ["grateful", "happy", "peaceful", "nostalgic", "adventurous"].includes(v as string);
const schemas: Record<TableName, Record<string, (v: unknown) => boolean>> = {
  memories: { id, title: text, description: text, memoryDate: (v) => text(v) && /^\d{4}-\d{2}-\d{2}$/.test(v as string) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v, createdAt: number, updatedAt: number, mood, favorite: (v) => typeof v === "boolean", collectionId: id, locationName: text, latitude: (v) => number(v) && Math.abs(v as number) <= 90, longitude: (v) => number(v) && Math.abs(v as number) <= 180 },
  media: { id, memoryId: id, type: (v) => ["image", "video"].includes(v as string), mimeType: (v) => text(v) && /^(image|video)\/[\w.+-]+$/.test(v as string), size: (v) => number(v) && (v as number) > 0, createdAt: number, order: (v) => Number.isSafeInteger(v) && (v as number) >= 0, file: text },
  collections: { id, name: text, description: text, coverMediaId: id, createdAt: number, updatedAt: number },
  tags: { id, name: text },
  memoryTags: { memoryId: id, tagId: id },
  timeCapsules: { id, title: text, message: text, recipientName: text, mood, createdAt: timestamp, updatedAt: timestamp, unlockAt: timestamp, openedAt: timestamp, status: (v) => ["sealed", "opened"].includes(v as string), memoryId: id },
  timeCapsuleMedia: { id, capsuleId: id, mimeType: (v) => text(v) && /^image\/[\w.+-]+$/.test(v as string), createdAt: timestamp, order: (v) => Number.isSafeInteger(v) && (v as number) >= 0, file: text },
};
schemas.media.blobType = text;
schemas.timeCapsuleMedia.blobType = text;
const required: Record<TableName, string[]> = {
  memories: ["id", "title", "description", "memoryDate", "createdAt", "updatedAt", "mood", "favorite"],
  media: ["id", "memoryId", "type", "mimeType", "size", "createdAt", "order", "file"],
  collections: ["id", "name", "description", "createdAt", "updatedAt"], tags: ["id", "name"], memoryTags: ["memoryId", "tagId"],
  timeCapsules: ["id", "title", "message", "createdAt", "updatedAt", "unlockAt", "status"],
  timeCapsuleMedia: ["id", "capsuleId", "mimeType", "createdAt", "order", "file"],
};
function validateData(value: unknown): asserts value is Data {
  requireValid(object(value) && Object.keys(value).length === journalTables.length, "Invalid backup tables.");
  for (const table of journalTables) {
    const rows = value[table];
    requireValid(Array.isArray(rows) && rows.length <= 100_000, `Invalid ${table} table.`);
    const keys = new Set<string>();
    for (const row of rows) {
      requireValid(object(row) && required[table].every((key) => key in row), `Missing fields in ${table}.`);
      for (const [key, field] of Object.entries(row)) {
        // IndexedDB preserves optional properties explicitly set to undefined;
        // JSON omits them. Validate these just like an absent optional field.
        const absentOptional = field === undefined && !required[table].includes(key);
        requireValid(Object.hasOwn(schemas[table], key) && (absentOptional || schemas[table][key]?.(field)), `Invalid ${table}.${key}.`);
      }
      const key = table === "memoryTags" ? JSON.stringify([row.memoryId, row.tagId]) : row.id as string;
      requireValid(!keys.has(key), `Duplicate ID in ${table}.`); keys.add(key);
    }
  }
  const data = value as Data;
  const ids = (table: TableName) => new Set(data[table].map((row) => row.id));
  const memories = ids("memories"), collections = ids("collections"), media = ids("media"), capsules = ids("timeCapsules"), tags = ids("tags");
  requireValid(new Set(data.tags.map((r) => r.name)).size === data.tags.length, "Duplicate tag names.");
  for (const r of data.memories) requireValid(!r.collectionId || collections.has(r.collectionId), "Missing collection reference.");
  for (const r of data.media) requireValid(memories.has(r.memoryId), "Missing memory for media.");
  for (const r of data.collections) {
    requireValid(!r.coverMediaId || media.has(r.coverMediaId), "Missing collection cover.");
    if (r.coverMediaId) {
      const cover = data.media.find((m) => m.id === r.coverMediaId)!;
      requireValid(cover.type === "image" && data.memories.some((m) => m.id === cover.memoryId && m.collectionId === r.id), "Collection cover belongs to another collection.");
    }
  }
  for (const r of data.memoryTags) requireValid(memories.has(r.memoryId) && tags.has(r.tagId), "Missing tag relationship.");
  // A capsule's saved-as-memory ID is historical; the user may have deleted that memory.
  for (const r of data.timeCapsuleMedia) requireValid(capsules.has(r.capsuleId), "Missing capsule for media.");
}
function validateSettings(value: unknown): asserts value is BackupSettings {
  requireValid(object(value) && Object.keys(value).length === 5 && text(value.name) && ["light", "dark", "system"].includes(value.theme as string) && typeof value.sampleMode === "boolean" && typeof value.reduceMotion === "boolean" && typeof value.reminders === "boolean", "Invalid app settings.");
}
async function snapshot(): Promise<Data> {
  const db = getDatabase();
  return db.transaction("r", db.tables, async () => {
    const data = {} as Data;
    for (const table of journalTables) data[table] = await db.table(table).toArray();
    return data;
  });
}
export async function exportBackup(progress: Progress = () => {}): Promise<Blob> {
  progress("Reading your journal…");
  if (!usePreferences.persist.hasHydrated()) await usePreferences.persist.rehydrate();
  const db = getDatabase();
  const { data, settings } = await db.transaction("r", db.tables, async () => {
    const data = await snapshot();
    const stored = await db.settings.get(preferencesKey);
    const prefs = stored ? JSON.parse(stored.value).state : usePreferences.getState();
    const settings: BackupSettings = { name: prefs.name, theme: prefs.theme, sampleMode: prefs.sampleMode, reduceMotion: prefs.reduceMotion, reminders: (await backupStatus()).reminders };
    return { data, settings };
  });
  const files: AsyncZippable = Object.create(null);
  const attachmentRows = [...data.media, ...data.timeCapsuleMedia];
  requireValid(attachmentRows.length < 9_999 && attachmentRows.reduce((sum, row) => sum + (row.blob instanceof Blob ? row.blob.size : 0), 0) <= backupLimit, "Journal exceeds backup limits: 512 MiB and fewer than 10,000 files.");
  const integrity: FileInfo[] = [];
  let total = 0;
  async function add(path: string, bytes: Uint8Array) {
    total += bytes.length;
    requireValid(total <= backupLimit, "This journal exceeds the 512 MiB backup limit. Export on a device with more capacity using a future streaming backup format.");
    files[path] = [bytes, { level: 0 }];
    integrity.push({ path, size: bytes.length, sha256: await sha256(bytes) });
  }
  for (const table of ["media", "timeCapsuleMedia"] as const) {
    for (let index = 0; index < data[table].length; index++) {
      const row = data[table][index]!;
      requireValid(row.blob instanceof Blob && row.blob.size > 0, "A stored attachment is unavailable. Your data has not been changed.");
      progress(`Packing ${table === "media" ? "journal" : "capsule"} attachment ${index + 1} of ${data[table].length}…`);
      const path = `media/${table}/${index}.bin`;
      row.blobType = row.blob.type;
      await add(path, new Uint8Array(await row.blob.arrayBuffer()));
      delete row.blob; row.file = path;
    }
  }
  validateData(data); validateSettings(settings);
  const structured = strToU8(JSON.stringify({ data, settings }));
  requireValid(structured.length <= jsonLimit, "Backup metadata exceeds the 16 MiB limit.");
  await add("data.json", structured);
  const manifest: Manifest = { app: "MemoTrail", formatVersion: 1, databaseVersion: 4, exportedAt: new Date().toISOString(), files: integrity };
  files["manifest.json"] = [strToU8(JSON.stringify(manifest, null, 2)), { level: 0 }];
  requireValid(integrity.length < 10_000, "This backup exceeds the 10,000-file limit.");
  progress("Finishing ZIP archive…");
  const bytes = await new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) => zip(files, (error, result) => error ? reject(error) : resolve(result as Uint8Array<ArrayBuffer>)));
  return new Blob([bytes], { type: "application/zip" });
}

export async function validateBackup(file: Blob, progress: Progress = () => {}): Promise<ValidatedBackup> {
  requireValid(file.size <= backupLimit + 4 * 1024 * 1024, "Backup is too large (512 MiB limit).");
  progress("Opening backup…");
  const bytes = new Uint8Array(await file.arrayBuffer());
  let total = 0;
  const names = new Set<string>();
  const files = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
    try {
      unzip(bytes, { filter(info) {
        requireValid(info.name === "manifest.json" || info.name === "data.json" || /^media\/(media|timeCapsuleMedia)\/\d+\.bin$/.test(info.name), "Unexpected archive path.");
        requireValid(!names.has(info.name), "Duplicate archive path."); names.add(info.name);
        total += info.originalSize;
        requireValid(names.size <= 10_000 && total <= backupLimit && (!info.name.endsWith(".json") || info.originalSize <= jsonLimit), "Archive exceeds safe extraction limits.");
        return true;
      } }, (error, result) => error ? reject(new Error("Corrupt or unsupported ZIP archive.")) : resolve(result));
    } catch (error) { reject(error); }
  });
  requireValid(files["manifest.json"] && files["data.json"], "Missing manifest.json or data.json.");
  const manifest: unknown = JSON.parse(strFromU8(files["manifest.json"]!));
  requireValid(object(manifest) && manifest.app === "MemoTrail", "This is not a MemoTrail backup.");
  requireValid(manifest.formatVersion === 1 && manifest.databaseVersion === 4, "Unsupported backup version. Use a compatible MemoTrail release.");
  requireValid(timestamp(manifest.exportedAt) && Array.isArray(manifest.files), "Invalid backup manifest.");
  const paths = new Set<string>();
  let mediaBytes = 0;
  for (const entry of manifest.files) {
    requireValid(object(entry) && text(entry.path) && Number.isSafeInteger(entry.size) && (entry.size as number) >= 0 && text(entry.sha256) && /^[a-f0-9]{64}$/.test(entry.sha256 as string), "Invalid integrity information.");
    const path = entry.path as string;
    requireValid(path !== "manifest.json" && !paths.has(path), "Duplicate integrity entry."); paths.add(path);
    const contents = files[path];
    requireValid(contents && contents.length === entry.size, `Missing or damaged file: ${path}.`);
    progress(`Checking file ${paths.size} of ${manifest.files.length}…`);
    requireValid(await sha256(contents) === entry.sha256, `Integrity check failed: ${path}.`);
    if (path.startsWith("media/")) mediaBytes += contents.length;
  }
  requireValid(paths.size === Object.keys(files).length - 1 && paths.has("data.json"), "Archive files do not match the manifest.");
  const structured: unknown = JSON.parse(strFromU8(files["data.json"]!));
  requireValid(object(structured), "Invalid structured data.");
  validateData(structured.data); validateSettings(structured.settings);
  const used = new Set<string>();
  for (const table of ["media", "timeCapsuleMedia"] as const) for (const row of structured.data[table]) {
    const path = row.file as string;
    requireValid(path.startsWith(`media/${table}/`) && paths.has(path) && !used.has(path), "Missing, reused, or invalid media reference."); used.add(path);
    const contents = files[path]!;
    requireValid(contents.length > 0 && (table !== "media" || row.size === contents.length), "Invalid media size.");
    row.blob = new Blob([contents as Uint8Array<ArrayBuffer>], { type: (row.blobType ?? row.mimeType) as string }); delete row.file; delete row.blobType;
  }
  requireValid(used.size === paths.size - 1, "Unreferenced media files.");
  return { manifest: manifest as Manifest, data: structured.data, settings: structured.settings, mediaBytes };
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (object(value)) return `{${Object.keys(value).filter((key) => value[key] !== undefined && key !== "blob").sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
async function same(a: Row, b: Row) {
  if (canonical(a) !== canonical(b)) return false;
  if (a.blob instanceof Blob && b.blob instanceof Blob) {
    if (a.blob.size !== b.blob.size || a.blob.type !== b.blob.type) return false;
    return await sha256(new Uint8Array(await a.blob.arrayBuffer())) === await sha256(new Uint8Array(await b.blob.arrayBuffer()));
  }
  return !(a.blob || b.blob);
}
async function mergePlan(backup: ValidatedBackup) {
  const db = getDatabase();
  const additions = {} as Data;
  let duplicates = 0;
  for (const table of journalTables) {
    additions[table] = [];
    for (const row of backup.data[table]) {
      const key = table === "memoryTags" ? [row.memoryId as string, row.tagId as string] : row.id as string;
      const existing = await db.table(table).get(key);
      if (existing) {
        requireValid(await Dexie.waitFor(same(existing, row)), `ID conflict in ${table}: ${row.title ?? row.name ?? row.id ?? row.memoryId}. Merge stopped to protect both versions. Export your current journal before considering Replace.`);
        duplicates++;
      } else {
        if (table === "tags") requireValid(!(await db.tags.where("name").equals(row.name as string).count()), "A tag name uses a different ID. Merge stopped to preserve relationships.");
        additions[table].push(row);
      }
    }
  }
  return { additions, duplicates };
}
export async function previewMerge(backup: ValidatedBackup) {
  const db = getDatabase();
  return db.transaction("r", db.tables, async () => {
    const plan = await mergePlan(backup);
    return { duplicates: plan.duplicates, additions: Object.values(plan.additions).reduce((sum, rows) => sum + rows.length, 0) };
  });
}
export async function restoreBackup(backup: ValidatedBackup, mode: "merge" | "replace", confirmed = false, progress: Progress = () => {}) {
  requireValid(mode === "merge" || mode === "replace", "Choose a restore mode.");
  requireValid(mode !== "replace" || confirmed, "Replace requires explicit confirmation.");
  const estimate = await navigator.storage?.estimate?.().catch(() => undefined);
  // Conservative: replacement also needs room for the transaction until it commits.
  const needed = backup.mediaBytes + strToU8(JSON.stringify(backup.data)).length;
  requireValid(!estimate?.quota || estimate.usage === undefined || estimate.quota - estimate.usage >= needed, "Not enough browser storage. Free device space and try again. Your journal has not changed.");
  const db = getDatabase();
  progress("Restoring journal in a protected transaction…");
  await db.transaction("rw", db.tables, async () => {
    const empty = !(await db.memories.count()) && !(await db.collections.count()) && !(await db.timeCapsules.count()) && !(await db.tags.count());
    const data = mode === "merge" ? (await mergePlan(backup)).additions : backup.data;
    if (mode === "replace") for (const table of journalTables) await db.table(table).clear();
    for (const table of journalTables) if (data[table].length) await db.table(table).bulkAdd(data[table]);
    if (mode === "replace" || empty) {
      const { reminders, ...prefs } = backup.settings;
      await db.settings.put({ key: preferencesKey, value: JSON.stringify({ state: prefs, version: 1 }) });
      const status = await backupStatus();
      await db.settings.put({ key: backupStatusKey, value: JSON.stringify({ ...status, reminders }) });
    }
  });
  await usePreferences.persist.rehydrate();
}
export function backupError(error: unknown) {
  if (error instanceof Error && /abort/i.test(error.name)) return "Restore interrupted. The transaction was rolled back and your previous journal is intact. Reopen MemoTrail and retry the validated backup.";
  if (error instanceof Error && /quota/i.test(error.name + error.message)) return "Browser storage is full. Restore was rolled back; your previous journal is intact. Free space and retry.";
  return error instanceof Error ? error.message : "Backup could not finish. Your journal has not been changed. Please retry.";
}
