import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Camera,
  Check,
  Eye,
  Feather,
  FolderPlus,
  ImagePlus,
  LockKeyhole,
  MapPin,
  Plus,
  RotateCcw,
  Save,
  X,
} from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDraft } from "@/stores/draft";
import { useObjectUrls } from "@/hooks/use-object-urls";
import { formatDate, localDate } from "@/lib/utils";
import type { Mood } from "@/types/memory";
import { useMemoryData } from "@/hooks/use-memory-data";
import { createId, memoryRepository } from "@/services/memory-repository";
import { usePreferences } from "@/stores/preferences";
import { preparePhoto } from "@/lib/photo";
import { MemoSelect } from "@/components/ui/memo-select";
import { MemoDateInput } from "@/components/ui/memo-date-input";
import { validDate } from "@/lib/date-input";

const moods: { value: Mood; label: string; symbol: string }[] = [
  { value: "grateful", label: "Grateful", symbol: "♡" },
  { value: "happy", label: "Happy", symbol: "☀" },
  { value: "peaceful", label: "Peaceful", symbol: "❀" },
  { value: "nostalgic", label: "Nostalgic", symbol: "☾" },
  { value: "adventurous", label: "Adventurous", symbol: "✧" },
];
const MAX_PHOTOS = 8;
const MAX_PHOTO_BYTES = 40 * 1024 * 1024;

