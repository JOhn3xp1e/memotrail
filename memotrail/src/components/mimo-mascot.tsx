import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Minus } from 'lucide-react';
import { MimoSpritePlayer } from '@/components/mimo-sprite-player';
import { loadMimoManifest, mimoFallback, mimoManifestUrl, mimoMessages, type MimoManifest, type MimoState } from '@/lib/mimo';
import { useMimo } from '@/stores/mimo';
import { useMimoReducedMotion } from '@/hooks/use-mimo-reduced-motion';
import { preloadMimoFrames } from '@/lib/mimo-frames';

interface Props { state?: MimoState; manifestUrl?: string; size?: number; inline?: boolean; onComplete?: () => void; onActivate?: () => void }
export function MimoMascot({ state: controlledState, manifestUrl = mimoManifestUrl, size = 88, inline = false, onComplete, onActivate }: Props) {
  const controller = useMimo();
  const state = controlledState ?? controller.state;
  const reduced = useMimoReducedMotion();
  const [manifestResult, setManifestResult] = useState<{ url: string; value: MimoManifest } | null>(null);
  const manifest = manifestResult?.url === manifestUrl ? manifestResult.value : {};
  const [hidden, setHidden] = useState(document.hidden);
  const [spriteLoaded, setSpriteLoaded] = useState(false);
  const statusId = useId();
  const restoreButton = useRef<HTMLButtonElement>(null);
  const greetButton = useRef<HTMLButtonElement>(null);
  const moveFocus = useRef(false);
  useLayoutEffect(() => {
    if (moveFocus.current) {
      (controller.minimized ? restoreButton : greetButton).current?.focus({ preventScroll: true });
      moveFocus.current = false;
    }
  }, [controller.minimized]);
  function minimize(value: boolean) {
    moveFocus.current = true;
    controller.minimize(value);
  }
  const paused = hidden || (!inline && controller.rewindOpen);
  useEffect(() => {
    let active = true;
    void loadMimoManifest(manifestUrl).then((value) => { if (active) setManifestResult({ url: manifestUrl, value }); }).catch(() => { /* Static preview remains available offline or with invalid metadata. */ });
    return () => { active = false; };
  }, [manifestUrl]);
  useEffect(() => {
    if (manifestResult?.url !== manifestUrl) return;
    // Idle must be ready when a reaction ends; greeting is the common first action.
    const strips = Object.values(manifestResult.value).filter((animation) => animation?.format === 'horizontal-strip');
    const animations = strips.length ? strips : [manifestResult.value.idle, manifestResult.value.wave];
    for (const animation of animations) {
      if (animation?.status === 'verified') void preloadMimoFrames(animation).catch(() => undefined);
    }
  }, [manifestResult, manifestUrl]);
  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, []);
  const animation = manifest[state === 'memoryJar' ? 'memory_jar' : state] ?? manifest[state] ?? mimoFallback[state];
  const requestId = controller.requestId;
  return <aside className={`mimo-companion${inline ? ' mimo-inline' : ''}`} aria-label="Mimo memory companion" data-state={state} data-paused={paused || controller.minimized} data-reduced={reduced} hidden={!inline && controller.rewindOpen}>
    {controller.minimized ? <button ref={restoreButton} className="mimo-restore" onClick={() => minimize(false)} aria-label="Restore Mimo">Mimo</button> : <>
      <button className="mimo-minimize" onClick={() => minimize(true)} aria-label="Minimize Mimo"><Minus size={16} /></button>
      <button ref={greetButton} className="mimo-greet" data-mimo-launcher={onActivate ? '' : undefined} aria-label={onActivate ? 'Chat with Mimo' : 'Wave to Mimo'} aria-haspopup={onActivate ? 'dialog' : undefined} aria-describedby={statusId} onClick={() => { controller.play('wave'); onActivate?.(); }}>
        <MimoSpritePlayer key={`${state}-${requestId}-${manifestUrl}`} animation={animation} size={size} paused={paused} reducedMotion={reduced} onAssetChange={setSpriteLoaded} playOnce={controlledState ? !animation.loop : controller.temporary} onComplete={() => { if (!controlledState) controller.finish(requestId); onComplete?.(); }} fallback={<img className="mimo-preview" src={`${import.meta.env.BASE_URL}MASCOTMIMO/mimo_pack/reference/mimo_static_preview.svg`} alt="Static Mimo preview: cream bunny with floppy ears, lavender scarf and Polaroid camera" draggable={false} />} />
      </button>
      <span className="mimo-name">Mimo <small>{spriteLoaded ? 'Companion' : 'Static preview'}</small></span>
    </>}
    <span id={statusId} className="sr-only" role="status">{mimoMessages[state]}</span>
  </aside>;
}
