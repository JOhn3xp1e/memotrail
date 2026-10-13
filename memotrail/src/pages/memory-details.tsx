import { useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, CalendarDays, FolderHeart, Heart, MapPin, Pencil, Trash2 } from "lucide-react";
import { useMemoryDetails } from "@/hooks/use-memory-details";
import { useSamples } from "@/stores/samples";
import { memoryRepository } from "@/services/memory-repository";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MemoryPhotoViewer } from "@/components/memory-photo-viewer";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function MemoryDetailsPage() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  return <MemoryDetails key={`${id}:${params.get("sample")}`} id={id} sample={params.get("sample") === "1"} />;
}

function MemoryDetails({ id, sample }: { id: string; sample: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [retry, setRetry] = useState(0);
  const result = useMemoryDetails(id, sample, retry);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sampleFavorite = useSamples((state) => state.favorites.includes(id));
  const toggleSample = useSamples((state) => state.toggleFavorite);
  const back = <Button variant="ghost" onClick={() => location.key !== "default" ? navigate(-1) : navigate("/timeline")}><ArrowLeft size={16} /> Back</Button>;

  async function action(remove: boolean) {
    setBusy(true);
    setError("");
    try {
      if (remove) {
        await memoryRepository.deleteMemory(id);
        navigate("/timeline", { replace: true });
      } else if (sample) toggleSample(id);
      else await memoryRepository.toggleFavorite(id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update this memory. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!result) return <>{back}<p className="memory-loading" role="status">Opening your memory…</p></>;
  if (result.error) return <>{back}<div className="details-state"><h1>A little trouble opening this moment.</h1><p role="alert">{result.error}</p><Button onClick={() => setRetry((value) => value + 1)}>Try again</Button></div></>;
  if (!result.memory) return <>{back}<div className="details-state"><Heart size={36} /><h1>This memory isn’t here.</h1><p>It may have been removed, or saved on another device.</p><Button asChild><Link to="/timeline">Back to memories</Link></Button></div></>;
  const { memory, photos, collection } = result;
  const favorite = sample ? sampleFavorite : memory.favorite;
  return <motion.article className="memory-details-page" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
    <div className="details-toolbar">{back}<span className="eyebrow">{sample ? "A SAMPLE MOMENT" : "YOUR LITTLE KEEPSAKE"}</span></div>
    <div className="details-layout">
      <div className="details-gallery"><span className="washi-tape" aria-hidden="true" /><MemoryPhotoViewer photos={photos} title={memory.title} /></div>
      <section className="details-story">
        <span className="eyebrow">A MOMENT TO KEEP</span>
        <h1>{memory.title}</h1>
        <div className="details-metadata">
          <span><CalendarDays size={16} /><time dateTime={memory.memoryDate}>{formatDate(memory.memoryDate)}</time></span>
          {memory.locationName && <span><MapPin size={16} />{memory.locationName}</span>}
          <span className="category-tag">{memory.mood}</span>
          {collection && <Link to={`/collections?album=${encodeURIComponent(collection.id)}`}><FolderHeart size={16} />{collection.name}</Link>}
        </div>
        <p className="details-story-text">{memory.description || "Sometimes the photo says it all."}</p>
        <div className="details-actions">
          <Button variant="secondary" disabled={busy} aria-pressed={favorite} onClick={() => action(false)}><Heart size={17} fill={favorite ? "currentColor" : "none"} />{favorite ? "Unfavorite memory" : "Favorite memory"}</Button>
          {!sample && <>
            <Button asChild variant="secondary"><Link to={`/add?id=${encodeURIComponent(id)}`}><Pencil size={16} />Edit memory</Link></Button>
            <Button variant="ghost" disabled={busy} onClick={() => { setError(""); setConfirmDelete(true); }}><Trash2 size={16} />Delete</Button>
          </>}
        </div>
        {error && !confirmDelete && <p className="form-error" role="alert">{error}</p>}
        <p className="fine-print">{sample ? "A sample memory to spark a little inspiration." : "Just yours. Saved privately on this device."}</p>
      </section>
    </div>
    <Dialog open={confirmDelete} onOpenChange={(open) => { if (!busy) setConfirmDelete(open); }}>
      <DialogContent>
        <DialogTitle>Let this memory go?</DialogTitle>
        <DialogDescription>This memory and its photos will be permanently removed from this device.</DialogDescription>
        <div className="dialog-actions"><Button variant="ghost" disabled={busy} onClick={() => setConfirmDelete(false)}>Keep memory</Button><Button disabled={busy} onClick={() => action(true)}>{busy ? "Deleting…" : "Delete memory"}</Button></div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </DialogContent>
    </Dialog>
  </motion.article>;
}
