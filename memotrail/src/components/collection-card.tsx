import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { SampleCollection } from "@/types/memory";
import { sampleMemories } from "@/lib/sample-data";

export function CollectionCard({
  collection,
}: {
  collection: SampleCollection;
}) {
  const count = sampleMemories.filter(
    (memory) => memory.category === collection.category,
  ).length;
  return (
    <Link
      to={`/collections?album=${collection.id}`}
      className={`collection-card collection-${collection.color}`}
    >
      <div className="album-cover">
        <span className="album-spine" />
        <img
          src={collection.cover}
          alt={`Sample ${collection.title.toLowerCase()} album cover`}
          loading="lazy"
        />
        <span className="album-label">A LITTLE COLLECTION OF</span>
        <span className="album-title">{collection.title}</span>
        <span className="album-sample">SAMPLE ALBUM</span>
      </div>
      <div className="collection-card-footer">
        <div>
          <h3>{collection.title}</h3>
          <span>{count} sample memories</span>
        </div>
        <ArrowUpRight size={17} />
      </div>
    </Link>
  );
}
