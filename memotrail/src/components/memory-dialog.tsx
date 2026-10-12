import { CalendarDays, Heart, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { SampleMemory } from "@/types/memory";
import { formatDate } from "@/lib/utils";
import { useSamples } from "@/stores/samples";

export function MemoryDialog({
  memory,
  onClose,
}: {
  memory: SampleMemory | null;
  onClose: () => void;
}) {
  const { favorites, toggleFavorite } = useSamples();
  return (
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
              <img src={memory.image} alt={memory.alt} />
              <span className="handwritten">{memory.caption}</span>
            </div>
            <div className="memory-detail-body">
              <span className="eyebrow">A SAMPLE MOMENT</span>
              <DialogTitle>{memory.title}</DialogTitle>
              <DialogDescription>
                Sample memory and photography, here to spark a little
                inspiration.
              </DialogDescription>
              <div className="detail-meta">
                <span>
                  <CalendarDays size={15} />
                  {formatDate(memory.date)}
                </span>
                <span>
                  <MapPin size={15} />
                  {memory.location}
                </span>
              </div>
              <p className="memory-story">{memory.story}</p>
              <div className="detail-footer">
                <span className={`category-tag ${memory.category}`}>
                  {memory.mood}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  aria-pressed={favorites.includes(memory.id)}
                  onClick={() => toggleFavorite(memory.id)}
                >
                  <Heart
                    size={15}
                    fill={
                      favorites.includes(memory.id) ? "currentColor" : "none"
                    }
                  />
                  {favorites.includes(memory.id)
                    ? "A favorite moment"
                    : "Make it a favorite"}
                </Button>
              </div>
              <p className="fine-print">
                Sample favorites last for this session. Nothing is added to your
                journal.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
