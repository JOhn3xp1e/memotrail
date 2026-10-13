import {
  ArrowRight,
  ArrowUpRight,
  Heart,
  Plus,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { usePreferences } from "@/stores/preferences";
import { useMemoryData } from "@/hooks/use-memory-data";
import { RewindPreview } from "@/components/rewind-preview";
import { CapsulePreview } from "@/components/capsule-preview";
import { Button } from "@/components/ui/button";
import { MemoryCard } from "@/components/memory-card";
import { CollectionCard } from "@/components/collection-card";
import { EmptyState } from "@/components/empty-state";
import { MemoryJar, ScrapbookCollage } from "@/components/scrapbook";
import { useLocalToday } from "@/hooks/use-local-today";
import { onThisDay } from "@/lib/anniversaries";
import { memoryPath } from "@/lib/memory-path";
import { LocalMediaImage } from "@/components/local-media-image";

export function HomePage() {
  const { name, setSampleMode } = usePreferences();
  const { memories, collections, isSample, isLoading } = useMemoryData();
  const today = useLocalToday();
  const anniversaries = onThisDay(memories, today);


  return (
    <>
      <header className="home-greeting">
        <div>
          <span className="eyebrow">A LITTLE SPACE, JUST FOR YOU</span>
          <h1>
            Hello, {name || "memory keeper"}
            <span className="greeting-dot">.</span>
            <Heart className="greeting-heart" size={24} strokeWidth={1.1} />
          </h1>
          <p>It’s the little things that make a beautiful life.</p>
        </div>
        {isSample && (
          <button
            className="sample-badge"
            onClick={() => setSampleMode(false)}
            title="Turn off sample memories"
          >
            <span className="sample-dot" />
            Sample scrapbook
            <ArrowUpRight size={13} />
          </button>
        )}
      </header>
      <section className="home-hero">
        <div className="hero-copy">
          <span className="hero-kicker">
            <span />A LIFE WORTH REMEMBERING
          </span>
          <h2>
            Your beautiful
            <br />
            <em>moments.</em>
            <svg viewBox="0 0 220 14" fill="none" aria-hidden="true">
              <path
                d="M3 10C60 0 151 1 216 7M25 13c68-6 106-7 168-3"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </h2>
          <p>
            The big adventures. The little things.
            <br />A home for everything you want to remember.
          </p>
          <Button asChild>
            <Link to="/add">
              <Plus size={18} />
              Add a memory
              <ArrowUpRight size={16} />
            </Link>
          </Button>
          <span className="hero-footnote">
            <LockIcon />
            Private by nature. Personal by heart.
          </span>
        </div>
        <ScrapbookCollage sample={isSample} />
      </section>

      <div className="home-middle">
        <section className="recent-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">THE GOOD BITS, LATELY</span>
              <h2>
                Recent memories
                <span className="heading-spark" aria-hidden="true">
                  ✧
                </span>
              </h2>
            </div>
            <Link to="/timeline" className="text-link">
              View all
              <ArrowRight size={15} />
            </Link>
          </div>
          {isLoading ? (
            <p className="memory-loading" role="status">
              Opening your private journal…
            </p>
          ) : memories.length ? (
            <div className="recent-grid">
              {memories.slice(0, 3).map((memory, index) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <EmptyState compact />
          )}
        </section>
        <aside className="memory-aside">
          <section className="on-this-day">
            <div className="aside-heading">
              <span className="small-icon">
                <RotateCcw size={16} />
              </span>
              <h2>On this day</h2>
              <Sparkles size={15} />
            </div>
            {isLoading ? (
              <p className="memory-loading" role="status">
                Opening your memories…
              </p>
            ) : anniversaries.length ? (
              <div className="anniversary-list">{anniversaries.map((nostalgic) => (
              <Link key={nostalgic.id} to={memoryPath(nostalgic)}
                className="nostalgia-content"
              >
                <LocalMediaImage
                  source={nostalgic.image}
                  alt={
                    nostalgic.source === "sample"
                      ? nostalgic.alt
                      : `Photo for ${nostalgic.title}`
                  }
                />
                <span>
                  <span className="nostalgia-date">
                    {nostalgic.date.slice(0, 4)} &middot; {Number(today.slice(0, 4)) - Number(nostalgic.date.slice(0, 4))} {Number(today.slice(0, 4)) - Number(nostalgic.date.slice(0, 4)) === 1 ? "year" : "years"} ago today
                  </span>
                  <strong>{nostalgic.title}</strong>
                  <span className="nostalgia-cta">
                    {nostalgic.source === "sample"
                      ? "Revisit a sample moment"
                      : "Revisit this memory"}
                    <ArrowRight size={12} />
                  </span>
                </span>
              </Link>
              ))}</div>
            ) : (
              <div className="nostalgia-empty">
                <p>
                  Today’s moments.
                  <br />
                  Tomorrow’s lovely surprises.
                </p>
                <span>No memories from this day in past years yet.</span>
              </div>
            )}
          </section>
          <section className="memory-jar-card">
            <div>
              <span className="eyebrow">A LITTLE SERENDIPITY</span>
              <h2>Your memory jar</h2>
              <p>
                A happy little moment,
                <br />
                picked just for you.
              </p>
              <Link className="text-link" to="/jar">Pick a memory<ArrowRight size={14} /></Link>
            </div>
            <Link to="/jar" aria-label="Open your memory jar"><MemoryJar empty={!memories.length} /></Link>
          </section>
        </aside>
      </div>

      <CapsulePreview />
      <RewindPreview />
      <section className="home-collections">
        <div className="section-heading">
          <div>
            <span className="eyebrow">LITTLE CHAPTERS OF YOUR LIFE</span>
            <h2>Made into collections</h2>
          </div>
          <Link to="/collections" className="text-link">
            All collections
            <ArrowRight size={15} />
          </Link>
        </div>
        {collections.length ? (
          <div className="collection-grid">
            {collections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} />
            ))}
          </div>
        ) : (
          <EmptyState
            compact
            title="Every collection is a little love letter"
            description="Your travels, your people, your Sunday mornings. A home for moments that belong together."
          />
        )}
      </section>
      <div className="home-endnote">
        <span className="handwritten">
          Someday, these will be the good old days.
        </span>
        <Heart size={15} />
      </div>
    </>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="12"
      height="12"
      fill="none"
      aria-hidden="true"
    >
      <rect x="3.5" y="7" width="9" height="7" rx="2" stroke="currentColor" />
      <path
        d="M5 7V5a3 3 0 0 1 6 0v2M8 10v1"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  );
}
