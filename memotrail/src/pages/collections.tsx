import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, FolderHeart, Pencil, Plus } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { CollectionCard } from "@/components/collection-card";
import { CollectionCoverPicker } from "@/components/collection-cover-picker";
import { EmptyState } from "@/components/empty-state";
import { MemoryCard } from "@/components/memory-card";
import { MemoryDialog } from "@/components/memory-dialog";
import { useMemoryData } from "@/hooks/use-memory-data";
import { usePreferences } from "@/stores/preferences";
import { createId, memoryRepository } from "@/services/memory-repository";
import type { MemoryView, PersonalCollectionView } from "@/types/memory";

export function CollectionsPage() {
  const { collections, memories, isSample, isLoading } = useMemoryData();
  const setSampleMode = usePreferences((state) => state.setSampleMode);
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<MemoryView | null>(null);
  const [editing, setEditing] = useState<PersonalCollectionView | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const album = collections.find((item) => item.id === params.get("album"));

  useEffect(() => {
    if (params.get("new") !== "1") return;
    setSampleMode(false);
    setEditing(null);
    setName("");
    setDescription("");
    setDialogOpen(true);
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.delete("new");
        return next;
      },
      { replace: true },
    );
  }, [params, setParams, setSampleMode]);

  function openCreate() {
    setSampleMode(false);
    setEditing(null);
    setName("");
    setDescription("");
    setError("");
    setSaved(false);
    setDialogOpen(true);
  }

  function openEdit(collection: PersonalCollectionView) {
    setEditing(collection);
    setName(collection.title);
    setDescription(collection.description);
    setError("");
    setSaved(false);
    setDialogOpen(true);
  }

  async function saveCollection(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Give your collection a name before saving it.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      await memoryRepository.saveCollection({
        id: editing?.id ?? createId(),
        name: name.trim(),
        description: description.trim(),
        ...(editing?.coverMediaId
          ? { coverMediaId: editing.coverMediaId }
          : {}),
        createdAt: editing?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      });
      setSampleMode(false);
      setSaved(true);
      setDialogOpen(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save this collection.",
      );
    } finally {
      setSaving(false);
    }
  }

  const collectionMemories = album
    ? memories.filter((memory) =>
        memory.source === "sample"
          ? album.source === "sample" &&
            memory.category === album.category
          : memory.collectionId === album.id,
      )
    : [];

  return (
    <>
      {album ? (
        <>
          <button
            className="text-link back-link"
            onClick={() => setParams({})}
          >
            <ArrowLeft size={16} />
            All collections
          </button>
          <div className={`album-banner collection-${album.color}`}>
            <div>
              <span className="eyebrow">
                {album.source === "sample"
                  ? "A SAMPLE COLLECTION"
                  : "YOUR COLLECTION"}
              </span>
              <h1>{album.title}</h1>
              <p>{album.subtitle}</p>
            </div>
            <div className="album-banner-actions">
              {album.source === "personal" && <CollectionCoverPicker key={album.id} collection={album} />}
              {album.source === "personal" && (
                <Button
                  variant="secondary"
                  onClick={() => openEdit(album)}
                >
                  <Pencil size={15} />
                  Edit collection
                </Button>
              )}
              <FolderHeart size={48} strokeWidth={1} />
            </div>
          </div>
          {collectionMemories.length ? (
            <div className="album-memory-grid">
              {collectionMemories.map((memory, index) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  onOpen={setSelected}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="This chapter is waiting to be filled"
              description="Add a memory and choose this collection to bring it here."
            />
          )}
        </>
      ) : (
        <>
          <PageHeading
            eyebrow="THE CHAPTERS YOU CHERISH"
            title="Some things belong together."
            description="Little albums for your big adventures and everyday magic."
          >
            <div className="collection-actions">
              <Button variant="secondary" onClick={openCreate}>
                <Plus size={16} />
                New collection
              </Button>
              <Button asChild>
                <Link to="/add">
                  <Plus size={17} />
                  Capture a moment
                </Link>
              </Button>
            </div>
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
          {saved && (
            <p className="save-success" role="status">
              Collection saved on this device.
            </p>
          )}
          {isLoading ? (
            <p className="memory-loading" role="status">
              Opening your collections…
            </p>
          ) : collections.length ? (
            <>
              <div className="collection-grid collections-page-grid">
                {collections.map((collection) => (
                  <div className="managed-collection" key={collection.id}>
                    <CollectionCard collection={collection} />
                    {collection.source === "personal" && (
                      <Button
                        className="collection-edit-button"
                        size="sm"
                        variant="secondary"
                        onClick={() => openEdit(collection)}
                      >
                        <Pencil size={13} />
                        Edit
                      </Button>
                    )}
                  </div>
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
              description="One day, a collection of memories will tell the story of your favorite adventures. Let’s begin with a collection."
            />
          )}
        </>
      )}
      <MemoryDialog memory={selected} onClose={() => setSelected(null)} />
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setError("");
        }}
      >
        <DialogContent>
          <span className="eyebrow">
            {editing ? "A LITTLE EDIT" : "A NEW CHAPTER"}
          </span>
          <DialogTitle>
            {editing ? "Shape this collection." : "Name your collection."}
          </DialogTitle>
          <DialogDescription>
            Collections are saved privately on this device.
          </DialogDescription>
          <form className="collection-form" onSubmit={saveCollection}>
            <div className="field">
              <label htmlFor="collection-name">Collection name</label>
              <input
                id="collection-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                required
                autoFocus
              />
            </div>
            <div className="field">
              <label htmlFor="collection-description">
                A little description <span className="optional">optional</span>
              </label>
              <textarea
                id="collection-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={500}
                rows={3}
              />
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <Button
                type="button"
                variant="ghost"
                disabled={saving}
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editing ? "Save changes" : "Create collection"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
