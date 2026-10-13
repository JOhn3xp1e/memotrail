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
export interface RewindPhoto { id: string; blob: Blob; title: string; favorite: boolean }
export interface RewindSlide { kind: "title" | "stats" | "mood" | "favorites" | "collections" | "photo" | "collage" | "closing"; title: string; subtitle: string; lines?: string[]; photos?: RewindPhoto[] }
export function makeRewindSlides(stats: ReturnType<typeof rewindStats>, photoCount: number, photos: RewindPhoto[], period: string): RewindSlide[] {
  const label = periodLabel(period);
  const favoritePhotos = photos.filter((photo) => photo.favorite);
  const slides: RewindSlide[] = [
    { kind: "title", title: label, subtitle: "Your story, one beautiful moment at a time.", photos: photos.slice(0, 1) },
    { kind: "stats", title: `${stats.memories.length} moments worth keeping`, subtitle: label, lines: [`${photoCount} attached photos`, `${stats.favorites.length} favorite memories`, `${stats.collections.length} collections represented`, `${stats.created} memories saved during this period`] },
    { kind: "mood", title: stats.topMoods.length ? stats.topMoods.join(" & ") : "Every feeling belongs here.", subtitle: stats.topMoods.length > 1 ? "Your most recorded moods, tied." : stats.topMoods.length ? "Your most recorded mood." : "No moods recorded for this period.", lines: stats.moods.map(([mood, count]) => `${mood} · ${count}`) },
  ];
  if (period.length === 4) slides.push({ kind: "stats", title: stats.topMonths.map(periodLabel).join(" & "), subtitle: stats.topMonths.length > 1 ? "Your busiest memory months, tied." : "Your busiest memory month.", lines: ["Based on the dates of your memories."] });
  slides.push({ kind: "favorites", title: `${stats.favorites.length} favorites, close to your heart.`, subtitle: stats.favorites.length ? "The moments you marked with a little extra love." : "No favorites marked yet. Every memory still matters.", lines: stats.favorites.slice(0, 4).map((memory) => memory.title), photos: favoritePhotos.slice(0, 1) });
  if (period.length === 4) slides.push({ kind: "collections", title: `${stats.collections.length} little chapters`, subtitle: stats.collections.length ? "The collections that hold this part of your story." : "These moments stand beautifully on their own.", lines: stats.collections.slice(0, 5).map((collection) => collection.name) });
  for (const photo of photos.slice(0, 3)) slides.push({ kind: "photo", title: photo.title, subtitle: "A moment, yours forever.", photos: [photo] });
  slides.push({ kind: "collage", title: "The little things were the big things.", subtitle: photos.length ? `${label} · A few of your keepsakes` : "A chapter kept in words.", photos: photos.slice(0, 4) });
  slides.push({ kind: "closing", title: "Here’s to the memories still to come.", subtitle: `${label} · Just yours. Always.` });
  return slides;
}
