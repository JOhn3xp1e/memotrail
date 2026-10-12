import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  Grid2X2,
  Heart,
  List,
  Plus,
  Search,
  X,
} from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { MemoryCard } from "@/components/memory-card";
import { MemoryDialog } from "@/components/memory-dialog";
import { useMemoryData } from "@/hooks/use-memory-data";
import { useSamples } from "@/stores/samples";
import type { SampleMemory } from "@/types/memory";

const categories = [
  { id: "all", label: "All moments" },
  { id: "travel", label: "Little adventures" },
  { id: "everyday", label: "Everyday magic" },
  { id: "together", label: "Together" },
  { id: "favorites", label: "Favorites" },
];

export function TimelinePage() {
  const { memories, isSample } = useMemoryData();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<SampleMemory | null>(null);
  const favorites = useSamples((state) => state.favorites);
  const category = params.get("category") ?? "all";
  const query = params.get("q") ?? "";
  function updateParam(key: string, value: string) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value && value !== "all") next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  }
  const filtered = memories.filter(
    (memory) =>
      (category === "all" ||
        (category === "favorites"
          ? favorites.includes(memory.id)
          : category === memory.category)) &&
      `${memory.title} ${memory.story} ${memory.location}`
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  );
  const groups = filtered.reduce<Record<string, SampleMemory[]>>(
    (months, memory) => {
      const month = memory.date.slice(0, 7);
      (months[month] ??= []).push(memory);
      return months;
    },
    {},
  );

  return (
    <>
      <PageHeading
        eyebrow="EVERY MOMENT, A LITTLE STORY"
        title="The days that made you."
        description="A winding trail of places, people, and things worth keeping."
      >
        <Button asChild>
          <Link to="/add">
            <Plus size={17} />
            Add a memory
          </Link>
        </Button>
      </PageHeading>
      {isSample && (
        <div className="sample-notice">
          <span className="sample-dot" />
          You’re exploring sample memories. Your own story is still unwritten.
          <Link to="/settings">
            Make this space yours
            <ArrowUpRight size={14} />
          </Link>
        </div>
      )}
      <div className="timeline-toolbar">
        <div className="filter-chips" aria-label="Filter memories">
          {categories.map((item) => (
            <button
              key={item.id}
              className={`filter-chip ${category === item.id ? "selected" : ""}`}
              aria-pressed={category === item.id}
              onClick={() => updateParam("category", item.id)}
            >
              {item.id === "favorites" && <Heart size={13} />}
              {item.label}
            </button>
          ))}
        </div>
        <div className="view-toggle" aria-label="Gallery layout">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Photo grid"
            aria-pressed={view === "grid"}
            onClick={() => setView("grid")}
          >
            <Grid2X2 size={17} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Journal list"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            <List size={18} />
          </Button>
        </div>
      </div>
      <div className="timeline-search-row">
        <label className="timeline-search">
          <Search size={17} />
          <input
            placeholder="A place, a person, a little moment…"
            aria-label="Filter the timeline by keyword"
            value={query}
            onChange={(event) => updateParam("q", event.target.value)}
          />
          {query && (
            <button
              onClick={() => updateParam("q", "")}
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </label>
        <span className="result-count" aria-live="polite">
          {filtered.length} {isSample ? "sample " : ""}
          {filtered.length === 1 ? "memory" : "memories"}
        </span>
      </div>
      {!memories.length ? (
        <EmptyState title="Your story is just beginning" />
      ) : !filtered.length ? (
        <div className="no-results">
          <Search size={25} />
          <h2>No moments found, just yet.</h2>
          <p>Try another word or give your filters a fresh start.</p>
          <Button variant="secondary" onClick={() => setParams({})}>
            Show all moments
          </Button>
        </div>
      ) : (
        <div
          className={`timeline-gallery ${view === "list" ? "journal-view" : ""}`}
        >
          {Object.entries(groups)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([month, items]) => (
              <section className="timeline-month" key={month}>
                <div className="month-heading">
                  <span className="month-dot" />
                  <h2>
                    {new Intl.DateTimeFormat("en", {
                      month: "long",
                      year: "numeric",
                    }).format(new Date(`${month}-01T12:00:00`))}
                  </h2>
                  <span>{items?.length} moments</span>
                  <span className="month-line" />
                </div>
                <div className="masonry-grid">
                  {items?.map((memory, index) => (
                    <MemoryCard
                      memory={memory}
                      key={memory.id}
                      onOpen={setSelected}
                      index={index}
                    />
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}
      <MemoryDialog memory={selected} onClose={() => setSelected(null)} />
    </>
  );
}
