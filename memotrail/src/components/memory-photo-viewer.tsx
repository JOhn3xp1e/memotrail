import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Expand, Image, ZoomOut } from "lucide-react";
import { LocalMediaImage } from "@/components/local-media-image";
import { usePreferences } from "@/stores/preferences";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function MemoryPhotoViewer({ photos, title }: {
  photos: { id: string; source: Blob | string }[];
  title: string;
}) {
  const [selectedId, setSelectedId] = useState(photos[0]?.id);
  const [fullscreen, setFullscreen] = useState(false);
  const systemReducedMotion = useReducedMotion();
  const reduceMotion = usePreferences((state) => state.reduceMotion) || systemReducedMotion;
  const [zoom, setZoom] = useState({ scale: 1, x: 0, y: 0 });
  const touch = useRef<{ x: number; y: number; distance: number; scale: number; offsetX: number; offsetY: number; multi: boolean } | null>(null);
  function resetZoom() { setZoom({ scale: 1, x: 0, y: 0 }); }
  const index = Math.max(0, photos.findIndex((photo) => photo.id === selectedId));
  const photo = photos[index];
  function move(direction: number) {
    resetZoom();
    setSelectedId(photos[(index + direction + photos.length) % photos.length]?.id);
  }
  function viewer(expanded: boolean) {
    return <div className={`details-viewer ${expanded ? "details-viewer-expanded" : ""}`}
      role="region" aria-label="Memory photos" tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1);
        }
      }}
      onDoubleClick={(event) => { if (expanded && !(event.target as HTMLElement).closest("button")) setZoom({ scale: zoom.scale > 1 ? 1 : 2, x: 0, y: 0 }); }}
      onTouchStart={(event) => {
        const point = event.touches[0];
        const second = event.touches[1];
        touch.current = point ? { x: point.clientX, y: point.clientY,
          distance: second ? Math.hypot(second.clientX - point.clientX, second.clientY - point.clientY) : 0,
          scale: zoom.scale, offsetX: zoom.x, offsetY: zoom.y, multi: event.touches.length > 1 } : null;
      }}
      onTouchMove={(event) => {
        if (!expanded || !touch.current) return;
        const start = touch.current;
        const point = event.touches[0];
        const second = event.touches[1];
        if (!point) return;
        if (second && start.distance > 0) {
          const scale = Math.min(4, Math.max(1, start.scale * Math.hypot(second.clientX - point.clientX, second.clientY - point.clientY) / start.distance));
          setZoom({ scale, x: 0, y: 0 });
        } else if (!start.multi && start.scale > 1) {
          const bounds = event.currentTarget.getBoundingClientRect();
          const limitX = bounds.width * (start.scale - 1) / 2;
          const limitY = bounds.height * (start.scale - 1) / 2;
          setZoom({ scale: start.scale,
            x: Math.max(-limitX, Math.min(limitX, start.offsetX + point.clientX - start.x)),
            y: Math.max(-limitY, Math.min(limitY, start.offsetY + point.clientY - start.y)) });
        }
      }}
      onTouchCancel={() => { touch.current = null; }}
      onTouchEnd={(event) => {
        const point = event.changedTouches[0];
        const start = touch.current;
        if (start && !start.multi && (!expanded || zoom.scale === 1) && point && Math.abs(point.clientX - start.x) > 45 && Math.abs(point.clientX - start.x) > Math.abs(point.clientY - start.y)) move(point.clientX < start.x ? 1 : -1);
        touch.current = null;
      }}>
      {photo ? <AnimatePresence mode="wait" initial={false}>
        <motion.div className="details-viewer-image" key={photo.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.18 }}>
          <div className="details-photo-surface" style={expanded ? { transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})` } : undefined}>
          <LocalMediaImage source={photo.source} alt={`${title} — photo ${index + 1}`} loading="eager" />
          </div>
        </motion.div>
      </AnimatePresence> : <div className="details-no-photo"><Image size={40} /><span>A moment kept in words.</span></div>}
      {photos.length > 1 && <>
        <motion.button type="button" className="gallery-control details-prev" whileHover={reduceMotion ? undefined : { scale: 1.08 }} whileTap={reduceMotion ? undefined : { scale: 0.92 }} aria-label="Previous photo" onClick={() => move(-1)}><ChevronLeft size={20} /></motion.button>
        <motion.button type="button" className="gallery-control details-next" whileHover={reduceMotion ? undefined : { scale: 1.08 }} whileTap={reduceMotion ? undefined : { scale: 0.92 }} aria-label="Next photo" onClick={() => move(1)}><ChevronRight size={20} /></motion.button>
      </>}
      {expanded && zoom.scale > 1 && <motion.button type="button" className="gallery-control details-expand" aria-label="Reset photo zoom" onClick={resetZoom}><ZoomOut size={18} /></motion.button>}
      {photo && <span className="details-photo-count" role="status">{index + 1} / {photos.length}</span>}
      {!expanded && photo && <motion.button type="button" className="gallery-control details-expand" whileHover={reduceMotion ? undefined : { scale: 1.08 }} whileTap={reduceMotion ? undefined : { scale: 0.92 }} aria-label="View photos fullscreen" onClick={() => { resetZoom(); setFullscreen(true); }}><Expand size={18} /></motion.button>}
    </div>;
  }
  return <>
    {viewer(false)}
    {photos.length > 1 && <div className="details-thumbnails" aria-label="Choose a photo">
      {photos.map((item, position) => <button key={item.id} aria-label={`View photo ${position + 1}`} aria-pressed={position === index} onClick={() => { resetZoom(); setSelectedId(item.id); }}>
        <LocalMediaImage source={item.source} alt="" />
      </button>)}
    </div>}
    <Dialog open={fullscreen} onOpenChange={(open) => { resetZoom(); setFullscreen(open); }}>
      <DialogContent className="details-fullscreen">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>Swipe or use arrow keys to explore. Pinch to zoom and drag to pan, or double-click to zoom.</DialogDescription>
        {viewer(true)}
      </DialogContent>
    </Dialog>
  </>;
}
