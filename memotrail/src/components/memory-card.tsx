import { Heart, MapPin } from "lucide-react";
import { motion } from "motion/react";
import { formatDate } from "@/lib/utils";
import type { SampleMemory } from "@/types/memory";
import { useSamples } from "@/stores/samples";

export function MemoryCard({
  memory,
  onOpen,
  index = 0,
}: {
  memory: SampleMemory;
  onOpen: (memory: SampleMemory) => void;
  index?: number;
}) {
  const favorite = useSamples((state) => state.favorites.includes(memory.id));
  const toggleFavorite = useSamples((state) => state.toggleFavorite);
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
          onClick={() => onOpen(memory)}
          aria-label={`Open sample memory: ${memory.title}`}
        >
          <img
            src={memory.image}
            alt={memory.alt}
            loading="lazy"
            width="600"
            height="600"
          />
          <span className="photo-sample-label">SAMPLE</span>
        </button>
        <button
          className={`favorite-button ${favorite ? "is-favorite" : ""}`}
          onClick={() => toggleFavorite(memory.id)}
          aria-label={`${favorite ? "Unfavorite" : "Favorite"} sample memory: ${memory.title}`}
          aria-pressed={favorite}
        >
          <Heart size={16} fill={favorite ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="memory-card-body">
        <span className="memory-date">{formatDate(memory.date, true)}</span>
        <h3>
          <button onClick={() => onOpen(memory)}>{memory.title}</button>
        </h3>
        <div className="memory-meta">
          <span>
            <MapPin size={12} />
            {memory.location}
          </span>
          <span className={`category-tag ${memory.category}`}>
            {memory.category}
          </span>
        </div>
      </div>
    </motion.article>
  );
}
