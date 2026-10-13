import type { Collection, Memory } from "@/types/memory";
import { localDate } from "./utils";

export function rewindPeriods(memories: Memory[]) {
  const months = [...new Set(memories.map((memory) => memory.memoryDate.slice(0, 7)).filter((date) => /^\d{4}-(0[1-9]|1[0-2])$/.test(date)))].sort().reverse();
  return { months, years: [...new Set(months.map((month) => month.slice(0, 4)))] };
}
export function periodLabel(period: string) {
  return period.length === 4 ? period : new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(`${period}-01T12:00:00`));
}
export function rewindStats(all: Memory[], collections: Collection[], period: string) {
  const memories = all.filter((memory) => memory.memoryDate.startsWith(period)).sort((a, b) => b.memoryDate.localeCompare(a.memoryDate));
  const moods: Record<string, number> = {};
  const months: Record<string, number> = {};
  for (const memory of memories) {
    if (memory.mood?.trim()) moods[memory.mood] = (moods[memory.mood] ?? 0) + 1;
    const month = memory.memoryDate.slice(0, 7);
    months[month] = (months[month] ?? 0) + 1;
  }
  const rankedMoods = Object.entries(moods).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const rankedMonths = Object.entries(months).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const represented = collections.filter((collection) => memories.some((memory) => memory.collectionId === collection.id));
  return { memories, favorites: memories.filter((memory) => memory.favorite), moods: rankedMoods,
    topMoods: rankedMoods.filter(([, count]) => count === rankedMoods[0]?.[1]).map(([mood]) => mood),
    topMonths: rankedMonths.filter(([, count]) => count === rankedMonths[0]?.[1]).map(([month]) => month),
    collections: represented,
    created: all.filter((memory) => Number.isFinite(memory.createdAt) && localDate(new Date(memory.createdAt)).startsWith(period)).length,
  };
}
export interface RewindPhoto {
  id: string;
  memoryId: string;
  blob: Blob;
  title: string;
  story: string;
  date: string;
  mood?: string;
  collectionId?: string;
  favorite: boolean;
}
export interface RewindCollectionCard { name: string; photo?: RewindPhoto }
export type RewindSlideKind =
  | "title"
  | "stats"
  | "mood"
  | "busiest"
  | "favorites"
  | "collections"
  | "favorite-featured"
  | "favorite-story"
  | "favorite-collage"
  | "favorite-card"
  | "collage"
  | "closing";
export interface RewindSlide {
  kind: RewindSlideKind;
  title: string;
  subtitle: string;
  lines?: string[];
  photos?: RewindPhoto[];
  collectionCards?: RewindCollectionCard[];
  story?: string;
  date?: string;
}

function stableScore(value: string) {
  let score = 2166136261;
  for (let index = 0; index < value.length; index++) {
    score = Math.imul(score ^ value.charCodeAt(index), 16777619);
  }
  return score >>> 0;
}

