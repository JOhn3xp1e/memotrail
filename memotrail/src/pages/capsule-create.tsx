import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useReducedMotion } from "motion/react";
import { usePreferences } from "@/stores/preferences";
import { capsuleRepository, capsuleError } from "@/services/capsule-repository";
import { useCapsuleClock, capsuleDate, countdown } from "@/hooks/use-capsules";
import { preparePhoto } from "@/lib/photo";
import { localDate } from "@/lib/utils";
import { LocalMediaImage } from "@/components/local-media-image";
import { CapsuleEnvelope } from "@/components/capsule-envelope";
import { Button } from "@/components/ui/button";
import { MemoSelect } from "@/components/ui/memo-select";
import { MemoDateInput } from "@/components/ui/memo-date-input";
import { MemoTimeInput } from "@/components/ui/memo-time-input";
import { MemoConfirmDialog } from "@/components/ui/memo-confirm-dialog";
import type { Mood } from "@/types/memory";

export function CapsuleCreatePage() {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [recipientName, setRecipient] = useState("");
  const [mood, setMood] = useState<Mood | "">("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [savedId, setSavedId] = useState("");
  const navigate = useNavigate();
  const systemReduced = useReducedMotion();
  const reduced = usePreferences((state) => state.reduceMotion) || systemReduced;
  const now = useCapsuleClock();
  const unlock = new Date(`${date}T${time || "00:00"}`);
  const valid = Number.isFinite(unlock.getTime()) && localDate(unlock) === date && `${String(unlock.getHours()).padStart(2, "0")}:${String(unlock.getMinutes()).padStart(2, "0")}` === (time || "00:00");
  const unlockAt = valid ? unlock.toISOString() : "";
  const future = valid && unlock.getTime() > now;
  useEffect(() => {
    if (!savedId) return;
    const timer = setTimeout(() => navigate(`/capsules/${savedId}`, { replace: true }), reduced ? 0 : 1100);
    return () => clearTimeout(timer);
  }, [savedId, reduced, navigate]);
  function next() {
    setError("");
    if (!title.trim() || !message.trim()) { setError("Give your capsule a title and a letter."); return; }
    if (step === 2 && !future) { setError("Choose an unlock date and time in the future."); return; }
    setStep((value) => value + 1);
  }
  async function attach(files: File[]) {
    setBusy(true); setError("");
    try {
      if (files.length + photos.length > 12 || files.some((file) => !/^image\/(jpeg|png|webp|gif)$/.test(file.type) || file.size > 20 * 1024 * 1024)) throw new Error("Choose up to 12 JPG, PNG, WebP or GIF photos, each under 20 MB.");
      const prepared = await Promise.all(files.map(preparePhoto));
      setPhotos((previous) => [...previous, ...prepared]);
    } catch (cause) { setError(capsuleError(cause)); }
    finally { setBusy(false); }
  }
  async function seal() {
    if (busy || savedId) return;
    setBusy(true); setError("");
    try {
      const id = await capsuleRepository.seal({ title, message, recipientName: recipientName.trim() || undefined, mood: mood || undefined, unlockAt }, photos);
      setConfirm(false); setSavedId(id);
    } catch (cause) { setError(capsuleError(cause)); }
    finally { setBusy(false); }
  }
  if (savedId) return <div className="capsule-empty"><CapsuleEnvelope sealing /><h1 role="status">Sealed with a little love.</h1><p>Your letter is saved on this device.</p></div>;
  return <div className="capsule-compose"><Link className="text-link" to="/capsules">Back to capsules</Link><h1>A letter for later.</h1>
    <ol className="capsule-steps">{["Write", "Photos", "Unlock date", "Preview"].map((label, index) => <li key={label} aria-current={step === index ? "step" : undefined}>{index + 1}. {label}</li>)}</ol>
    <section className="capsule-compose-paper">
      {step === 0 && <><h2>What would you like to remember?</h2><div className="field"><label htmlFor="capsule-title">Capsule title</label><input id="capsule-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required /></div><div className="field"><label htmlFor="capsule-message">Your letter</label><textarea id="capsule-message" rows={8} value={message} onChange={(event) => setMessage(event.target.value)} maxLength={20000} required placeholder="Dear future me…" /></div><div className="field-row"><div className="field"><label htmlFor="capsule-recipient">Recipient name (optional)</label><input id="capsule-recipient" value={recipientName} maxLength={100} onChange={(event) => setRecipient(event.target.value)} /></div><div className="field"><label htmlFor="capsule-mood">Mood (optional)</label><MemoSelect id="capsule-mood" label="Mood (optional)" value={mood} onValueChange={(value) => setMood(value as Mood | "")} options={[{ value: "", label: "Choose a feeling" }, ...["grateful", "happy", "peaceful", "nostalgic", "adventurous"].map((value) => ({ value, label: value }))]} /></div></div></>}
      {step === 1 && <><h2>A few little keepsakes.</h2><p>Up to 12 photos · JPG, PNG, WebP or GIF · 20 MB each.</p><div className="field"><label htmlFor="capsule-photos">Attach photos</label><input id="capsule-photos" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={(event) => { void attach(Array.from(event.target.files ?? [])); event.target.value = ""; }} /></div><div className="capsule-photo-previews">{photos.map((photo, index) => <div key={index}><LocalMediaImage source={photo} alt={`Attachment ${index + 1}`} /><Button variant="ghost" disabled={busy} onClick={() => setPhotos((previous) => previous.filter((_, position) => position !== index))}>Remove photo {index + 1}</Button></div>)}</div></>}
      {step === 2 && <><h2>Choose its day.</h2><p>Dates and times use your device’s local time zone. With no time selected, the letter unlocks at midnight.</p><div className="field-row"><div className="field"><label htmlFor="capsule-date">Unlock date</label><MemoDateInput id="capsule-date" label="Unlock date" value={date} onValueChange={setDate} /></div><div className="field"><label htmlFor="capsule-time">Unlock time (optional)</label><MemoTimeInput id="capsule-time" label="Unlock time (optional)" value={time} onValueChange={setTime} /></div></div>{future && <p className="capsule-countdown">{countdown(unlockAt, now)}</p>}</>}
      {step === 3 && <><CapsuleEnvelope /><h2>{title}</h2>{recipientName && <p>To {recipientName}</p>}<p className="capsule-letter-text">{message}</p>{mood && <span className="category-tag">{mood}</span>}<div className="capsule-photo-previews">{photos.map((photo, index) => <LocalMediaImage key={index} source={photo} alt={`Attachment ${index + 1}`} />)}</div><p>Unlocks {valid ? capsuleDate(unlockAt) : "—"}</p><p className="fine-print">Once sealed, the letter cannot be edited. This device-time lock hides contents in the app; it does not encrypt them.</p></>}
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="dialog-actions">{step > 0 && <Button variant="ghost" disabled={busy} onClick={() => { setError(""); setStep((value) => value - 1); }}>Previous step</Button>}{step < 3 ? <Button disabled={busy} onClick={next}>{busy ? "Preparing photos…" : "Continue"}</Button> : <Button disabled={busy} onClick={() => setConfirm(true)}>Seal Capsule</Button>}</div>
    </section>
    <MemoConfirmDialog open={confirm} onOpenChange={setConfirm} title="Seal this letter?" description={`It will stay closed until ${valid ? capsuleDate(unlockAt) : "a valid future date"}. Check the date before sealing.`} cancelLabel="Keep writing" confirmLabel={busy ? "Sealing…" : "Confirm and Seal"} busy={busy} onConfirm={() => void seal()}>{error && <p role="alert" className="form-error">{error}</p>}</MemoConfirmDialog>
  </div>;
}
