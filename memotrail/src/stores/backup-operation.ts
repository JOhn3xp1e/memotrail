import { create } from "zustand";
export const useBackupOperation = create<{ busy: boolean; setBusy: (busy: boolean) => void }>((set) => ({ busy: false, setBusy: (busy) => set({ busy }) }));
