import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion, useReducedMotion } from "motion/react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getDatabase } from "@/services/database";
import { capsuleRepository, capsuleError, capsuleMetadata } from "@/services/capsule-repository";
import { useCapsuleClock, capsuleDate, countdown } from "@/hooks/use-capsules";
import { CapsuleEnvelope } from "@/components/capsule-envelope";
import { MemoryPhotoViewer } from "@/components/memory-photo-viewer";
import { Button } from "@/components/ui/button";
import { MemoConfirmDialog } from "@/components/ui/memo-confirm-dialog";
import { usePreferences } from "@/stores/preferences";
import { memoryPath } from "@/lib/memory-path";

export function CapsuleDetailsPage() {
  const { id = "" } = useParams();
  return <CapsuleDetails key={id} id={id} />;
}
function CapsuleDetails({ id }: { id: string }) {
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const navigate = useNavigate();
  const now = useCapsuleClock();
  const systemReduced = useReducedMotion();
  const reduced = usePreferences((state) => state.reduceMotion) || systemReduced;
  const setSampleMode = usePreferences((state) => state.setSampleMode);
  const data = useLiveQuery(async () => {
    try {
      const database = getDatabase();
      const capsule = await database.timeCapsules.get(id);
      if (!capsule) return { missing: true };
      if (capsule.status !== "opened") return { metadata: capsuleMetadata(capsule) };
      const media = await database.timeCapsuleMedia.where("capsuleId").equals(id).sortBy("order");
      return { metadata: capsuleMetadata(capsule), letter: capsule, media: media.filter((photo) => photo.blob instanceof Blob && photo.blob.size > 0) };
    } catch (cause) { return { error: capsuleError(cause) }; }
  }, [id, retry]);
  useEffect(() => {
    if (!opening) return;
    const timer = setTimeout(() => setOpening(false), reduced ? 0 : 800);
    return () => clearTimeout(timer);
  }, [opening, reduced]);
  async function act(action: "open" | "delete" | "convert") {
    if (busy) return;
    setBusy(true); setError("");
    try {
      if (action === "open") { await capsuleRepository.open(id); setOpening(true); }
      if (action === "delete") { await capsuleRepository.remove(id); navigate("/capsules", { replace: true }); }
      if (action === "convert") { const memoryId = await capsuleRepository.saveAsMemory(id); setSampleMode(false); navigate(memoryPath({ id: memoryId })); }
    } catch (cause) { setError(capsuleError(cause)); }
    finally { setBusy(false); }
  }
  const back = <Link className="text-link" to="/capsules">Back to capsules</Link>;
  if (!data) return <>{back}<p role="status">Finding your letter…</p></>;
  if (data.error) return <>{back}<p role="alert">{data.error}</p><Button onClick={() => setRetry((value) => value + 1)}>Try again</Button></>;
  if (!data.metadata) return <>{back}<div className="capsule-empty"><CapsuleEnvelope /><h1>This letter isn’t here.</h1><p>It may have been deleted or saved on another device.</p></div></>;
  const capsule = data.metadata;
  const ready = Date.parse(capsule.unlockAt) <= now;
  return <div className="capsule-detail">{back}
    <header><span className="eyebrow">A LETTER THROUGH TIME</span><h1>{capsule.title}</h1><p>Created {capsuleDate(capsule.createdAt)}</p><p>Unlocks {capsuleDate(capsule.unlockAt)}</p></header>
    {!data.letter || opening ? <div className="capsule-locked"><CapsuleEnvelope open={opening} /><h2>{opening ? "A little piece of yesterday…" : ready ? "Ready to Open" : "Good things are worth waiting for."}</h2>{!opening && <><p className="capsule-countdown" aria-label="Time until unlock">{countdown(capsule.unlockAt, now)}</p><Button disabled={!ready || busy} onClick={() => act("open")}>Open Capsule</Button><p className="fine-print capsule-lock-note">Sealed using this device’s clock. Contents are hidden in the app, not encrypted.</p></>}</div> : <motion.article className="capsule-open-letter" initial={{ opacity: 0, y: reduced ? 0 : 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : 0.45 }}>
      <CapsuleEnvelope open />{data.letter.recipientName && <h2>Dear {data.letter.recipientName},</h2>}<p className="capsule-letter-text">{data.letter.message}</p>{data.letter.mood && <span className="category-tag">{data.letter.mood}</span>}
      {!!data.media?.length && <div className="capsule-open-photos"><MemoryPhotoViewer title={capsule.title} photos={data.media.map((photo) => ({ id: photo.id, source: photo.blob }))} /></div>}
      <p className="fine-print">Opened {capsule.openedAt ? capsuleDate(capsule.openedAt) : "on this device"}</p>
      <Button disabled={busy} onClick={() => act("convert")}>{capsule.memoryId ? "View Saved Memory" : "Save as Memory"}</Button>
    </motion.article>}
    {error && !confirm && <p role="alert" className="form-error">{error}</p>}
    <div className="dialog-actions"><Button variant="ghost" disabled={busy || opening} onClick={() => { setError(""); setConfirm(true); }}>Delete Capsule</Button></div>
    <MemoConfirmDialog open={confirm} onOpenChange={setConfirm} title="Let this letter go?" description="This permanently deletes the capsule and its attachments from this device. Any memory already saved from it will remain." cancelLabel="Keep capsule" confirmLabel="Confirm Delete Capsule" busy={busy} onConfirm={() => void act("delete")}>{error && <p role="alert">{error}</p>}</MemoConfirmDialog>
  </div>;
}
