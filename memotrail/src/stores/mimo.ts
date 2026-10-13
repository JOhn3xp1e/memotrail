import { create } from 'zustand';
import type { MimoState } from '@/lib/mimo';
const priority: Partial<Record<MimoState, number>> = { blink: 0, wave: 1, happy: 2, camera: 3, celebrate: 3 };
interface MimoController {
  state: MimoState; requestId: number; temporary: boolean; minimized: boolean; rewindOpen: boolean;
  setRewindOpen: (value: boolean) => void;
  play: (state: MimoState, temporary?: boolean) => void;
  finish: (requestId: number) => void;
  minimize: (value: boolean) => void;
}
// Memory only: no changes to IndexedDB or stored preferences.
export const useMimo = create<MimoController>((set) => ({
  state: 'idle', requestId: 0, temporary: false, minimized: false, rewindOpen: false,
  setRewindOpen: (rewindOpen) => set({ rewindOpen }),
  play: (state, temporary = !['idle', 'thinking', 'speaking', 'sleep'].includes(state)) => set((current) => {
    if (current.minimized || (state !== 'idle' && current.temporary && (priority[state] ?? 2) < (priority[current.state] ?? 2))) return current;
    return { state, temporary, requestId: current.requestId + 1 };
  }),
  finish: (requestId) => set((current) => current.requestId === requestId ? { state: 'idle', temporary: false } : current),
  minimize: (minimized) => set((current) => ({ minimized, state: 'idle', temporary: false, requestId: current.requestId + 1 })),
}));
