import type { Collection, Memory } from '@/types/memory';

const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const moods = ['grateful', 'happy', 'peaceful', 'nostalgic', 'adventurous'];
const ignored = new Set('show find search look looking memories memory moments moment my me from in on at the a an all please for of with by about and only collection album mood'.split(' '));
function normalize(value: string) { return value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase(); }
export interface MemorySearch {
  terms: string[]; year?: string; month?: string; date?: string; mood?: string; favorite?: boolean; error?: string;
}
export function parseMemorySearch(query: string): MemorySearch {
  const text = normalize(query);
  const date = text.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
  if (date) {
    const parsed = new Date(`${date}T12:00:00Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return { terms: [], error: 'Use a valid date such as 2026-08-15.' };
  }
  const year = date ? undefined : text.match(/\b(?:19|20)\d{2}\b/)?.[0];
  const tokens: string[] = text.replace(date ?? /$^/, ' ').match(/[\p{L}\p{N}]+/gu) ?? [];
  const monthIndex = months.findIndex((name) => tokens.some((token) => token === name || (token.length === 3 && token === name.slice(0, 3))));
  const mood = moods.find((mood) => tokens.includes(mood));
  const favorites = tokens.some((token) => ['favorite', 'favorites', 'favourite', 'favourites', 'unfavorited'].includes(token));
  const negative = tokens.includes('not') || tokens.includes('unfavorited');
  const terms = tokens.filter((token) => !ignored.has(token) && token !== year && token !== mood && !['favorite', 'favorites', 'favourite', 'favourites', 'not', 'unfavorited'].includes(token) && (monthIndex < 0 || ![months[monthIndex], months[monthIndex]!.slice(0, 3)].includes(token)));
  return { terms, date, year, month: monthIndex < 0 ? undefined : String(monthIndex + 1).padStart(2, '0'), mood, favorite: favorites ? !negative : undefined };
}

export function searchLocalMemories(memories: Memory[], collections: Collection[], query: string) {
  const filters = parseMemorySearch(query);
  if (filters.error) return { filters, memories: [] };
  const names = new Map(collections.map((collection) => [collection.id, collection.name]));
  const results = memories.filter((memory) => {
    if (filters.date && memory.memoryDate !== filters.date) return false;
    if (filters.year && !memory.memoryDate.startsWith(filters.year)) return false;
    if (filters.month && memory.memoryDate.slice(5, 7) !== filters.month) return false;
    if (filters.favorite !== undefined && memory.favorite !== filters.favorite) return false;
    if (filters.mood && memory.mood !== filters.mood) return false;
    const fields = normalize([memory.title, memory.description, memory.memoryDate, memory.mood, memory.locationName, names.get(memory.collectionId ?? '')].filter(Boolean).join(' '));
    return filters.terms.every((term) => fields.includes(term));
  }).sort((a, b) => b.memoryDate.localeCompare(a.memoryDate) || b.createdAt - a.createdAt);
  return { filters, memories: results };
}

/** Templates use recorded facts only. The optional prompt is explicitly unfinished. */
export function captionTemplates(memory: Memory) {
  const title = memory.title.trim();
  const description = memory.description.trim();
  return [title, `${title} — ${memory.mood || 'a moment to remember'}.`, description ? `${title}\n${description}` : `${title}\n[Add what you want to remember about this moment.]`];
}
/** Only mechanical whitespace cleanup: no additions, factual substitutions or punctuation changes. */
export function tidyStory(story: string) {
  return story.replace(/\r\n?/g, '\n').split('\n').map((line) => line.replace(/[\t ]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
