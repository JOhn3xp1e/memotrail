export interface LocalModelSupport {
  secureContext: boolean; webGpu: boolean; wasm: boolean; storageAvailableBytes: number | null;
}
/** Capability checks are not a claim that a language model has run on this device. */
export async function detectLocalModelSupport(): Promise<LocalModelSupport> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown | null> } }).gpu;
  let webGpu = false;
  try { webGpu = !!(await gpu?.requestAdapter()); } catch { /* Hardware/driver may reject an adapter. */ }
  let storageAvailableBytes: number | null = null;
  try { const { quota, usage } = await navigator.storage.estimate(); if (quota !== undefined && usage !== undefined) storageAvailableBytes = Math.max(0, quota - usage); } catch { /* Quota is not available in every browser. */ }
  return { secureContext: window.isSecureContext, webGpu, wasm: typeof WebAssembly !== 'undefined', storageAvailableBytes };
}
export interface LocalModelAdapter {
  id: string;
  testedInMemoTrail: boolean;
  backend: 'webgpu' | 'wasm';
  downloadBytes: number;
  storageBytes: number;
  // Future implementations must run locally and never send prompts over a network.
  initialize(options: { signal: AbortSignal }): Promise<void>;
  generate(request: { title: string; story: string; mood: string; task: 'caption' | 'story'; signal: AbortSignal }): Promise<string>;
  dispose(): Promise<void>;
}
export async function initializeLocalModel(adapter: LocalModelAdapter, consent: boolean, support: LocalModelSupport, signal: AbortSignal) {
  if (!consent) throw new Error('Consent is required before downloading model files.');
  if (!adapter.testedInMemoTrail) throw new Error('This model has not been tested in MemoTrail.');
  if (!Number.isFinite(adapter.downloadBytes) || adapter.downloadBytes <= 0 || !Number.isFinite(adapter.storageBytes) || adapter.storageBytes < adapter.downloadBytes) throw new Error('Model download and storage sizes must be declared.');
  if (!support.secureContext || !support[adapter.backend === 'webgpu' ? 'webGpu' : 'wasm']) throw new Error('The required browser backend is unavailable.');
  if (support.storageAvailableBytes === null || support.storageAvailableBytes < adapter.storageBytes) throw new Error('Confirm sufficient local storage before installing a model.');
  signal.throwIfAborted();
  try { await adapter.initialize({ signal }); signal.throwIfAborted(); }
  catch (error) { await adapter.dispose(); throw error; }
}
// No runtime, weights, download endpoint, or cloud provider is installed.
export const availableLocalModels: readonly LocalModelAdapter[] = [];
