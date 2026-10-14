import { create } from "zustand";

type PersistenceStatus =
  | "pending"
  | "granted"
  | "not-granted"
  | "unsupported"
  | "error";

interface StoragePersistenceState {
  status: PersistenceStatus;
  error: string;
  request: () => Promise<void>;
}

export const useStoragePersistence = create<StoragePersistenceState>(
  (set, get) => ({
    status: "pending",
    error: "",
    request: async () => {
      if (
        ["granted", "unsupported"].includes(get().status)
      ) {
        return;
      }
      if (!navigator.storage?.persist) {
        set({ status: "unsupported", error: "" });
        return;
      }
      set({ status: "pending", error: "" });
      try {
        const granted = await navigator.storage.persist();
        set({ status: granted ? "granted" : "not-granted" });
      } catch (error) {
        set({
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : "The browser could not request persistent storage.",
        });
      }
    },
  }),
);
