import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Expand, Image } from "lucide-react";
import { LocalMediaImage } from "@/components/local-media-image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function MemoryPhotoViewer({ photos, title }: {
  photos: { id: string; source: Blob | string }[];
  title: string;
}) {
  const [selectedId, setSelectedId] = useState(photos[0]?.id);
  const [fullscreen, setFullscreen] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const index = Math.max(0, photos.findIndex((photo) => photo.id === selectedId));
  const photo = photos[index];
  function move(direction: number) {
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
      onTouchStart={(event) => { const point = event.touches[0]; touch.current = point ? { x: point.clientX, y: point.clientY } : null; }}
      onTouchCancel={() => { touch.current = null; }}
      onTouchEnd={(event) => {
        const point = event.changedTouches[0];
        const start = touch.current;
        if (start && point && Math.abs(point.clientX - start.x) > 45 && Math.abs(point.clientX - start.x) > Math.abs(point.clientY - start.y)) move(point.clientX < start.x ? 1 : -1);
        touch.current = null;
      }}>
      {photo ? <AnimatePresence mode="wait" initial={false}>
        <motion.div className="details-viewer-image" key={photo.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          <LocalMediaImage source={photo.source} alt={`${title} — photo ${index + 1}`} loading="eager" />
        </motion.div>
      </AnimatePresence> : <div className="details-no-photo"><Image size={40} /><span>A moment kept in words.</span></div>}
      {photos.length > 1 && <>
        <Button className="details-prev" size="icon" variant="secondary" aria-label="Previous photo" onClick={() => move(-1)}><ChevronLeft size={20} /></Button>
        <Button className="details-next" size="icon" variant="secondary" aria-label="Next photo" onClick={() => move(1)}><ChevronRight size={20} /></Button>
      </>}
      {photo && <span className="details-photo-count" role="status">{index + 1} / {photos.length}</span>}
      {!expanded && photo && <Button className="details-expand" variant="secondary" size="icon" aria-label="View photos fullscreen" onClick={() => setFullscreen(true)}><Expand size={18} /></Button>}
    </div>;
  }
  return <>
    {viewer(false)}
    {photos.length > 1 && <div className="details-thumbnails" aria-label="Choose a photo">
      {photos.map((item, position) => <button key={item.id} aria-label={`View photo ${position + 1}`} aria-pressed={position === index} onClick={() => setSelectedId(item.id)}>
        <LocalMediaImage source={item.source} alt="" />
      </button>)}
    </div>}
    <Dialog open={fullscreen} onOpenChange={setFullscreen}>
      <DialogContent className="details-fullscreen">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>Swipe or use the arrow keys to explore your photos.</DialogDescription>
        {viewer(true)}
      </DialogContent>
    </Dialog>
  </>;
}
