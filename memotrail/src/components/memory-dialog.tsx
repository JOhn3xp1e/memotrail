import { useState } from "react";
import { CalendarDays, Heart, MapPin, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { MemoryView, Media } from "@/types/memory";
import { formatDate } from "@/lib/utils";
import { useSamples } from "@/stores/samples";
import { memoryRepository } from "@/services/memory-repository";
import { LocalMediaImage } from "@/components/local-media-image";
import { MemoConfirmDialog } from "@/components/ui/memo-confirm-dialog";

export function MemoryDialog({
  memory,
  onClose,
  onDeleted,
}: {
  memory: MemoryView | null;
  onClose: () => void;
  onDeleted?: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState<{
    memoryId: string;
    message: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [favoriteOverride, setFavoriteOverride] = useState<{
    memoryId: string;
    value: boolean;
  } | null>(null);
  const sampleFavorite = useSamples((state) =>
    memory ? state.favorites.includes(memory.id) : false,
  );
  const toggleSampleFavorite = useSamples((state) => state.toggleFavorite);
  const favorite =
    memory?.source === "sample"
      ? sampleFavorite
      : (memory &&
          favoriteOverride?.memoryId === memory.id
          ? favoriteOverride.value
          : (memory?.favorite ?? false));
  const visibleError =
    memory && actionError?.memoryId === memory.id ? actionError.message : "";

  async function toggleFavorite() {
    if (!memory) return;
    try {
      setBusy(true);
      setActionError(null);
      if (memory.source === "sample") toggleSampleFavorite(memory.id);
      else {
        await memoryRepository.toggleFavorite(memory.id);
        setFavoriteOverride({ memoryId: memory.id, value: !favorite });
      }
    } catch (error) {
      setActionError({
        memoryId: memory.id,
        message:
          error instanceof Error ? error.message : "Could not update favorite.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function deleteMemory() {
    if (!memory || memory.source !== "personal") return;
    try {
      setBusy(true);
      setActionError(null);
      await memoryRepository.deleteMemory(memory.id);
      onDeleted?.(memory.id);
      setConfirmDelete(false);
      onClose();
    } catch (error) {
      setActionError({
        memoryId: memory.id,
        message:
          error instanceof Error
            ? error.message
            : "Could not delete this memory.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Dialog
        open={!!memory}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent className="memory-dialog">
          {memory && (
            <>
              <div className="memory-detail-photo">
                <LocalMediaImage
                  source={memory.image}
                  alt={photoAlt(memory)}
                  fallbackClassName="detail-photo-empty"
                  loading="eager"
                />
                {memory.source === "sample" && (
                  <span className="handwritten">{memory.caption}</span>
                )}
              </div>
              <div className="memory-detail-body">
                <span className="eyebrow">
                  {memory.source === "sample" ? "A SAMPLE MOMENT" : "YOUR MEMORY"}
                </span>
                <DialogTitle>{memory.title}</DialogTitle>
                <DialogDescription>
                  {memory.source === "sample"
                    ? "Sample memory and photography, here to spark a little inspiration."
                    : "Saved privately on this device."}
                </DialogDescription>
                <div className="detail-meta">
                  <span>
                    <CalendarDays size={15} />
                    {formatDate(memory.date)}
                  </span>
                  {memory.location && (
                    <span>
                      <MapPin size={15} />
                      {memory.location}
                    </span>
                  )}
                </div>
                <p className="memory-story">
                  {memory.story || "Sometimes the photo says it all."}
                </p>
                {memory.source === "personal" && memory.photos.length > 1 && (
                  <div className="draft-photo-strip">
                    {memory.photos.slice(1).map((photo) => (
                      <PhotoThumb key={photo.id} photo={photo} />
                    ))}
                  </div>
                )}
                <div className="detail-footer">
                  <span className="category-tag">{memory.mood}</span>
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-pressed={favorite}
                    disabled={busy}
                    onClick={toggleFavorite}
                  >
                    <Heart size={15} fill={favorite ? "currentColor" : "none"} />
                    {favorite ? "A favorite moment" : "Make it a favorite"}
                  </Button>
                </div>
                {memory.source === "personal" ? (
                  <div className="dialog-actions">
                    <Button asChild variant="secondary">
                      <Link to={`/add?id=${encodeURIComponent(memory.id)}`}>
                        <Pencil size={15} />
                        Edit memory
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 size={15} />
                      Delete
                    </Button>
                  </div>
                ) : (
                  <p className="fine-print">
                    Sample favorites last for this session. Nothing is added to
                    your journal.
                  </p>
                )}
                {visibleError && (
                  <p className="form-error" role="alert">
                    {visibleError}
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <MemoConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Let this memory go?" description="This memory and its photos will be permanently removed from this device." cancelLabel="Keep memory" confirmLabel={busy ? "Deleting…" : "Delete memory"} busy={busy} onConfirm={() => void deleteMemory()}>
          {visibleError && (
            <p className="form-error" role="alert">
              {visibleError}
            </p>
          )}
      </MemoConfirmDialog>
    </>
  );
}

function PhotoThumb({ photo }: { photo: Media }) {
  return (
    <LocalMediaImage
      source={photo.blob}
      alt="Another photo from this memory"
      loading="lazy"
    />
  );
}

function photoAlt(memory: MemoryView) {
  return memory.source === "sample" ? memory.alt : `Photo for ${memory.title}`;
}
