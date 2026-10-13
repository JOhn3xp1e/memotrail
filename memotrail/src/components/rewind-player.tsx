import { useEffect, useRef, useState } from "react";
import { useMimo } from "@/stores/mimo";
import { MimoMascot } from "@/components/mimo-mascot";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Download, Pause, Play } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LocalMediaImage } from "@/components/local-media-image";
import { usePreferences } from "@/stores/preferences";
import type { RewindPhoto, RewindSlide } from "@/lib/rewind";

function PhotoTile({ photo, reduced, caption = true }: { photo: RewindPhoto; reduced: boolean; caption?: boolean }) {
  return <motion.div
    className="rewind-photo-tile"
    initial={reduced ? false : { opacity: 0, y: 12, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: reduced ? 0 : 0.32 }}
  >
    <LocalMediaImage source={photo.blob} alt={photo.title} loading="eager" />
    {caption && <span className="rewind-photo-caption"><strong>{photo.title}</strong><time dateTime={photo.date}>{photo.date}</time></span>}
    {photo.favorite && <span className="rewind-favorite-mark" aria-label="Marked as a favorite">♥</span>}
  </motion.div>;
}
 
function SlideVisual({ slide, reduced }: { slide: RewindSlide; reduced: boolean }) {
  const photos = slide.photos ?? [];
  if (slide.kind === "title") {
    return photos[0] ? <div className="rewind-backdrop"><LocalMediaImage source={photos[0].blob} alt={photos[0].title} loading="eager" /></div> : null;
  }
  if (slide.kind === "stats") {
    return photos.length ? <div className="rewind-photo-strip">{photos.map((photo) => <PhotoTile key={photo.id} photo={photo} reduced={reduced} caption={false} />)}</div> : null;
  }
  if (slide.kind === "collections") {
    return <div className="rewind-collection-grid">
      {(slide.collectionCards ?? []).map((card, index) => <motion.div className="rewind-collection-card" key={`${card.name}-${index}`} initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : index * 0.06 }}>
        {card.photo ? <PhotoTile photo={card.photo} reduced={reduced} caption={false} /> : <span className="rewind-collection-empty" aria-hidden="true">♡</span>}
        <strong>{card.name}</strong>
      </motion.div>)}
    </div>;
  }
  if (slide.kind === "favorite-featured") {
    return photos[0] ? <div className="rewind-featured-photo"><LocalMediaImage source={photos[0].blob} alt={photos[0].title} loading="eager" /></div> : null;
  }
  if (slide.kind === "favorite-story") {
    return <div className="rewind-photo-grid rewind-photo-split">{photos.map((photo) => <PhotoTile key={photo.id} photo={photo} reduced={reduced} />)}</div>;
  }
  if (slide.kind === "favorite-collage" || slide.kind === "collage" || slide.kind === "closing") {
    return photos.length ? <div className="rewind-collage">{photos.map((photo) => <PhotoTile key={photo.id} photo={photo} reduced={reduced} />)}</div> : null;
  }
  if (slide.kind === "favorite-card") {
    return <div className="rewind-photo-grid rewind-photo-card">{photos.slice(0, 2).map((photo) => <PhotoTile key={photo.id} photo={photo} reduced={reduced} />)}</div>;
  }
  return photos.length ? <div className="rewind-photo-grid">{photos.map((photo) => <PhotoTile key={photo.id} photo={photo} reduced={reduced} />)}</div> : null;
}

