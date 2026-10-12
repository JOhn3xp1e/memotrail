import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Camera,
  Check,
  Eye,
  Feather,
  ImagePlus,
  LockKeyhole,
  MapPin,
  Plus,
  RotateCcw,
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

const moods: { value: Mood; label: string; symbol: string }[] = [
  { value: "grateful", label: "Grateful", symbol: "♡" },
  { value: "happy", label: "Happy", symbol: "☀" },
  { value: "peaceful", label: "Peaceful", symbol: "❀" },
  { value: "nostalgic", label: "Nostalgic", symbol: "☾" },
  { value: "adventurous", label: "Adventurous", symbol: "✧" },
];
const MAX_PHOTOS = 8;
const MAX_PHOTO_BYTES = 12 * 1024 * 1024;

export function AddMemoryPage() {
  const { draft, update, reset } = useDraft();
  const urls = useObjectUrls(draft.photos);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const incoming = Array.from(files);
    const supported = incoming.filter(
      (file) =>
        [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/avif",
          "image/gif",
        ].includes(file.type) && file.size <= MAX_PHOTO_BYTES,
    );
    const room = MAX_PHOTOS - draft.photos.length;
    if (supported.length !== incoming.length)
      setError(
        "Please choose JPG, PNG, WebP, AVIF, or GIF photos under 12 MB each.",
      );
    else if (supported.length > room)
      setError("There’s room for up to 8 photos in this preview.");
    else setError("");
    update({
      photos: [...draft.photos, ...supported.slice(0, Math.max(room, 0))],
    });
  }
  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    addFiles(event.target.files);
    event.target.value = "";
  }
  function onPreview(event: FormEvent) {
    event.preventDefault();
    if (!draft.title.trim()) {
      setError("Give this moment a little title before previewing it.");
      return;
    }
    setError("");
    setPreview(true);
  }

  return (
    <>
      <PageHeading
        eyebrow="THE LITTLE THINGS ARE THE BIG THINGS"
        title="What would you like to remember?"
        description="A photo, a feeling, a few words. It doesn’t have to be perfect."
      />
      <div className="composer-notice">
        <Feather size={17} />
        <p>
          <strong>A little room to try things out.</strong> This draft is a
          preview. It stays in this session and isn’t saved.
        </p>
      </div>
      <form onSubmit={onPreview} className="composer-grid">
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
              onChange={onFileChange}
              className="sr-only"
              aria-label="Choose photos for your memory preview"
              tabIndex={-1}
            />
            <button
              type="button"
              className={`photo-dropzone ${dragging ? "dragging" : ""}`}
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
                {draft.photos.length
                  ? "Make room for one more"
                  : "Drop a little moment here"}
              </strong>
              <span>
                Drag your photos here, or <u>browse your device</u>
              </span>
              <small>
                Up to 8 photos · JPG, PNG, WebP, AVIF, GIF · 12 MB each
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
                <input
                  id="memory-date"
                  type="date"
                  required
                  value={draft.date}
                  max={localDate()}
                  onChange={(event) => update({ date: event.target.value })}
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
            <Button variant="ghost" onClick={() => setConfirmReset(true)}>
              <RotateCcw size={15} />
              Start over
            </Button>
            <Button type="submit">
              <Eye size={17} />
              Preview memory
            </Button>
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
              Unsaved preview
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
      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="draft-dialog">
          <span className="eyebrow">YOUR UNSAVED PREVIEW</span>
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
            This is a preview, not a saved memory. Your photos and words remain
            in this session until you reload or close the app.
          </p>
          <Button
            className="w-full"
            variant="secondary"
            onClick={() => setPreview(false)}
          >
            <Plus size={16} />
            Keep making it yours
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
