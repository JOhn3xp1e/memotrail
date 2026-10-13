import { useState } from "react";
import { Image } from "lucide-react";
import type { PersonalCollectionView } from "@/types/memory";
import { memoryRepository } from "@/services/memory-repository";
import { LocalMediaImage } from "@/components/local-media-image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function CollectionCoverPicker({ collection }: { collection: PersonalCollectionView }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function choose(mediaId?: string) {
    setBusy(true);
    setError("");
    try {
      await memoryRepository.setCollectionCover(collection.id, mediaId);
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update this cover.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <Button variant="secondary" onClick={() => { setError(""); setOpen(true); }}>
      <Image size={15} /> Choose cover
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogTitle>A face for this chapter.</DialogTitle>
        <DialogDescription>Choose a favorite photo, or let your latest photos create an album cover.</DialogDescription>
        <Button variant="secondary" disabled={busy} onClick={() => choose()}>
          Use automatic collage
        </Button>
        <div className="collection-cover-picker">
          {collection.photos.map((photo, index) => (
            <button type="button" key={photo.id} disabled={busy}
              aria-label={`Set as Collection Cover: photo ${index + 1}`}
              aria-pressed={collection.coverMediaId === photo.id}
              onClick={() => choose(photo.id)}>
              <LocalMediaImage source={photo.blob} alt={`Collection photo ${index + 1}`} />
              <span>Set as Collection Cover</span>
            </button>
          ))}
        </div>
        {!collection.photos.length && <p>Add a photo to a memory in this collection to choose a cover.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </DialogContent>
    </Dialog>
  </>;
}
