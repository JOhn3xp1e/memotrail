export type Mood =
  | "grateful"
  | "happy"
  | "peaceful"
  | "nostalgic"
  | "adventurous";
export type Category = "travel" | "everyday" | "together";

export interface Memory {
  id: string;
  title: string;
  description: string;
  memoryDate: string;
  createdAt: number;
  updatedAt: number;
  mood: Mood;
  favorite: boolean;
  collectionId?: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
}

export interface Media {
  id: string;
  memoryId: string;
  type: "image" | "video";
  blob: Blob;
  mimeType: string;
  size: number;
  createdAt: number;
  order: number;
}

export type MemoryPhoto = Media;

export interface Collection {
  id: string;
  name: string;
  description: string;
  coverMediaId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Tag {
  id: string;
  name: string;
}

export interface MemoryTag {
  memoryId: string;
  tagId: string;
}

/** A view model shared by the local journal and the explicitly separate demo. */
export interface PersonalMemoryView {
  source: "personal";
  id: string;
  title: string;
  story: string;
  date: string;
  location: string;
  mood: Mood;
  favorite: boolean;
  collectionId?: string;
  photos: Media[];
  image: Blob | null;
}

export interface PersonalCollectionView {
  source: "personal";
  id: string;
  title: string;
  subtitle: string;
  description: string;
  cover: Blob | null;
  photos: Media[];
  coverMediaId?: string;
  color: string;
  memoryCount: number;
  createdAt: number;
  updatedAt: number;
}

/** Deliberately distinct from persisted personal records. */
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
  source: "sample";
  id: string;
  title: string;
  subtitle: string;
  category: Category;
  cover: string;
  color: string;
  memoryCount: number;
}

export type MemoryView = SampleMemory | PersonalMemoryView;
export type CollectionView = SampleCollection | PersonalCollectionView;
