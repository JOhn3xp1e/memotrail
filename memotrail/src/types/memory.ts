export type Mood =
  "grateful" | "happy" | "peaceful" | "nostalgic" | "adventurous";
export type Category = "travel" | "everyday" | "together";

/** Device-owned entities for the Phase 2 repository. Never seed with samples. */
export interface Memory {
  id: string;
  title: string;
  story: string;
  date: string;
  location: string;
  mood: Mood;
  tags: string[];
  favorite: boolean;
  collectionIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface MemoryPhoto {
  id: string;
  memoryId: string;
  blob: Blob;
  alt: string;
  order: number;
}

export interface Collection {
  id: string;
  title: string;
  description: string;
  createdAt: number;
}

/** Deliberately distinct from a persisted Memory. */
export interface SampleMemory {
  source: "sample";
  id: string;
  title: string;
  story: string;
  date: string;
  location: string;
  category: Category;
  mood: Mood;
  image: string;
  alt: string;
  caption: string;
  favorite: boolean;
}

export interface SampleCollection {
  id: string;
  title: string;
  subtitle: string;
  category: Category;
  cover: string;
  color: string;
}
