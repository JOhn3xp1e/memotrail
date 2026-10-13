import { inspectMimoPixels, type MimoAnimation } from './mimo-manifest';

export interface LoadedMimoFrames { images: HTMLImageElement[] }
const animations = new Map<string, { request: Promise<LoadedMimoFrames>; value?: LoadedMimoFrames }>();
export function mimoFramesKey(animation: MimoAnimation) {
  return JSON.stringify([animation.frameWidth, animation.frameHeight, animation.status, animation.frames.map((frame) => frame.file)]);
}
export function cachedMimoFrames(animation: MimoAnimation) { return animations.get(mimoFramesKey(animation))?.value; }

async function loadFrame(file: string, width: number, height: number) {
  const response = await fetch(file, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Mimo frame unavailable: ${file}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (![137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte)) throw new Error('Mimo frame must be a PNG');
  const objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
  try {
    const image = new Image(); image.src = objectUrl;
    await image.decode();
    if (image.naturalWidth !== width || image.naturalHeight !== height) throw new Error('Inconsistent Mimo frame dimensions');
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Mimo frame validation unavailable');
    ctx.drawImage(image, 0, 0);
    inspectMimoPixels(ctx.getImageData(0, 0, width, height).data, width, height);
    return image;
  } finally { URL.revokeObjectURL(objectUrl); }
}

/** All frames decode and validate before any is displayed; failures are atomic. */
export function preloadMimoFrames(animation: MimoAnimation) {
  if (animation.status !== 'verified' || !animation.frames.length) return Promise.reject(new Error('Production frames pending'));
  const key = mimoFramesKey(animation);
  const existing = animations.get(key);
  if (existing) return existing.request;
  const entry: { request: Promise<LoadedMimoFrames>; value?: LoadedMimoFrames } = {
    request: Promise.all(animation.frames.map((frame) => loadFrame(frame.file, animation.frameWidth, animation.frameHeight))).then((images) => ({ images })),
  };
  animations.set(key, entry);
  void entry.request.then((value) => { entry.value = value; }, () => { animations.delete(key); });
  return entry.request;
}
