import { useEffect, useRef, useState } from "react";
import { useMimo } from "@/stores/mimo";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Heart, Shuffle, Sparkles } from "lucide-react";
import { memoryRepository } from "@/services/memory-repository";
import { useMemoryDetails } from "@/hooks/use-memory-details";
import { usePreferences } from "@/stores/preferences";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { LocalMediaImage } from "@/components/local-media-image";
import { formatDate } from "@/lib/utils";
import { memoryPath } from "@/lib/memory-path";

export function MemoryJarPage() {
  const [retry, setRetry] = useState(0);
  const data = useLiveQuery(async () => {
    try { return { memories: await memoryRepository.listMemories(), error: false }; }
    catch { return { memories: [], error: true }; }
  }, [retry]);
  const [favorites, setFavorites] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const previous = useRef("");
  const [phase, setPhase] = useState<"idle" | "shake" | "note" | "reveal">("idle");
  const systemReduced = useReducedMotion();
  const reduced = usePreferences((state) => state.reduceMotion) || systemReduced;
  const pool = (data?.memories ?? []).filter((memory) => !favorites || memory.favorite);
  const busy = phase === "shake" || phase === "note";
  useEffect(() => {
    if (phase !== "shake" && phase !== "note") return;
    const timer = window.setTimeout(() => setPhase(phase === "shake" && !reduced ? "note" : "reveal"), reduced ? 0 : 650);
    return () => window.clearTimeout(timer);
  }, [phase, reduced]);
  const selected = pool.find((memory) => memory.id === selectedId);
  const revealCount = useRef(0);
  const [pickCount, setPickCount] = useState(0);
  useEffect(() => {
    if (phase === "reveal" && selected && revealCount.current !== pickCount) {
      revealCount.current = pickCount;
      useMimo.getState().play("happy");
    }
  }, [phase, selected, pickCount]);

  function pick() {
    if (busy || !pool.length) return;
    const candidates = pool.length > 1 ? pool.filter((memory) => memory.id !== previous.current) : pool;
    const next = candidates[Math.floor(Math.random() * candidates.length)];
    if (!next) return;
    previous.current = next.id;
    setSelectedId(next.id);
    setPickCount((count) => count + 1);
    setPhase(reduced ? "reveal" : "shake");
  }

  return <div className="jar-page">
    <Button asChild variant="ghost"><Link to="/"><ArrowLeft size={16} />Back home</Link></Button>
    <header className="jar-heading"><span className="eyebrow">A LITTLE SERENDIPITY</span><h1>Your memory jar.</h1><p>Give it a little shake. Let a good moment find you.</p></header>
    <div className="jar-experience">
      <section className="jar-stage" aria-label="Pick a saved memory">
        <label className="jar-favorites"><Heart size={15} />Favorites only<Switch aria-label="Favorites Only" checked={favorites} disabled={busy} onCheckedChange={(checked) => { setFavorites(checked); setSelectedId(""); setPhase("idle"); }} /></label>
        <motion.button type="button" className="glass-jar-button" aria-label="Pick a memory from the jar" disabled={!pool.length || busy || !data || data.error} onClick={pick}
          animate={reduced ? { rotate: 0, y: 0 } : phase === "shake" ? { rotate: [0, -7, 7, -5, 5, 0], y: 0 } : { rotate: 0, y: [0, -5, 0] }}
          transition={phase === "shake" ? { duration: 0.65 } : { duration: reduced ? 0 : 3, repeat: reduced ? 0 : 1 }}
>
          <span className="jar-lid" aria-hidden="true" />
          <span className="glass-jar" aria-hidden="true">
            {Array.from({ length: Math.min(pool.length, 12) }, (_, index) => <span key={index} className={`jar-paper jar-paper-${index % 4}`} style={{ left: `${12 + index % 3 * 25}%`, bottom: `${12 + Math.floor(index / 3) * 15}%`, transform: `rotate(${[-22, 18, -8, 28][index % 4]}deg)` }}><Heart size={13} /></span>)}
            <span className="jar-glass-shine" />
          </span>
          <span className="jar-ground-shadow" aria-hidden="true" />
        </motion.button>
        {phase === "note" && <motion.div className="jar-flying-note" aria-hidden="true" initial={{ y: 30, opacity: 0, rotate: -12, scale: 0.5 }} animate={{ y: -120, opacity: [0, 1, 1, 0], rotate: 8, scale: 1 }} transition={{ duration: reduced ? 0 : 0.65 }}><Heart size={24} /></motion.div>}
        <p className="jar-count" role="status">{!data ? "Opening your jar…" : data.error ? "Your jar couldn’t be opened." : `${pool.length} ${favorites ? "favorite " : ""}${pool.length === 1 ? "memory" : "memories"} tucked inside`}</p>
        {data?.error ? <Button onClick={() => setRetry((value) => value + 1)}>Try again</Button> : <Button onClick={pick} disabled={!pool.length || busy}><Shuffle size={16} />{busy ? "Finding a little joy…" : "Shake the Jar"}</Button>}
      </section>
      <section className="jar-result" aria-label="Revealed memory" aria-busy={busy}>
        <AnimatePresence mode="wait">
          {phase === "reveal" && selected ? <motion.div key={selected.id} initial={{ opacity: 0, y: reduced ? 0 : 18, rotate: reduced ? 0 : -2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.3 }}>
            <JarReveal id={selected.id} onPick={pick} />
          </motion.div> : <motion.div key="waiting" className="jar-waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduced ? 0 : 0.2 }}>
            <Sparkles size={30} /><h2>{busy ? "A little moment, on its way." : !data ? "Every moment has a place." : !pool.length ? favorites ? "Your favorites belong here." : "Good things start with one memory." : selectedId ? "That moment has left the jar." : "What will find you today?"}</h2>
            <p>{busy ? "Some stories are lovely the second time around." : !pool.length ? favorites ? "Mark a memory as a favorite, or turn off Favorites Only to explore them all." : "Save a photo, a feeling, a few words. We’ll keep a little note for you here." : "Tap the glass jar or shake it to unfold a saved memory."}</p>
            {data && !data.error && !data.memories.length && <Button asChild><Link to="/add">Add your first memory</Link></Button>}
          </motion.div>}
        </AnimatePresence>
      </section>
    </div>
  </div>;
}

