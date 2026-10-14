import { useState } from "react";
import { Expand, Minus, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { screenshotPath, type GuideMode, type ScreenshotId } from "@/data/help";
import { captureMetadata } from "@/data/help-captures";

export function HelpScreenshot({ id, mode, title }: { id: ScreenshotId; mode: GuideMode; title: string }) {
  // A new key resets load/zoom state when switching guides or device layouts.
  return <Screenshot key={`${id}-${mode}`} id={id} mode={mode} title={title} />;
}
function Screenshot({ id, mode, title }: { id: ScreenshotId; mode: GuideMode; title: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const src = screenshotPath(id, mode);
  const metadata = captureMetadata.find((shot) => shot.id === id && shot.variant === (mode === "mobile" ? "mobile-390" : "desktop"));
  const alt = `${mode === "mobile" ? "Phone" : "Desktop"} screenshot of ${title}. Numbered lavender markers identify the controls listed below. All memories shown are synthetic examples.`;
  return <figure className={`help-screenshot help-screenshot-${mode}`}>
    <div className="help-shot-frame">
      {!loaded && !failed && <span className="help-shot-loading" role="status">Opening the example…</span>}
      {failed ? <div><p role="status">This screenshot could not load. The written steps below are still available.</p><Button variant="outline" onClick={() => { setFailed(false); setLoaded(false); setAttempt((value) => value + 1); }}>Try loading screenshot again</Button></div> : <button type="button" className="help-shot-open" aria-label={`Enlarge screenshot: ${title}`} onClick={() => { setZoom(1); setOpen(true); }}>
        <img key={attempt} src={src} alt={alt} width={metadata?.width} height={metadata?.height} loading="lazy" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
        <span><Expand size={15} />Tap to explore</span>
      </button>}
    </div>
    <figcaption><span>REAL APP · EXAMPLE DATA</span>{metadata && <ol className="help-shot-legend">{metadata.annotations.map((annotation) => <li key={annotation.number}><b>{annotation.number}</b>{annotation.label}</li>)}</ol>}</figcaption>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="help-zoom-dialog">
        <DialogTitle>{title}</DialogTitle><DialogDescription>Actual {mode === "mobile" ? "phone" : "desktop"} layout with safe example data. Zoom in and scroll to inspect the controls.</DialogDescription>
        <div className="help-zoom-controls"><Button variant="outline" size="icon" disabled={zoom <= 1} aria-label="Zoom screenshot out" onClick={() => setZoom((value) => Math.max(1, value - .5))}><Minus size={17} /></Button><span role="status">{Math.round(zoom * 100)}%</span><Button variant="outline" size="icon" disabled={zoom >= 3} aria-label="Zoom screenshot in" onClick={() => setZoom((value) => Math.min(3, value + .5))}><Plus size={17} /></Button><Button variant="ghost" onClick={() => setZoom(1)}>Fit image</Button></div>
        <div className="help-zoom-surface" tabIndex={0} role="region" aria-label="Scrollable enlarged screenshot"><img src={src} alt={alt} style={{ width: `${zoom * 100}%`, maxWidth: "none" }} /></div>
      </DialogContent>
    </Dialog>
  </figure>;
}
