export function memoryPath(memory: { id: string; source?: string }) {
  return `/memories/${encodeURIComponent(memory.id)}${memory.source === "sample" ? "?sample=1" : ""}`;
}
