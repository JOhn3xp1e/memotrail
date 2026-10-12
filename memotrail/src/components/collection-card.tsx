import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { CollectionView } from "@/types/memory";
import { LocalMediaImage } from "@/components/local-media-image";

export function CollectionCard({
  collection,
}: {
  collection: CollectionView;
}) {
  return (
    <Link
      to={`/collections?album=${collection.id}`}
      className={`collection-card collection-${collection.color}`}
    >
      <div className="album-cover">
        <span className="album-spine" />
        {collection.cover && (
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
    </Link>
  );
}