export function makeRewindSlides(stats: ReturnType<typeof rewindStats>, photoCount: number, photos: RewindPhoto[], period: string): RewindSlide[] {
  const label = periodLabel(period);
  const available = [...new Map(photos.filter((photo) => photo.blob instanceof Blob && photo.blob.size).map((photo) => [photo.id, photo])).values()]
    .sort((a, b) => stableScore(a.id) - stableScore(b.id) || a.id.localeCompare(b.id));
  const photoRich = available.length > 10;
  const unused = new Map(available.map((photo) => [photo.id, photo]));
  function take(limit: number, predicate: (photo: RewindPhoto) => boolean = () => true, favoriteFirst = false) {
    const candidates = [...unused.values()].filter(predicate);
    candidates.sort((a, b) => favoriteFirst ? Number(b.favorite) - Number(a.favorite) : Number(a.favorite) - Number(b.favorite));
    const selected = candidates.slice(0, limit);
    for (const photo of selected) unused.delete(photo.id);
    return selected;
  }
  const topMoodSet = new Set(stats.topMoods);
  const topMonthSet = new Set(stats.topMonths);
  const titlePhotos = take(1, (photo) => !photo.favorite);
  if (!titlePhotos.length) titlePhotos.push(...take(1));
  const slides: RewindSlide[] = [
    { kind: "title", title: label, subtitle: "Your story, one beautiful moment at a time.", photos: titlePhotos },
    {
      kind: "stats",
      title: `${stats.memories.length} moments worth keeping`,
      subtitle: label,
      lines: [`${photoCount} attached photos`, `${stats.favorites.length} favorite memories`, `${stats.collections.length} collections represented`, `${stats.created} memories saved during this period`],
      photos: take(photoRich ? 3 : 1),
    },
    {
      kind: "mood",
      title: stats.topMoods.length ? stats.topMoods.join(" & ") : "Every feeling belongs here.",
      subtitle: stats.topMoods.length > 1 ? "Your most recorded moods, tied." : stats.topMoods.length ? "Your most recorded mood." : "No moods recorded for this period.",
      lines: stats.moods.map(([mood, count]) => `${mood} · ${count}`),
      photos: stats.topMoods.length ? take(photoRich ? 2 : 1, (photo) => !!photo.mood && topMoodSet.has(photo.mood)) : take(photoRich ? 2 : 1),
    },
  ];
  if (period.length === 4) {
    slides.push({
      kind: "busiest",
      title: stats.topMonths.map(periodLabel).join(" & "),
      subtitle: stats.topMonths.length > 1 ? "Your busiest memory months, tied." : "Your busiest memory month.",
      lines: stats.topMonths.map((month) => `${periodLabel(month)} · ${stats.memories.filter((memory) => memory.memoryDate.startsWith(month)).length} ${stats.memories.filter((memory) => memory.memoryDate.startsWith(month)).length === 1 ? "memory" : "memories"}`),
      photos: take(photoRich ? 2 : 1, (photo) => topMonthSet.has(photo.date.slice(0, 7))),
    });
  }
  if (period.length === 4 && stats.collections.length) {
    const collectionCards = stats.collections.slice(0, 4).map((collection) => ({
      name: collection.name,
      photo: take(1, (photo) => photo.collectionId === collection.id)[0],
    }));
    slides.push({
      kind: "collections",
      title: `${stats.collections.length} little chapters`,
      subtitle: stats.collections.length ? "The collections that hold this part of your story." : "These moments stand beautifully on their own.",
      lines: stats.collections.slice(0, 5).map((collection) => collection.name),
      collectionCards,
    });
  }

  const closingReserve = available.length >= 12 ? 4 : available.length >= 6 ? 1 : Math.min(4, unused.size);
  const highlightCapacity = Math.max(0, unused.size - closingReserve);
  const highlightPlan: Array<{ kind: RewindSlideKind; size: number }> = highlightCapacity >= 9
    ? [{ kind: "favorite-featured", size: 1 }, { kind: "favorite-story", size: 2 }, { kind: "favorite-collage", size: 4 }, { kind: "favorite-card", size: 2 }]
    : highlightCapacity >= 7
      ? [{ kind: "favorite-featured", size: 1 }, { kind: "favorite-story", size: 2 }, { kind: "favorite-collage", size: 4 }]
      : highlightCapacity >= 3
        ? [{ kind: "favorite-featured", size: 1 }, { kind: "favorite-story", size: 2 }]
        : highlightCapacity >= 2
          ? [{ kind: "favorite-featured", size: 1 }, { kind: "favorite-card", size: 1 }]
          : highlightCapacity >= 1 ? [{ kind: "favorite-featured", size: 1 }] : [];
  for (let position = 0; position < highlightPlan.length; position++) {
    const { kind, size } = highlightPlan[position]!;
    const highlightPhotos = take(size, (photo) => photo.favorite, true);
    highlightPhotos.push(...take(size - highlightPhotos.length));
    const first = highlightPhotos[0];
    if (!first) continue;
    slides.push({
      kind,
      title: position === 0 ? "Your Favorite Moments" : first.title,
      subtitle: position === 0 ? "The little moments that made your story unforgettable." : first.date,
      photos: highlightPhotos,
      story: first.story,
      date: first.date,
    });
  }
  const closingPhotos = take(4);
  slides.push({
    kind: "closing",
    title: "Here’s to the memories still to come.",
    subtitle: `${label} · Just yours. Always.`,
    photos: closingPhotos,
  });
  return slides;
}
