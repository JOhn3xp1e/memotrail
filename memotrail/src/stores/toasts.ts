import { create } from "zustand";
export type ToastKind = "success" | "error" | "warning" | "info";
export type MemoToast = { id: number; message: string; kind: ToastKind };
let sequence = 0;
export const useToasts = create<{ items: MemoToast[]; dismiss: (id: number) => void }>((set) => ({ items: [], dismiss: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })) }));
export function notify(message: string, kind: ToastKind = "info") {
  const id = ++sequence;
  useToasts.setState((state) => ({ items: [...state.items.slice(-3), { id, message, kind }] }));
  return id;
}
