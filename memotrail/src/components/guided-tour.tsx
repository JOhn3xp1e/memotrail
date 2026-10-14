import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePreferences } from "@/stores/preferences";

const steps = [
  { target: "welcome", title: "A little home for your story", text: "Home welcomes you and gives you ways to revisit your moments. On phones, scroll down to discover more." },
  { target: "recent", title: "The good bits, lately", text: "Your recent memories appear here. Open a card to read its story, or choose View all for Timeline." },
  { target: "add", title: "Start with a little moment", text: "Add opens your memory editor. Give it a title, optionally add photos and a story, then choose Save memory." },
  { target: "collections", title: "Moments that belong together", text: "Collections are your albums. Create one, then assign a memory to it in the editor." },
  { target: "timeline", title: "Follow your memory trail", text: "Timeline holds your saved memories by date. Search, filter, and switch between photo grid and journal list." },
  { target: "settings", title: "Keep your stories safe", text: "Settings holds themes, storage, ZIP backups, and How to Use MemoTrail. Keep a backup outside this browser." },
];
function visibleTarget(target: string) {
  return [...document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`)].find((node) => node.getClientRects().length && getComputedStyle(node).visibility !== "hidden");
}
export function GuidedTour() {
  const location = useLocation();
  const navigate = useNavigate();
  return location.pathname === "/" && location.state?.helpTour === true ? <Tour onClose={() => navigate("/", { replace: true, state: null })} /> : null;
}
function Tour({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<{ top: number; left: number; width: number; height: number }>();
  const [panelTop, setPanelTop] = useState(16);
  const panel = useRef<HTMLDivElement>(null);
  const reduced = usePreferences((state) => state.reduceMotion);
  const step = steps[index]!;
  useEffect(() => {
    let target = visibleTarget(step.target);
    // Skip a missing target; never leave an overlay pointing at empty space.
    if (!target) {
      const frame = requestAnimationFrame(() => { if (index < steps.length - 1) setIndex((value) => value + 1); else onClose(); });
      return () => cancelAnimationFrame(frame);
    }
    target.scrollIntoView({ block: "center", behavior: "instant" });
    const update = () => {
      target = visibleTarget(step.target);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const viewport = window.visualViewport;
      const top = viewport?.offsetTop ?? 0, height = viewport?.height ?? innerHeight;
      const highlight = { top: Math.max(top + 4, rect.top - 5), left: Math.max(4, rect.left - 5), width: Math.min(innerWidth - 8, rect.width + 10), height: Math.min(height - 8, rect.height + 10) };
      setBox(highlight);
      const panelHeight = panel.current?.offsetHeight ?? 260;
      const below = highlight.top + highlight.height + 14;
      const position = below + panelHeight < top + height - 16 ? below : highlight.top - panelHeight - 14;
      setPanelTop(Math.max(top + 12, Math.min(position, top + height - panelHeight - 12)));
    };
    const frame = requestAnimationFrame(update);
    const observer = new ResizeObserver(update); observer.observe(target); if (panel.current) observer.observe(panel.current);
    window.addEventListener("scroll", update, true); window.addEventListener("resize", update); window.visualViewport?.addEventListener("resize", update);
    panel.current?.focus({ preventScroll: true });
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("scroll", update, true); window.removeEventListener("resize", update); window.visualViewport?.removeEventListener("resize", update); };
  }, [index, step.target, onClose]);
  return <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}><Dialog.Portal><Dialog.Overlay className="tour-overlay" />{box && <div className="tour-highlight" style={box} aria-hidden="true" />}<Dialog.Content ref={panel} className={`tour-panel${reduced ? " tour-still" : ""}`} style={{ top: panelTop }} onCloseAutoFocus={(event) => { event.preventDefault(); document.getElementById("main-content")?.focus({ preventScroll: true }); }} onPointerDownOutside={(event) => event.preventDefault()} onKeyDown={(event) => {
    if (event.key === "ArrowRight") { event.preventDefault(); if (index < steps.length - 1) setIndex((value) => value + 1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); setIndex((value) => Math.max(0, value - 1)); }
  }}><span className="eyebrow">A LITTLE TOUR · {index + 1} OF {steps.length}</span><Dialog.Title>{step.title}</Dialog.Title><Dialog.Description aria-live="polite">{step.text}</Dialog.Description><div className="tour-actions"><Button variant="ghost" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}><ArrowLeft size={15} />Back</Button><Button onClick={() => index === steps.length - 1 ? onClose() : setIndex((value) => value + 1)}>{index === steps.length - 1 ? "Finish" : "Next"}<ArrowRight size={15} /></Button></div><button className="tour-skip" onClick={onClose}><X size={14} />Skip tour</button></Dialog.Content></Dialog.Portal></Dialog.Root>;
}
