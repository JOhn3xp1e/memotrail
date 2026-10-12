import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, FolderHeart, Plus } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { CollectionCard } from "@/components/collection-card";
import { EmptyState } from "@/components/empty-state";
import { MemoryCard } from "@/components/memory-card";
import { MemoryDialog } from "@/components/memory-dialog";
import { useMemoryData } from "@/hooks/use-memory-data";
import type { SampleMemory } from "@/types/memory";

export function CollectionsPage() {
  const { collections, memories, isSample } = useMemoryData();
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<SampleMemory | null>(null);
  const album = collections.find((item) => item.id === params.get("album"));
  return (
    <>
      {album ? (
        <>
          <button className="text-link back-link" onClick={() => setParams({})}>
            <ArrowLeft size={16} />
            All collections
          </button>
          <div className={`album-banner collection-${album.color}`}>
            <div>
              <span className="eyebrow">A SAMPLE COLLECTION</span>
              <h1>{album.title}</h1>
              <p>{album.subtitle}. A few moments that belong together.</p>
            </div>
            <FolderHeart size={48} strokeWidth={1} />
          </div>
          <div className="album-memory-grid">
            {memories
              .filter((memory) => memory.category === album.category)
              .map((memory, index) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  onOpen={setSelected}
                  index={index}
                />
              ))}
          </div>
        </>
      ) : (
        <>
          <PageHeading
            eyebrow="THE CHAPTERS YOU CHERISH"
            title="Some things belong together."
            description="Little albums for your big adventures and everyday magic."
          >
            <Button asChild>
              <Link to="/add">
                <Plus size={17} />
                Capture a moment
              </Link>
            </Button>
          </PageHeading>
          {isSample && (
            <div className="sample-notice">
              <span className="sample-dot" />
              Sample albums, a little inspiration for your own.
              <Link to="/settings">
                About this preview
                <ArrowUpRight size={14} />
              </Link>
            </div>
          )}
          {collections.length ? (
            <>
              <div className="collection-grid collections-page-grid">
                {collections.map((collection) => (
                  <CollectionCard key={collection.id} collection={collection} />
                ))}
              </div>
              <div className="collections-note">
                <span className="handwritten">
                  Not just photos. Little worlds of their own.
                </span>
                <FolderHeart size={27} strokeWidth={1.2} />
                <p>
                  A weekend away. A year of growing. The people who feel like
                  home.
                  <br />
                  There’s a collection waiting in every chapter.
                </p>
              </div>
            </>
          ) : (
            <EmptyState
              title="A little home for every chapter"
              description="One day, a collection of memories will tell the story of your favorite adventures. Let’s begin with a moment."
            />
          )}
        </>
      )}
      <MemoryDialog memory={selected} onClose={() => setSelected(null)} />
    </>
  );
}
