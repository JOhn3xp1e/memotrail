export const mimoStates = ['idle', 'blink', 'wave', 'walk', 'happy', 'thinking', 'camera', 'celebrate', 'sleep', 'sad', 'surprised', 'envelope', 'memoryJar', 'speaking'] as const;
export type MimoState = typeof mimoStates[number];
export interface MimoFrame { file: string; durationMs: number }
export interface MimoAnimation {
  status: 'pending' | 'candidate' | 'verified'; frames: MimoFrame[]; frameCount: number;
  durationMs: number; loop: boolean; frameWidth: number; frameHeight: number;
}
export type MimoManifest = Partial<Record<MimoState, MimoAnimation>>;

/** v2 uses explicit, ordered individual files. Legacy atlas metadata is rejected. */
export function parseMimoManifest(value: unknown, url: string): MimoManifest {
  if (!value || typeof value !== 'object') throw new Error('Invalid Mimo manifest');
  const raw = value as Record<string, unknown>;
  if (raw.version !== 2 || raw.format !== 'individual-png-frames') throw new Error('Expected Mimo v2 individual PNG frames');
  if (![raw.frameWidth, raw.frameHeight].every((n) => typeof n === 'number' && Number.isInteger(n) && n >= 16 && n <= 1024)) throw new Error('Mimo canvases must be 16–1024 pixels per side');
  if (!raw.animations || typeof raw.animations !== 'object' || Array.isArray(raw.animations)) throw new Error('Missing Mimo animations');
  for (const name of Object.keys(raw.animations)) {
    if (!(mimoStates as readonly string[]).includes(name)) throw new Error(`Unknown Mimo animation: ${name}`);
  }
  const result: MimoManifest = {};
  for (const state of mimoStates) {
    const entry = (raw.animations as Record<string, unknown>)[state];
    if (entry === undefined) continue;
    if (!entry || typeof entry !== 'object') throw new Error(`Invalid animation: ${state}`);
    const a = entry as Record<string, unknown>;
    if (!['pending', 'candidate', 'verified'].includes(a.status as string) || !Array.isArray(a.frames) || typeof a.frameCount !== 'number' || !Number.isInteger(a.frameCount) || a.frameCount < 1 || a.frameCount > 120 || typeof a.loop !== 'boolean') throw new Error(`Invalid Mimo frame metadata: ${state}`);
    if ((a.status !== 'pending' && a.frames.length !== a.frameCount) || (a.status === 'pending' && a.frames.length !== 0)) throw new Error(`Frame count/status mismatch: ${state}`);
    if (a.frameCount * (raw.frameWidth as number) * (raw.frameHeight as number) > 16_777_216) throw new Error(`Decoded Mimo animation exceeds 64 MiB: ${state}`);
    if (state === 'idle' && !a.loop) throw new Error('Idle must loop');
    const durations = Array.isArray(a.frameDurationMs) ? a.frameDurationMs : Array(a.frameCount).fill(a.frameDurationMs);
    if (durations.length !== a.frameCount || !durations.every((n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 16 && n <= 10000)) throw new Error(`Invalid frame durations: ${state}`);
    if (a.status === 'verified' && a.visualReview !== true) throw new Error(`Visual review required for ${state}: scale, alignment, order and identity`);
    const frames = a.frames.map((file: unknown, index: number) => {
      if (typeof file !== 'string' || !/^frames\/[a-zA-Z0-9_/-]+\.png$/.test(file) || file.split('/').includes('..')) throw new Error(`Expected production frames/ PNG path: ${state}`);
      const resolved = new URL(file, url);
      if (resolved.origin !== new URL(url).origin) throw new Error('Mimo frames must be local');
      return { file: resolved.href, durationMs: durations[index] as number };
    });
    result[state] = { status: a.status as MimoAnimation['status'], frames, frameCount: a.frameCount, durationMs: durations.reduce((total: number, n: number) => total + n, 0), loop: a.loop, frameWidth: raw.frameWidth as number, frameHeight: raw.frameHeight as number };
  }
  return result;
}

/** Pixel checks cannot judge character identity or deliberate pose changes. */
export function inspectMimoPixels(pixels: Uint8ClampedArray, width: number, height: number) {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  let transparent = 0, borderClear = true;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const alpha = pixels[(y * width + x) * 4 + 3]!;
    if (alpha === 0) transparent++;
    if ((x === 0 || y === 0 || x === width - 1 || y === height - 1) && alpha !== 0) borderClear = false;
    if (alpha > 16) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  }
  if (!transparent || !borderClear) throw new Error('Expected transparent background and clear 1px canvas border');
  if (maxX < 0) throw new Error('Frame is empty');
  return { minX, minY, maxX, maxY, centerX: (minX + maxX) / 2, baselineY: maxY };
}

export function mimoFrameAt(animation: MimoAnimation, elapsedMs: number, once: boolean) {
  if (!animation.frames.length) return 0;
  let time = once ? Math.min(elapsedMs, animation.durationMs - 0.001) : elapsedMs % animation.durationMs;
  for (let i = 0; i < animation.frames.length; i++) {
    time -= animation.frames[i]!.durationMs;
    if (time < 0) return i;
  }
  return animation.frames.length - 1;
}
