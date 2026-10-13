import { Heart, MapPin, Images } from "lucide-react";
import { motion } from "motion/react";
import { formatDate } from "@/lib/utils";
import type { MemoryView } from "@/types/memory";
import { useSamples } from "@/stores/samples";
import { memoryRepository } from "@/services/memory-repository";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { memoryPath } from "@/lib/memory-path";
import { LocalMediaImage } from "@/components/local-media-image";

export function MemoryCard({
  memory,
  onOpen,
  index = 0,
}: {
  memory: MemoryView;
  onOpen?: (memory: MemoryView) => void;
  index?: number;
}) {
  const navigate = useNavigate();
  const open = () => onOpen ? onOpen(memory) : navigate(memoryPath(memory));
  const sampleFavorite = useSamples((state) =>
    state.favorites.includes(memory.id),
  );
  const toggleFavorite = useSamples((state) => state.toggleFavorite);
  const [favoriteError, setFavoriteError] = useState("");
  const favorite =
    memory.source === "sample" ? sampleFavorite : memory.favorite;

  async function onToggleFavorite() {
    if (memory.source === "sample") {
      toggleFavorite(memory.id);
      return;
    }
    try {
      setFavoriteError("");
      await memoryRepository.toggleFavorite(memory.id);
    } catch (error) {
      setFavoriteError(
        error instanceof Error ? error.message : "Could not update favorite.",
      );
    }
  }

  return (
    <motion.article
      className="memory-card"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.2) }}
    >
      <div className="memory-photo-wrap">
        <button
          className="memory-image-button"
          onClick={open}
          aria-label={`Open ${memory.source} memory: ${memory.title}`}
        >
          <LocalMediaImage
            source={memory.image}
            alt={
              memory.source === "sample"
                ? memory.alt
                : `Photo for ${memory.title}`
            }
          />
          {memory.source === "sample" && (
            <span className="photo-sample-label">SAMPLE</span>
          )}
        </button>
        {memory.source === "personal" && memory.photos.length > 1 && <span className="memory-photo-count" aria-label={`${memory.photos.length} photos`}><Images size={12} />{memory.photos.length}</span>}
        <button
          className={`favorite-button ${favorite ? "is-favorite" : ""}`}
          onClick={onToggleFavorite}
          aria-label={`${favorite ? "Unfavorite" : "Favorite"} memory: ${memory.title}`}
          aria-pressed={favorite}
        >
          <Heart size={16} fill={favorite ? "currentColor" : "none"} />
        </button>
      </div>
      {favoriteError && (
        <span className="form-error" role="alert">
          {favoriteError}
        </span>
      )}
      <div className="memory-card-body">
        <span className="memory-date">{formatDate(memory.date, true)}</span>
        <h3>
          <button onClick={open}>{memory.title}</button>
        </h3>
        <div className="memory-meta">
          {memory.location && (
            <span>
              <MapPin size={12} />
              {memory.location}
            </span>
          )}
          {memory.source === "sample" ? (
            <span className={`category-tag ${memory.category}`}>
              {memory.category}
            </span>
          ) : (
            <span className={`category-tag ${memory.mood}`}>
              {memory.mood}
            </span>
          )}
        </div>
      </div>
    </motion.article>
  );
}
