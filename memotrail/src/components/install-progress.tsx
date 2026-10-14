import { Check, Circle, Download, Smartphone } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePreferences } from "@/stores/preferences";

export type InstallStage = "idle" | "prompting" | "requested" | "accepted" | "dismissed" | "stalled" | "failed";

const copy: Record<InstallStage, { title: string; description: string }> = {
  idle: { title: "A home for your stories", description: "Install MemoTrail from your browser’s menu." },
  prompting: { title: "A little home on your device", description: "Confirm Install in the browser prompt to continue." },
  requested: { title: "Your request is with the browser", description: "Your browser is handling installation. You can keep using MemoTrail while you wait." },
  accepted: { title: "Your browser accepted MemoTrail", description: "Look for MemoTrail on your home screen or in your apps. On Android, the system may still be finishing installation." },
  dismissed: { title: "Whenever you’re ready", description: "Installation was cancelled. Your journal stays here, ready for you." },
  stalled: { title: "Taking a little longer", description: "The browser hasn’t reported completion. Check your home screen or apps, then use your browser’s install menu if MemoTrail is missing." },
  failed: { title: "Let’s try another way", description: "The install prompt couldn’t finish. Use Install app or Add to Home Screen in your browser’s menu." },
};

export function InstallProgress({ open, onOpenChange, stage, offlineReady }: {
  open: boolean; onOpenChange: (open: boolean) => void; stage: InstallStage; offlineReady: boolean;
}) {
  const reduceMotion = usePreferences((state) => state.reduceMotion);
  const waiting = stage === "prompting" || stage === "requested";
  const accepted = stage === "accepted";
  const confirmed = stage === "requested" || accepted;
  const { title, description } = copy[stage];
  const steps = [
    { label: "Offline journal", detail: offlineReady ? "Ready on this device" : "App files are still preparing", done: offlineReady },
    { label: "Your confirmation", detail: confirmed ? "Install request accepted" : stage === "dismissed" ? "Cancelled for now" : "Confirm in your browser", done: confirmed },
    { label: "Browser installation", detail: accepted ? "Reported by your browser" : "Waiting for the browser", done: accepted },
  ];
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className={`install-progress-dialog${reduceMotion ? " install-progress-still" : ""}`}>
      <div className="install-progress-emblem" aria-hidden="true"><img src="/icons/icon-192.png" alt="" /><span>{accepted ? <Check size={16} /> : <Download size={16} />}</span></div>
      <span className="eyebrow">MEMOTRAIL · ON YOUR DEVICE</span>
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription aria-live="polite" aria-atomic="true">{description}</DialogDescription>
      <div className={`install-progress-track${waiting ? " is-waiting" : ""}${accepted ? " is-accepted" : ""}`}
        role="progressbar" aria-label="MemoTrail installation" aria-valuetext={description}>
        <span />
      </div>
      <ol className="install-progress-steps" aria-label="Installation stages">
        {steps.map(({ label, detail, done }) => <li key={label} className={done ? "is-done" : ""}>
          <span aria-hidden="true">{done ? <Check size={15} /> : <Circle size={15} />}</span><div><strong>{label}</strong><small>{detail}</small></div>
        </li>)}
      </ol>
      <p className="install-progress-note"><Smartphone size={16} aria-hidden="true" />{stage === "failed" || stage === "stalled" ? "Keep your journal safe: don’t clear browser or site data to retry installation." : "Your stories stay on this device. Installation is managed by your browser."}</p>
      <Button className="w-full" onClick={() => onOpenChange(false)}>{accepted ? "Back to my journal" : "Keep using MemoTrail"}</Button>
    </DialogContent>
  </Dialog>;
}