export function AddMemoryPage() {
  const { draft, update, reset } = useDraft();
  const urls = useObjectUrls(draft.photos);
  const { personalCollections } = useMemoryData();
  const setSampleMode = usePreferences((state) => state.setSampleMode);
  const inputRef = useRef<HTMLInputElement>(null);
  const idRef = useRef("");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const editId = params.get("id");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [collectionDialog, setCollectionDialog] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [collectionError, setCollectionError] = useState("");
  const [collectionSaved, setCollectionSaved] = useState("");
  const [savingCollection, setSavingCollection] = useState(false);
  const [preparingPhotos, setPreparingPhotos] = useState(false);
  const preparingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(Boolean(editId));

  useEffect(() => {
    let cancelled = false;
    async function loadForEdit() {
      if (!editId) {
        idRef.current = "";
        setLoadingEdit(false);
        return;
      }
      setLoadingEdit(true);
      setError("");
      try {
        const memory = await memoryRepository.getMemory(editId);
        if (!memory) throw new Error("This memory could not be found.");
        const media = await memoryRepository.listMedia(editId);
        if (cancelled) return;
        idRef.current = memory.id;
        update({
          title: memory.title,
          story: memory.description,
          date: memory.memoryDate,
          location: memory.locationName ?? "",
          mood: memory.mood,
          collectionId: memory.collectionId ?? "",
          photos: media
            .filter((item) => item.blob instanceof Blob)
            .map(
              (item, index) =>
                new File([item.blob], `memory-photo-${index + 1}`, {
                  type: item.mimeType || item.blob.type || "image/jpeg",
                }),
            ),
        });
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not open this memory.",
          );
        }
      } finally {
        if (!cancelled) setLoadingEdit(false);
      }
    }
    void loadForEdit();
    return () => {
      cancelled = true;
    };
  }, [editId, update]);

  async function addFiles(files: FileList | null) {
    if (!files || preparingRef.current || saving) return;
    const incoming = Array.from(files);
    const supported = incoming.filter(
      (file) =>
        [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/avif",
          "image/gif",
        ].includes(file.type) &&
        file.size <= MAX_PHOTO_BYTES,
    );
    const room = MAX_PHOTOS - draft.photos.length;
    if (supported.length !== incoming.length) {
      setError(
        "Choose valid JPG, PNG, WebP, AVIF, or GIF photos under 40 MB each.",
      );
      return;
    }
    if (supported.length > room) {
      setError("There’s room for up to 8 photos in this preview.");
      return;
    }
    if (!supported.length) return;
    preparingRef.current = true;
    setPreparingPhotos(true);
    try {
      setError("");
      const prepared = await Promise.all(supported.map(preparePhoto));
      update({ photos: [...useDraft.getState().draft.photos, ...prepared] });
    } catch (photoError) {
      setError(
        photoError instanceof Error
          ? photoError.message
          : "One or more photos could not be opened.",
      );
    } finally { preparingRef.current = false; setPreparingPhotos(false); }
  }
  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    addFiles(event.target.files);
    event.target.value = "";
  }
  function onPreview() {
    if (preparingRef.current) return;
    if (!draft.title.trim()) {
      setError("Give this moment a little title before previewing it.");
      return;
    }
    setError("");
    setPreview(true);
  }
  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (preparingRef.current || saving || loadingEdit) return;
    if (!draft.title.trim()) {
      setError("Give this moment a title before saving it.");
      return;
    }
    if (!validDate(draft.date) || draft.date > localDate()) {
      setError("Choose a valid memory date that is not in the future.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      const existing = editId ? await memoryRepository.getMemory(editId) : undefined;
      const timestamp = Date.now();
      await memoryRepository.saveMemory(
        {
          id: idRef.current || (idRef.current = createId()),
          title: draft.title.trim(),
          description: draft.story.trim(),
          memoryDate: draft.date,
          createdAt: existing?.createdAt ?? timestamp,
          updatedAt: timestamp,
          mood: draft.mood,
          favorite: existing?.favorite ?? false,
          ...(draft.collectionId
            ? { collectionId: draft.collectionId }
            : {}),
          ...(draft.location.trim()
            ? { locationName: draft.location.trim() }
            : {}),
        },
        draft.photos,
      );
      setSampleMode(false);
      reset();
      navigate("/timeline", {
        state: {
          notice: editId
            ? "Memory changes saved privately on this device."
            : "Memory saved privately on this device.",
        },
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save this memory on your device.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onCreateCollection(event: FormEvent) {
    event.preventDefault();
    if (!collectionName.trim()) {
      setCollectionError("Give your collection a name before saving it.");
      return;
    }
    try {
      setSavingCollection(true);
      setCollectionError("");
      const id = createId();
      const now = Date.now();
      await memoryRepository.saveCollection({
        id,
        name: collectionName.trim(),
        description: collectionDescription.trim(),
        createdAt: now,
        updatedAt: now,
      });
      setSampleMode(false);
      update({ collectionId: id });
      setCollectionDialog(false);
      setCollectionSaved(`Added “${collectionName.trim()}” to this memory.`);
    } catch (saveError) {
      setCollectionError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save this collection.",
      );
    } finally {
      setSavingCollection(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="THE LITTLE THINGS ARE THE BIG THINGS"
        title={editId ? "Edit a memory." : "What would you like to remember?"}
        description={
          editId
            ? "Keep the details that matter. Your changes stay on this device."
            : "A photo, a feeling, a few words. It doesn’t have to be perfect."
        }
      />
      <div className="composer-notice">
        <Feather size={17} />
        <p>
          <strong>Private by nature.</strong> Your memory and photos are saved
          only to this device. Nothing is uploaded.
        </p>
      </div>
      <form onSubmit={onSave} className="composer-grid" noValidate>
        <div className="composer-main">
          <section className="form-card">
            <div className="form-section-heading">
              <span className="form-step">01</span>
              <div>
                <h2>Set the scene</h2>
                <p>Sometimes a picture says it best.</p>
              </div>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              multiple
              disabled={preparingPhotos || saving}
              onChange={onFileChange}
              className="sr-only"
              aria-label="Choose photos for your memory preview"
              tabIndex={-1}
            />
            <button
              type="button"
              className={`photo-dropzone ${dragging ? "dragging" : ""}`}
              disabled={preparingPhotos || saving}
              aria-busy={preparingPhotos}
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                addFiles(event.dataTransfer.files);
              }}
            >
              <span className="upload-illustration">
                <ImagePlus size={29} strokeWidth={1.25} />
              </span>
              <strong>
                {preparingPhotos ? "Preparing your photos…" : draft.photos.length
                  ? "Make room for one more"
                  : "Drop a little moment here"}
              </strong>
              <span>
                Drag your photos here, or <u>browse your device</u>
              </span>
              <small>
                Up to 8 photos · JPG, PNG, WebP, AVIF, GIF · 40 MB each
              </small>
            </button>
            {urls.length > 0 && (
              <div className="photo-preview-grid">
                {urls.map((url, index) => (
                  <div key={url} className="uploaded-photo">
                    <img src={url} alt={`Selected photo ${index + 1}`} />
                    <button
                      type="button"
                      aria-label={`Remove photo ${index + 1}`}
                      onClick={() =>
                        update({
                          photos: draft.photos.filter((_, i) => i !== index),
                        })
                      }
                    >
                      <X size={15} />
                    </button>
                    {index === 0 && <span>Cover photo</span>}
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="form-card">
            <div className="form-section-heading">
              <span className="form-step">02</span>
              <div>
                <h2>Tell your little story</h2>
                <p>The details you’ll be glad you kept.</p>
              </div>
            </div>
            <div className="field">
              <label htmlFor="memory-title">
                Give this moment a title <span aria-hidden="true">*</span>
              </label>
              <input
                id="memory-title"
                value={draft.title}
                onChange={(event) => update({ title: event.target.value })}
                placeholder="The kind of day I want to keep…"
                required
                maxLength={100}
              />
            </div>
            <div className="field">
              <label htmlFor="memory-story">
                What made it special? <span className="optional">optional</span>
              </label>
              <textarea
                id="memory-story"
                value={draft.story}
                onChange={(event) => update({ story: event.target.value })}
                placeholder="Where were you? How did it feel? What’s the tiny detail you never want to forget?"
                rows={6}
                maxLength={5000}
              />
              <span className="character-count">
                {draft.story.length.toLocaleString()} / 5,000
              </span>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="memory-date">When was it?</label>
                <MemoDateInput
                  id="memory-date"
                  label="When was it?"
                  required
                  value={draft.date}
                  max={localDate()}
                  onValueChange={(date) => update({ date })}
                />
              </div>
              <div className="field">
                <label htmlFor="memory-location">
                  Where were you? <span className="optional">optional</span>
                </label>
                <div className="input-with-icon">
                  <MapPin size={16} />
                  <input
                    id="memory-location"
                    value={draft.location}
                    onChange={(event) =>
                      update({ location: event.target.value })
                    }
                    placeholder="Somewhere lovely"
                    maxLength={100}
                  />
                </div>
              </div>
            </div>
            <div className="field">
              <label htmlFor="memory-collection">
                Add to a collection{" "}
                <span className="optional">optional</span>
              </label>
              <MemoSelect
                id="memory-collection"
                label="Add to a collection"
                value={draft.collectionId}
                onValueChange={(collectionId) => update({ collectionId })}
                options={[{ value: "", label: "No collection" }, ...personalCollections.map((collection) => ({ value: collection.id, label: collection.title }))]}
                onCreate={() => { setCollectionName(""); setCollectionDescription(""); setCollectionError(""); setCollectionDialog(true); }}
              />
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setCollectionName("");
                  setCollectionDescription("");
                  setCollectionError("");
                  setCollectionDialog(true);
                }}
              >
                <FolderPlus size={14} />
                Create a collection
              </button>
              {collectionSaved && (
                <span className="save-success" role="status">
                  {collectionSaved}
                </span>
              )}
            </div>
          </section>
          <section className="form-card">
            <div className="form-section-heading">
              <span className="form-step">03</span>
              <div>
                <h2>A feeling to remember</h2>
                <p>If this moment had a mood…</p>
              </div>
            </div>
            <div className="mood-picker" role="group" aria-label="Memory mood">
              {moods.map((mood) => (
                <button
                  type="button"
                  key={mood.value}
                  className={`mood-option ${draft.mood === mood.value ? "selected" : ""}`}
                  aria-pressed={draft.mood === mood.value}
                  onClick={() => update({ mood: mood.value })}
                >
                  <span aria-hidden="true">{mood.symbol}</span>
                  {mood.label}
                  {draft.mood === mood.value && <Check size={12} />}
                </button>
              ))}
            </div>
          </section>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="composer-actions">
            <Button
              type="button"
              variant="ghost"
              disabled={preparingPhotos || saving}
              onClick={() => setConfirmReset(true)}
            >
              <RotateCcw size={15} />
              Start over
            </Button>
            <div className="composer-submit-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={onPreview}
                disabled={loadingEdit || saving || preparingPhotos}
              >
                <Eye size={17} />
                Preview
              </Button>
              <Button type="submit" disabled={loadingEdit || saving || preparingPhotos}>
                <Save size={17} />
                {preparingPhotos ? "Preparing photos…" : saving
                  ? "Saving…"
                  : editId
                    ? "Save changes"
                    : "Save memory"}
              </Button>
            </div>
          </div>
        </div>
        <aside className="composer-sidebar">
          <div className="preview-paper">
            <span className="washi-tape" aria-hidden="true" />
            <span className="eyebrow">YOUR LITTLE KEEPSAKE</span>
            <div className="live-polaroid">
              {urls[0] ? (
                <img src={urls[0]} alt="Live preview of your cover photo" />
              ) : (
                <div className="live-photo-empty">
                  <Camera size={31} strokeWidth={1} />
                  <span>A moment, waiting to happen</span>
                </div>
              )}
              <span className="handwritten">
                {draft.title || "a little memory in the making"}
              </span>
            </div>
            <p className="preview-date">
              {draft.date ? formatDate(draft.date) : "A day to remember"}
            </p>
            <span className="preview-state">
              <span />
              Local preview
            </span>
          </div>
          <div className="writing-prompt">
            <span className="handwritten">A little inspiration</span>
            <p>“What would you tell your future self about this moment?”</p>
            <span>There’s a story in the ordinary, too.</span>
          </div>
          <div className="composer-privacy">
            <LockKeyhole size={14} />
            Your photos stay on your device.
          </div>
        </aside>
      </form>
      <Dialog open={collectionDialog} onOpenChange={setCollectionDialog}>
        <DialogContent busy={savingCollection}>
          <span className="eyebrow">A NEW CHAPTER</span>
          <DialogTitle>Name your collection.</DialogTitle>
          <DialogDescription>
            It will be created on this device and selected for this memory.
          </DialogDescription>
          <form className="collection-form" onSubmit={onCreateCollection} noValidate>
            <div className="field">
              <label htmlFor="composer-collection-name">Collection name</label>
              <input
                id="composer-collection-name"
                value={collectionName}
                onChange={(event) => setCollectionName(event.target.value)}
                maxLength={80}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="composer-collection-description">
                A little description{" "}
                <span className="optional">optional</span>
              </label>
              <textarea
                id="composer-collection-description"
                value={collectionDescription}
                onChange={(event) =>
                  setCollectionDescription(event.target.value)
                }
                maxLength={500}
                rows={3}
              />
            </div>
            {collectionError && (
              <p className="form-error" role="alert">
                {collectionError}
              </p>
            )}
            <div className="dialog-actions">
              <Button
                type="button"
                variant="ghost"
                disabled={savingCollection}
                onClick={() => setCollectionDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingCollection}>
                {savingCollection ? "Saving…" : "Create collection"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="draft-dialog">
          <span className="eyebrow">
            YOUR MEMORY PREVIEW
          </span>
          {urls[0] && (
            <img
              className="draft-cover"
              src={urls[0]}
              alt="Your memory cover preview"
            />
          )}
          <DialogTitle>{draft.title}</DialogTitle>
          <DialogDescription>
            {draft.date && formatDate(draft.date)}
            {draft.location && ` · ${draft.location}`}
          </DialogDescription>
          <p className="memory-story">
            {draft.story || "Sometimes the photo says it all."}
          </p>
          <span className="category-tag everyday">{draft.mood}</span>
          {urls.length > 1 && (
            <div className="draft-photo-strip">
              {urls.slice(1).map((url, index) => (
                <img
                  key={url}
                  src={url}
                  alt={`Additional memory photo ${index + 2}`}
                />
              ))}
            </div>
          )}
          <p className="preview-disclaimer">
            Your changes are not saved until you choose Save memory. Photos
            stay on this device.
          </p>
          <Button
            className="w-full"
            variant="secondary"
            onClick={() => setPreview(false)}
          >
            <Plus size={16} />
            Keep editing
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent>
          <DialogTitle>A fresh page?</DialogTitle>
          <DialogDescription>
            This clears the words and photos in your current preview. It can’t
            be undone.
          </DialogDescription>
          <div className="dialog-actions">
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Keep my draft
            </Button>
            <Button
              onClick={() => {
                reset();
                setError("");
                setConfirmReset(false);
              }}
            >
              Start fresh
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
