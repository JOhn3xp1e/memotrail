import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { Archive, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { getDatabase } from "@/services/database";
import { backupError, backupStatus, exportBackup, previewMerge, restoreBackup, saveBackupStatus, validateBackup, type ValidatedBackup } from "@/services/backup";
import { useStoragePersistence } from "@/stores/storage-persistence";
import { useBackupOperation } from "@/stores/backup-operation";
import { notify } from "@/stores/toasts";
import { ContextualHelp } from "@/components/contextual-help";

const fortnight = 14 * 24 * 60 * 60 * 1000;
function bytes(value?: number) { return value === undefined ? "Unavailable" : `${(value / 1024 / 1024).toFixed(1)} MiB`; }
export function BackupReminder() {
  const state = useLiveQuery(backupStatus, []);
  const count = useLiveQuery(() => getDatabase().memories.count(), []);
  const capsules = useLiveQuery(() => getDatabase().timeCapsules.count(), []);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState("");
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(timer); }, []);
  if (!state?.reminders || !(count || capsules) || now - (state.lastBackup ?? 0) < fortnight || now - (state.dismissedAt ?? 0) < 7 * 24 * 60 * 60 * 1000) return null;
  return <div className="backup-reminder" role="status"><p>A little care for your memories: {state.lastBackup ? "it has been a while since your last backup." : "save your first backup when you have a moment."} <Link to="/settings">Storage &amp; Backup</Link>{error && <span role="alert">{error}</span>}</p><Button variant="ghost" size="sm" onClick={() => void saveBackupStatus({ dismissedAt: Date.now() }).catch((e) => setError(backupError(e)))}>Remind me next week</Button></div>;
}

