// Exact calendar matching: February 29 returns only on leap days, never Feb 28 or March 1.
export function onThisDay<T extends { date: string }>(memories: T[], today: string) {
  return memories.filter((memory) => memory.date.slice(5) === today.slice(5) && memory.date.slice(0, 4) < today.slice(0, 4))
    .sort((a, b) => b.date.localeCompare(a.date));
}
