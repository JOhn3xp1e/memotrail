import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import type { CollectionView } from "@/types/memory";
import { LocalMediaImage } from "@/components/local-media-image";

const MotionLink = motion.create(Link);

export function CollectionCard({
  collection,
}: {
  collection: CollectionView;
}) {
  const photos = collection.source === "personal"
    ? collection.coverMediaId
      ? collection.photos.filter((photo) => photo.id === collection.coverMediaId)
      : collection.photos.slice(0, 4)
    : [];
  return (
    <MotionLink
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.25 }}
      to={`/collections?album=${collection.id}`}
      className={`collection-card collection-${collection.color}`}
    >
      <div className={`album-cover ${photos.length ? "album-cover-photos" : ""}`}>
        <span className="album-spine" />
        {photos.length > 0 ? (
          <div className={`album-photo-grid album-photo-grid-${photos.length}`}>
            {photos.map((photo, index) => (
              <LocalMediaImage key={photo.id} source={photo.blob}
                alt={`${collection.title} cover photo ${index + 1}`} />
            ))}
          </div>
        ) : collection.source === "sample" && collection.cover && (
          <LocalMediaImage
            source={collection.cover}
            alt={`${collection.source === "sample" ? "Sample " : ""}${collection.title.toLowerCase()} album cover`}
            className="album-cover-media"
          />
        )}
        <span className="album-label">
          {collection.source === "sample"
            ? "A LITTLE COLLECTION OF"
            : "A LITTLE CHAPTER OF"}
        </span>
        <span className="album-title">{collection.title}</span>
        {collection.source === "sample" && (
          <span className="album-sample">SAMPLE ALBUM</span>
        )}
      </div>
      <div className="collection-card-footer">
        <div>
          <h3>{collection.title}</h3>
          <span>
            {collection.memoryCount}{" "}
            {collection.source === "sample" ? "sample " : ""}
            {collection.memoryCount === 1 ? "memory" : "memories"}
          </span>
        </div>
        <ArrowUpRight size={17} />
      </div>
    </MotionLink>
  );
}