export function StorageBackup() {
  const input = useRef<HTMLInputElement>(null);
  const { busy, setBusy } = useBackupOperation();
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [readyToConfirm, setReadyToConfirm] = useState(false);
  const [backup, setBackup] = useState<ValidatedBackup | null>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [confirmed, setConfirmed] = useState(false);
  const [mergeMessage, setMergeMessage] = useState("");
  const [mergeBlocked, setMergeBlocked] = useState(false);
  const [estimate, setEstimate] = useState<StorageEstimate>();
  const persistence = useStoragePersistence();
  const stats = useLiveQuery(async () => {
    const db = getDatabase();
    return { memories: await db.memories.count(), photos: await db.media.filter((m) => m.type === "image").count() + await db.timeCapsuleMedia.count(), capsules: await db.timeCapsules.count(), status: await backupStatus() };
  }, []);
  useEffect(() => {
    void navigator.storage?.estimate?.().then(setEstimate).catch(() => setEstimate(undefined));
  }, [busy]);
  async function run(action: () => Promise<void>) {
    if (useBackupOperation.getState().busy) return;
    setBusy(true); setError("");
    try { await action(); }
    catch (e) { setError(backupError(e)); setProgress(""); notify(backupError(e), "error"); }
    finally { setBusy(false); }
  }
  async function download() {
    setReadyToConfirm(false);
    const blob = await exportBackup(setProgress);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = `MemoTrail-${new Date().toISOString().replace(/[:.]/g, "-")}.zip`;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    setProgress("Your ZIP is ready. Check that it has saved in Downloads, then confirm below."); setReadyToConfirm(true);
  }
  async function select(file: File) {
    setBackup(null); setConfirmed(false); setMode("merge"); setMergeBlocked(false);
    const validated = await validateBackup(file, setProgress);
    try {
      const plan = await previewMerge(validated);
      setMergeMessage(`${plan.duplicates} identical records will be skipped; ${plan.additions} records will be added.`);
    } catch (e) { setMergeMessage(backupError(e)); setMergeBlocked(true); }
    setBackup(validated); setProgress("Backup fully validated. Review the preview before restoring.");
  }
  return <section className="settings-card storage-backup" aria-busy={busy}>
    <div className="settings-section-heading"><span className="settings-icon lavender"><Archive size={19} /></span><div><h2>Storage &amp; Backup</h2><p>Keep a copy of the moments you care about.</p></div></div>
    <ContextualHelp guide="backup">How backups work</ContextualHelp>
    <dl className="backup-stats">
      <div><dt>Memories</dt><dd>{stats?.memories ?? "…"}</dd></div><div><dt>Stored photos</dt><dd>{stats?.photos ?? "…"}</dd></div><div><dt>Time capsules</dt><dd>{stats?.capsules ?? "…"}</dd></div>
      <div><dt>Estimated storage used</dt><dd>{bytes(estimate?.usage)}</dd></div><div><dt>Available browser storage</dt><dd>{bytes(estimate?.quota === undefined || estimate.usage === undefined ? undefined : Math.max(0, estimate.quota - estimate.usage))}</dd></div>
      <div><dt>Last successful backup</dt><dd>{stats?.status.lastBackup ? new Date(stats.status.lastBackup).toLocaleString() : "Not yet confirmed"}</dd></div>
    </dl>
    <p className="fine-print">Browser storage estimates are approximate and may include app caches. Available storage is a browser allowance, not guaranteed free device space.</p>
    <div className="backup-actions"><Button disabled={busy} onClick={() => void run(download)}><Download size={16} />Export All Data</Button><Button variant="outline" disabled={busy} onClick={() => input.current?.click()}><Upload size={16} />Restore Backup</Button></div>
    <input ref={input} type="file" accept=".zip,application/zip" aria-label="Select ZIP backup" className="sr-only" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void run(() => select(file)); }} />
    <p className="fine-print">Backups include original stored attachment bytes and sealed capsule letters. ZIP files are not encrypted; keep them somewhere private. Works offline. Maximum backup size: 512 MiB, with 16 MiB of metadata and fewer than 10,000 files.</p>
    {progress && <div className="backup-progress" role="status" aria-live="polite">{busy && <progress aria-label="Backup progress" />}{progress}</div>}
    {readyToConfirm && <Button variant="secondary" disabled={busy} onClick={() => void run(async () => { await saveBackupStatus({ lastBackup: Date.now(), dismissedAt: undefined }); setReadyToConfirm(false); setProgress("Backup saved. Your next reminder is in two weeks."); })}>I saved this backup</Button>}
    {error && <p role="alert" className="backup-error">{error}</p>}
    <div className="setting-row"><div><label htmlFor="backup-reminders">Gentle backup reminders</label><p>A local reminder every two weeks. No notifications or online service.</p></div><Switch id="backup-reminders" disabled={busy} checked={stats?.status.reminders ?? true} onCheckedChange={(reminders) => void run(() => saveBackupStatus({ reminders }))} /></div>
    <div className="backup-actions"><Button variant="outline" disabled={busy || persistence.status === "granted" || persistence.status === "pending" || persistence.status === "unsupported"} onClick={() => void persistence.request()}>{persistence.status === "granted" ? "Storage protection granted" : "Request persistent storage"}</Button></div>
    <p className="fine-print">Persistent storage can reduce automatic eviction. Clearing browser or site data deletes your journal, photos, capsules, and settings. Uninstalling the PWA may also remove local data, depending on your platform. Keep a ZIP copy outside this browser.</p>
    <Dialog open={!!backup} onOpenChange={(open) => { if (!open && !busy) { setBackup(null); setConfirmed(false); } }}>
      <DialogContent className="backup-dialog" busy={busy}>
        <DialogTitle>A safe homecoming for your memories.</DialogTitle><DialogDescription>Every file and relationship has been checked. Choose how this backup joins your journal.</DialogDescription>
        {backup && <><p className="backup-preview">Exported {new Date(backup.manifest.exportedAt).toLocaleString()}<br />{backup.data.memories.length} memories · {backup.data.collections.length} collections · {backup.data.timeCapsules.length} capsules<br />{backup.data.media.length + backup.data.timeCapsuleMedia.length} attachments · {bytes(backup.mediaBytes)}</p>
          <fieldset disabled={busy} className="backup-modes"><legend>Restore method</legend>
            <label><input type="radio" name="restore-mode" checked={mode === "merge"} onChange={() => { setMode("merge"); setConfirmed(false); }} /><span><strong>Merge</strong>Keep your journal and settings. Add new records, skip identical IDs, and stop if an ID or tag name conflicts. No memories are overwritten.</span></label>
            <label><input type="radio" name="restore-mode" checked={mode === "replace"} onChange={() => setMode("replace")} /><span><strong>Replace Existing Data</strong>Replace all journal records, attachments, and app preferences with this backup. Export your current journal first. The last backup date stays local.</span></label>
          </fieldset>
          {mode === "merge" && <p className={mergeBlocked ? "backup-error" : "fine-print"}>{mergeMessage}</p>}
          {mode === "replace" && <label className="replace-confirm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={(event) => setConfirmed(event.target.checked)} />I understand my current journal will be replaced by this backup.</label>}
          {busy && <p role="status">{progress}</p>}{error && <p role="alert" className="backup-error">{error}</p>}
          <p className="fine-print">Keep MemoTrail open until restore finishes. A failed or interrupted transaction leaves the previous journal intact; reopen the app and retry. Storage failures are never treated as a successful restore.</p>
          <div className="backup-actions"><Button disabled={busy || (mode === "replace" ? !confirmed : mergeBlocked)} onClick={() => void run(async () => { await restoreBackup(backup, mode, confirmed, setProgress); setBackup(null); setProgress("Restore complete. Your records and attachments are saved on this device."); })}>Restore {mode === "merge" ? "with Merge" : "and Replace"}</Button><Button variant="ghost" disabled={busy} onClick={() => setBackup(null)}>Cancel</Button></div>
        </>}
      </DialogContent>
    </Dialog>
  </section>;
}
