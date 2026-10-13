import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { mimoFrameAt, type MimoAnimation } from '@/lib/mimo-manifest';
import { cachedMimoFrames, mimoFramesKey, preloadMimoFrames, type LoadedMimoFrames } from '@/lib/mimo-frames';
import { useMimoReducedMotion } from '@/hooks/use-mimo-reduced-motion';

interface Props {
  animation: MimoAnimation;
  size?: number;
  paused?: boolean;
  reducedMotion?: boolean;
  playOnce?: boolean;
  onComplete?: () => void;
  onAssetChange?: (loaded: boolean) => void;
  fallback: ReactNode;
}

/** One stable canvas draws pre-decoded individual PNGs at their native aspect. */
export function MimoSpritePlayer({ animation, size = 96, paused = false, reducedMotion = false, playOnce = false, onComplete, onAssetChange, fallback }: Props) {
  const key = mimoFramesKey(animation);
  const [result, setResult] = useState<{ key: string; asset?: LoadedMimoFrames } | null>(null);
  const asset = cachedMimoFrames(animation) ?? (result?.key === key ? result.asset : undefined);
  const ready = animation.status !== 'verified' || result?.key === key || !!asset;
  const [hidden, setHidden] = useState(document.hidden);
  const node = useRef<HTMLCanvasElement>(null);
  const elapsed = useRef(0);
  const completed = useRef(false);
  const callback = useRef(onComplete);
  const systemReduced = useMimoReducedMotion();
  const reduced = reducedMotion || systemReduced;
  useEffect(() => { callback.current = onComplete; }, [onComplete]);
  useEffect(() => { onAssetChange?.(!!asset); }, [asset, onAssetChange]);
  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, []);
  useEffect(() => {
    if (animation.status !== 'verified') return;
    let active = true;
    void preloadMimoFrames(animation).then((value) => { if (active) setResult({ key, asset: value }); }, () => { if (active) setResult({ key }); });
    return () => { active = false; };
  }, [animation, key]);
  useLayoutEffect(() => {
    elapsed.current = 0; completed.current = false;
  }, [animation, playOnce]);
  useLayoutEffect(() => {
    const canvas = node.current;
    if (!canvas || !asset) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, animation.frameWidth, animation.frameHeight);
    ctx?.drawImage(asset.images[0]!, 0, 0);
    canvas.dataset.frame = '0';
  }, [asset, animation.frameWidth, animation.frameHeight]);
  useEffect(() => {
    const canvas = node.current;
    if (reduced && canvas && asset) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height); ctx?.drawImage(asset.images[0]!, 0, 0); canvas.dataset.frame = '0';
    }
    if (paused || hidden || !ready || completed.current) return;
    const once = playOnce || !animation.loop;
    if ((!asset || reduced) && !once) return;
    let raf = 0, previous = performance.now();
    let lastFrame = Number(canvas?.dataset.frame ?? -1);
    const ctx = canvas?.getContext('2d');
    const tick = (now: number) => {
      elapsed.current += now - previous; previous = now;
      const frame = reduced ? 0 : mimoFrameAt(animation, elapsed.current, once);
      if (canvas && ctx && asset && frame !== lastFrame) {
        ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(asset.images[frame]!, 0, 0);
        canvas.dataset.frame = String(frame); lastFrame = frame;
      }
      if (once && elapsed.current >= animation.durationMs) { completed.current = true; callback.current?.(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, hidden, ready, asset, reduced, animation, playOnce]);
  return <span className="mimo-sprite-player" data-asset={asset ? 'frames' : 'static-preview'} style={{ width: size, height: size }}>
    {asset ? <canvas ref={node} className="mimo-sprite" aria-hidden="true" width={animation.frameWidth} height={animation.frameHeight} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : fallback}
  </span>;
}