function JarReveal({ id, onPick }: { id: string; onPick: () => void }) {
  const [retry, setRetry] = useState(0);
  const result = useMemoryDetails(id, false, retry);
  if (!result) return <p role="status">Unfolding your memory…</p>;
  if (result.error) return <div><p role="alert">{result.error}</p><Button onClick={() => setRetry((value) => value + 1)}>Try again</Button></div>;
  if (!result.memory) return <div><p>This memory is no longer available.</p><Button onClick={onPick}>Pick Another</Button></div>;
  const { memory, photos } = result;
  return <article className="jar-reveal-card">
    <span className="washi-tape" aria-hidden="true" />
    {photos[0] ? <LocalMediaImage source={photos[0].source} alt={`Photo for ${memory.title}`} loading="eager" /> : <div className="jar-word-memory"><Heart size={36} /><span className="handwritten">a feeling worth keeping</span></div>}
    <div className="jar-reveal-copy"><time dateTime={memory.memoryDate}>{formatDate(memory.memoryDate)}</time><h2 aria-live="polite">{memory.title}</h2><p>{memory.description || "Sometimes the smallest moments say the most."}</p>
      <div className="jar-reveal-actions"><Button asChild><Link to={memoryPath(memory)}>Open Memory<ArrowUpRight size={16} /></Link></Button><Button variant="secondary" onClick={onPick}><Shuffle size={15} />Pick Another</Button></div>
    </div>
  </article>;
}