export function RewindPlayer({ slides, period, onClose }: { slides: RewindSlide[]; period: string; onClose: () => void }) {
  const systemReduced = useReducedMotion();
  const reduced = usePreferences((state) => state.reduceMotion) || systemReduced;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(!!reduced);
  const [renderedIndex, setRenderedIndex] = useState(0);
  const [hidden, setHidden] = useState(document.hidden);
  const [elapsed, setElapsed] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const node = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const finished = useRef(false);
  const current = Math.min(index, slides.length - 1);
  const slide = slides[current]!;
  const stopped = paused || hidden || exporting;
  useEffect(() => {
    useMimo.getState().setRewindOpen(true);
    return () => useMimo.getState().setRewindOpen(false);
  }, []);
  useEffect(() => {
    // Reaching the closing slide also completes a manually advanced recap.
    if (current === slides.length - 1 && !finished.current) {
      finished.current = true;
      useMimo.getState().play("celebrate");
    }
  }, [current, slides.length]);

  useEffect(() => {
    mounted.current = true;
    const visibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => { mounted.current = false; document.removeEventListener("visibilitychange", visibility); };
  }, []);
  useEffect(() => {
    if (stopped) return;
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      setElapsed((previous) => previous + now - last);
      last = now;
    }, 80);
    return () => clearInterval(timer);
  }, [stopped, current]);
  useEffect(() => {
    if (elapsed < 6000 || stopped) return;
    if (current === slides.length - 1) {
      setPaused(true);
      return;
    }
    setIndex((value) => value + 1); setElapsed(0);
  }, [elapsed, stopped, current, slides.length]);

  function move(direction: number) {
    if (exporting) return;
    setIndex(Math.max(0, Math.min(slides.length - 1, current + direction)));
    setElapsed(0); setError("");
  }

  async function exportSlide() {
    if (!node.current || exporting || renderedIndex !== current) return;
    setExporting(true); setError("");
    try {
      await document.fonts.ready;
      await Promise.all(Array.from(node.current.querySelectorAll("img")).map((image) => image.decode().catch(() => undefined)));
      const { toPng } = await import("html-to-image");
      if (!mounted.current || !node.current) return;
      const data = await toPng(node.current, { pixelRatio: 1080 / node.current.offsetWidth, preferredFontFormat: "woff2" });
      if (!mounted.current) return;
      const link = document.createElement("a");
      link.download = `memotrail-rewind-${period}-${current + 1}.png`;
      link.href = data; document.body.append(link); link.click(); link.remove();
    } catch { if (mounted.current) setError("This slide couldn’t be exported. Please try again."); }
    finally { if (mounted.current) setExporting(false); }
  }

  const featured = slide.kind === "favorite-featured";
  const usesPhotoCanvas = ["title", "favorite-featured"].includes(slide.kind);
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="rewind-player" onKeyDown={(event) => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1); }
    if (event.code === "Space" && event.target === event.currentTarget) { event.preventDefault(); setPaused((value) => !value); }
  }}>
    <DialogTitle>Memory Rewind · {period}</DialogTitle><DialogDescription>Use arrow keys, swipe, or tap the left and right sides to navigate. Escape closes the rewind.</DialogDescription>
    <div className="rewind-progress" aria-label={`Slide ${current + 1} of ${slides.length}`}>
      {slides.map((_, position) => <span key={position}><span style={{ transform: `scaleX(${position < current ? 1 : position === current ? Math.min(elapsed / 6000, 1) : 0})` }} /></span>)}
    </div>
    <div className="rewind-stage" onTouchStart={(event) => { const point = event.touches[0]; touch.current = point ? { x: point.clientX, y: point.clientY } : null; swiped.current = false; }} onTouchCancel={() => { touch.current = null; }} onTouchEnd={(event) => {
      const point = event.changedTouches[0]; const start = touch.current;
      if (point && start && Math.abs(point.clientX - start.x) > 40 && Math.abs(point.clientX - start.x) > Math.abs(point.clientY - start.y)) { swiped.current = true; move(point.clientX < start.x ? 1 : -1); }
      touch.current = null;
    }} onClick={(event) => {
      if (swiped.current) { swiped.current = false; return; }
      const bounds = event.currentTarget.getBoundingClientRect(); move(event.clientX < bounds.left + bounds.width / 2 ? -1 : 1);
    }}>
      <AnimatePresence mode="wait" initial={false}><motion.div key={`${period}-${current}`} initial={{ opacity: 0, scale: reduced ? 1 : 0.99 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.24 }} onAnimationComplete={() => setRenderedIndex(current)}>
        <div ref={node} className={`rewind-slide rewind-${slide.kind}`}>
          <SlideVisual slide={slide} reduced={!!reduced} />
          {!featured && <span className="rewind-brand">MemoTrail. / YOUR REWIND</span>}
          {featured && <div className="rewind-featured-copy"><span className="eyebrow">{slide.title}</span><p className="rewind-featured-subtitle">{slide.subtitle}</p><h2>{slide.photos?.[0]?.title}</h2><time dateTime={slide.date}>{slide.date}</time>{!!slide.story && <p className="rewind-featured-story">{slide.story}</p>}</div>}
          {!featured && <motion.div className="rewind-slide-copy" initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : 0.35, delay: reduced ? 0 : 0.08 }}>
            {!usesPhotoCanvas && <span className="eyebrow">{period}</span>}
            <h2>{slide.title}</h2><p>{slide.subtitle}</p>
            {!!slide.date && <time className="rewind-memory-date" dateTime={slide.date}>{slide.date}</time>}
            {!!slide.story && slide.kind !== "favorite-story" && <p className="rewind-memory-story">{slide.story.length > 150 ? `${slide.story.slice(0, 147).trimEnd()}…` : slide.story}</p>}
            {!!slide.lines?.length && <ul>{slide.lines.map((line, position) => <li key={position}>{line}</li>)}</ul>}
          </motion.div>}
          <span className="rewind-signature">the good bits, kept forever ♡</span>
        </div>
      </motion.div></AnimatePresence>
    </div>
    <div className="rewind-controls">
      <button aria-label="Previous slide" disabled={current === 0 || exporting} onClick={() => move(-1)}><ChevronLeft size={20} /></button>
      <button aria-label={paused ? "Resume rewind" : "Pause rewind"} disabled={exporting} onClick={() => setPaused((value) => !value)}>{paused ? <Play size={18} /> : <Pause size={18} />}</button>
      <button aria-label="Next slide" disabled={current === slides.length - 1 || exporting} onClick={() => move(1)}><ChevronRight size={20} /></button>
      <button onClick={exportSlide} disabled={exporting || renderedIndex !== current}><Download size={17} />{exporting ? "Exporting…" : "Export PNG"}</button>
    </div>
    {reduced && <p className="rewind-player-note">Reduced motion: animations off. Playback starts paused.</p>}
    {current === slides.length - 1 && <div className="rewind-mimo"><MimoMascot inline /></div>}
    {error && <p className="rewind-export-error" role="alert">{error}</p>}
  </DialogContent></Dialog>;
}
