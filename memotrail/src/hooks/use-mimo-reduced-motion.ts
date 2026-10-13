import { useSyncExternalStore } from 'react';
import { usePreferences } from '@/stores/preferences';

const query = '(prefers-reduced-motion: reduce)';
function subscribe(callback: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}
export function useMimoReducedMotion() {
  const system = useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => true);
  const preference = usePreferences((s) => s.reduceMotion);
  return system || preference;
}
