import type { MemoryView } from "@/types/memory";
import { useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
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
import { useMemoryData } from "@/hooks/use-memory-data";
import { useSamples } from "@/stores/samples";

export function TimelinePage() {
  const { memories, collections, isSample, isLoading } = useMemoryData();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const [view, setView] = useState<"grid" | "list">("grid");
  const sampleFavorites = useSamples((state) => state.favorites);
  const category = params.get("category") ?? "all";
  const query = params.get("q") ?? "";
  const mood = params.get("mood") ?? "";
  const collectionId = params.get("collection") ?? "";
  const fromDate = params.get("from") ?? "";
  const toDate = params.get("to") ?? "";
  const notice =
    typeof location.state === "object" &&
    location.state !== null &&
    "notice" in location.state &&
    typeof location.state.notice === "string"
      ? location.state.notice
      : "";

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

  const filtered = memories.filter((memory) => {
    const categoryMatches =
      category === "all" ||
      (category === "favorites"
        ? memory.source === "sample"
          ? sampleFavorites.includes(memory.id)
          : memory.favorite
        : memory.source === "personal" || memory.category === category);
    const collectionMatches = !collectionId
      ? true
      : memory.source === "personal"
        ? memory.collectionId === collectionId
        : collections.some(
            (collection) =>
              collection.id === collectionId &&
              collection.source === "sample" &&
              collection.category === memory.category,
          );
    return (
      categoryMatches &&
      collectionMatches &&
      (!mood || memory.mood === mood) &&
      (!fromDate || memory.date >= fromDate) &&
      (!toDate || memory.date <= toDate) &&
      `${memory.title} ${memory.story} ${memory.location}`
        .toLowerCase()
        .includes(query.toLowerCase().trim())
    );
  });
  const groups = filtered.reduce<Record<string, MemoryView[]>>(
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
      {notice && (
        <p className="save-success" role="status">
          {notice}
        </p>
      )}
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
          {[
            { id: "all", label: "All moments" },
            ...(isSample
              ? [
                  { id: "travel", label: "Little adventures" },
                  { id: "everyday", label: "Everyday magic" },
                  { id: "together", label: "Together" },
                ]
              : []),
            { id: "favorites", label: "Favorites" },
          ].map((item) => (
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
            placeholder="Search titles, stories, and places…"
            aria-label="Search memories by title or description"
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
      {!isSample && (
        <div className="timeline-filters" aria-label="Filter memories">
          <label>
            Mood
            <select
              aria-label="Filter by mood"
              value={mood}
              onChange={(event) => updateParam("mood", event.target.value)}
            >
              <option value="">Any mood</option>
              {["grateful", "happy", "peaceful", "nostalgic", "adventurous"].map(
                (value) => (
                  <option key={value} value={value}>
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </option>
                ),
              )}
            </select>
          </label>
          <label>
            Collection
            <select
              aria-label="Filter by collection"
              value={collectionId}
              onChange={(event) =>
                updateParam("collection", event.target.value)
              }
            >
              <option value="">Every collection</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            From
            <input
              aria-label="Filter from date"
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(event) => updateParam("from", event.target.value)}
            />
          </label>
          <label>
            To
            <input
              aria-label="Filter to date"
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(event) => updateParam("to", event.target.value)}
            />
          </label>
          {(mood || collectionId || fromDate || toDate) && (
            <Button variant="ghost" size="sm" onClick={() => setParams({})}>
              Clear filters
            </Button>
          )}
        </div>
      )}
      {isLoading ? (
        <p className="memory-loading" role="status">
          Opening your private journal…
        </p>
      ) : !memories.length ? (
        <EmptyState
          title="Your story is just beginning"
          description="Save your first memory and it will find a home in this timeline."
        />
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
                  <span>{items.length} moments</span>
                  <span className="month-line" />
                </div>
                <div className="masonry-grid">
                  {items.map((memory, index) => (
                    <MemoryCard
                      memory={memory}
                      key={memory.id}
                      index={index}
                    />
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}
    </>
  );
}
