import type { Mood } from "./memory";

export interface TimeCapsule {
  id: string;
  title: string;
  message: string;
  recipientName?: string;
  mood?: Mood;
  createdAt: string;
  updatedAt: string;
  unlockAt: string;
  openedAt?: string;
  status: "sealed" | "opened";
  memoryId?: string;
}
export interface TimeCapsuleMedia {
  id: string;
  capsuleId: string;
  blob: Blob;
  mimeType: string;
  createdAt: string;
  order: number;
}
export type CapsuleMetadata = Omit<TimeCapsule, "message" | "recipientName" | "mood">;
