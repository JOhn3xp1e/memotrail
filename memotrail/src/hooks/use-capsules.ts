import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { capsuleRepository, capsuleError } from "@/services/capsule-repository";

export function useCapsules(retry = 0) {
  return useLiveQuery(async () => {
    try { return { capsules: await capsuleRepository.list(), error: "" }; }
    catch (error) { return { capsules: [], error: capsuleError(error) }; }
  }, [retry]);
}

export function useCapsuleClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    function resume() {
      clearInterval(timer);
      timer = undefined;
      setNow(Date.now());
      if (!document.hidden) timer = setInterval(() => setNow(Date.now()), 1000);
    }
    resume();
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("focus", resume);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", resume); window.removeEventListener("focus", resume); };
  }, []);
  return now;
}
export function countdown(unlockAt: string, now: number) {
  const seconds = Math.max(0, Math.ceil((Date.parse(unlockAt) - now) / 1000));
  if (!Number.isFinite(seconds)) return "Unlock date unavailable";
  if (!seconds) return "Ready to Open";
  return `${Math.floor(seconds / 86400)}d ${Math.floor(seconds / 3600) % 24}h ${Math.floor(seconds / 60) % 60}m ${seconds % 60}s`;
}
export function capsuleDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date) : "Date unavailable";
}
