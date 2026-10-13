import { parseMimoManifest, type MimoManifest, type MimoAnimation, type MimoState } from './mimo-manifest';
export { mimoStates, mimoPackStates, parseMimoManifest } from './mimo-manifest';
import { mimoStates } from './mimo-manifest';
export type { MimoAnimation, MimoManifest, MimoState } from './mimo-manifest';

export const mimoManifestUrl = `${import.meta.env.BASE_URL}assets/mimo/manifest.json`;
export const mimoMessages: Record<MimoState, string> = {
  idle: 'Your little memory keeper', blink: 'A little pause', wave: 'Hello, memory maker!',
  walk: 'Along for the journey', happy: 'A good moment, found again', thinking: 'Taking a little moment',
  camera: 'Another good bit, kept', celebrate: "Here's to your memories!", sleep: 'Resting a little', speaking: 'A little conversation',
  sad: 'Here with you, through every feeling', surprised: 'A little unexpected wonder', envelope: 'A letter for your future self', memoryJar: 'A good moment in your memory jar',
  cry: 'An explicitly chosen tearful pose', memory_jar: 'A good moment in your memory jar',
};
const timings: Record<MimoState, [number, number, boolean]> = {
  idle: [8, 125, true], blink: [6, 125, false], wave: [8, 100, false], walk: [8, 83.333, true],
  happy: [8, 83.333, false], thinking: [6, 125, true], camera: [8, 100, false], celebrate: [8, 83.333, false],
  sleep: [8, 166.667, true], sad: [6, 125, false], surprised: [6, 100, false], envelope: [6, 125, false], memoryJar: [8, 100, false], speaking: [8, 100, true],
  cry: [8, 200, false], memory_jar: [8, 111.111, false],
};
export const mimoFallback = {} as Record<MimoState, MimoAnimation>;
for (const state of mimoStates) {
  const [frameCount, duration, loop] = timings[state];
  mimoFallback[state] = { status: 'pending', frames: [], frameCount, durationMs: frameCount * duration, loop, frameWidth: 256, frameHeight: 256 };
}

const manifests = new Map<string, Promise<MimoManifest>>();
export function loadMimoManifest(path: string) {
  const url = new URL(path, document.baseURI).href;
  let request = manifests.get(url);
  if (!request) {
    request = fetch(url, { signal: AbortSignal.timeout(10000) }).then((response) => { if (!response.ok) throw new Error('Mimo manifest unavailable'); return response.json(); }).then((value: unknown) => parseMimoManifest(value, url));
    manifests.set(url, request);
    void request.catch(() => manifests.delete(url));
  }
  return request;
}

