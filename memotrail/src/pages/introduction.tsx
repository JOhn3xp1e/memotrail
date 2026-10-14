import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Clock3, Heart, History, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { CapsuleEnvelope } from "@/components/capsule-envelope";
import { usePreferences } from "@/stores/preferences";
import { useResolvedTheme } from "@/hooks/use-theme";
import { useIntroduction } from "@/stores/onboarding";

const screens = [
  { chapter: "A LITTLE BEGINNING", title: "Every life has a story.", description: "Welcome to MemoTrail — a little home for the moments you never want to forget." },
  { chapter: "YOUR MEMORY VAULT", title: "Keep the little moments.", description: "Save your favorite photos, stories, feelings, and places. Every memory deserves a place to belong." },
  { chapter: "FIND YOUR WAY BACK", title: "Relive what matters.", description: "Travel through your timeline, rediscover forgotten moments, and revisit the chapters that made you." },
  { chapter: "LETTERS TO TOMORROW", title: "Some stories are for tomorrow.", description: "Write a letter, preserve a moment, and choose when your future self can open it." },
  { chapter: "JUST YOURS. ALWAYS.", title: "Your memories stay yours.", description: "MemoTrail keeps your memories on this device. No account required. Export a backup to keep your stories safe." },
];
function returnPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/")) return "/";
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin || url.pathname.replace(/\/+$/, "") === "/introduction") return "/";
    return url.pathname + url.search + url.hash;
  } catch { return "/"; }
}
function Polaroid({ photo, caption, className = "" }: { photo: string; caption: string; className?: string }) {
  return <div className={`intro-polaroid ${className}`}><img src={`/photos/${photo}.jpg`} alt="" width={240} height={260} draggable={false} decoding="async" /><span>{caption}</span></div>;
}
function Illustration({ step }: { step: number }) {
  return <div className={`intro-art intro-art-${step}`} aria-hidden="true">
    <div className="intro-art-halo" />
    {step < 2 ? <><span className="intro-tape tape-left" /><Polaroid photo="lake-weekend" caption="the days we keep" className="polaroid-left" /><Polaroid photo={step === 0 ? "wildflowers" : "our-kind-of-day"} caption={step === 0 ? "little things, big feelings" : "a feeling worth keeping"} className="polaroid-right" /><span className="intro-script">{step === 0 ? "life, beautifully remembered" : "photos · stories · places"}</span>{step === 1 && <span className="intro-mood-note"><Heart size={15} />a grateful little day</span>}</> : null}
    {step === 2 && <><div className="intro-timeline-thread" /><Polaroid photo="slow-mornings" caption="an ordinary kind of lovely" className="rediscover-photo" /><span className="intro-date-stamp">ON THIS DAY<br /><strong>A moment, found again.</strong></span><div className="intro-jar"><span /><Heart size={24} /><p>the good bits</p></div></>}
    {step === 3 && <><div className="intro-letter"><span>Dear future me,</span><i /><i /><i /><Heart size={18} /></div><CapsuleEnvelope /><span className="intro-script">a little love, for later</span></>}
    {step === 4 && <><div className="intro-backup-paper"><LockKeyhole size={26} /><span>YOUR LIFE.<br />YOUR STORIES.</span><i /><i /><div><ShieldCheck size={18} />Kept on your device</div></div><div className="intro-backup-tag"><BookOpen size={24} /><span>A copy to keep</span><small>your memories.zip</small></div><span className="intro-script">a safe home for your story</span></>}
    <Sparkles size={24} className="intro-art-sparkle" />
  </div>;
}
export function IntroductionPage() {
  const controller = useIntroduction();
  const replay = controller.status === "ready";
  const [step, setStep] = useState(() => replay ? 0 : controller.step);
  const [direction, setDirection] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const dark = useResolvedTheme();
  const systemReduced = useReducedMotion();
  const preferenceReduced = usePreferences((state) => state.reduceMotion);
  const reduced = !!systemReduced || preferenceReduced;
  const heading = useRef<HTMLHeadingElement>(null);
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  const busyRef = useRef(false);
  const screen = screens[step]!;
  const state = location.state as { returnTo?: unknown } | null;
  const previous = returnPath(state?.returnTo);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    document.title = `${screen.title} · MemoTrail`;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", "#201e25");
    return () => { document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#201e25" : "#FAF7F2"); };
  }, [step, screen.title, dark]);
  async function move(next: number) {
    if (busyRef.current || next < 0 || next >= screens.length || next === step) return;
    busyRef.current = true; setBusy(true); setError("");
    try {
      if (!replay) await controller.advance(next);
      setDirection(next > step ? 1 : -1); setStep(next);
    } catch { setError("Your place could not be saved on this device. Please try again."); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function finish() {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError("");
    try { if (!replay) await controller.complete(); navigate(replay ? previous : "/", { replace: true }); }
    catch { setError("The introduction could not be saved as complete. Please try again; your journal is unchanged."); }
    finally { busyRef.current = false; setBusy(false); }
  }
  function pointerUp(event: PointerEvent<HTMLElement>) {
    const start = swipe.current; swipe.current = null;
    if (!start || start.id !== event.pointerId || event.pointerType === "mouse") return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.5) void move(step + (dx < 0 ? 1 : -1));
  }
  return <main className="onboarding" aria-label="MemoTrail introduction" onKeyDown={(event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "ArrowRight") { event.preventDefault(); void move(step + 1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); void move(step - 1); }
    if (event.key === "Escape" && replay) { event.preventDefault(); void finish(); }
  }}>
    <header className="intro-header"><Brand /><button type="button" className="intro-skip" disabled={busy} onClick={() => void finish()}>{replay ? "Exit introduction" : "Skip introduction"}</button></header>
    <div className="intro-chapter" onPointerDown={(event) => { if (event.pointerType !== "mouse" && !(event.target as HTMLElement).closest("button,a")) swipe.current = { x: event.clientX, y: event.clientY, id: event.pointerId }; }} onPointerUp={pointerUp} onPointerCancel={() => { swipe.current = null; }}>
      <AnimatePresence initial={false} mode="sync" custom={direction}>
        <motion.section key={step} className="intro-screen" aria-labelledby={`intro-heading-${step}`} custom={direction} initial={reduced ? false : { opacity: 0, x: direction * 20 }} animate={{ opacity: 1, x: 0 }} exit={reduced ? { opacity: 0 } : { opacity: 0, x: direction * -15 }} transition={{ duration: reduced ? 0 : .22, ease: "easeOut" }} onAnimationComplete={() => heading.current?.focus({ preventScroll: true })}>
          <Illustration step={step} />
          <div className="intro-copy"><span className="intro-eyebrow">{screen.chapter}</span><h1 ref={(node) => { if (node) heading.current = node; }} id={`intro-heading-${step}`} tabIndex={-1}>{screen.title}</h1><p className="intro-description">{screen.description}</p>
            {step === 2 && <ul className="intro-features"><li><History size={15} />Timeline</li><li><Heart size={15} />Memory Jar</li><li><CalendarDays size={15} />On This Day</li><li><Clock3 size={15} />Memory Rewind</li></ul>}
            {step === 4 && <p className="intro-privacy-note"><ShieldCheck size={20} /><span>Clearing browser data or uninstalling the app may remove local memories. Back up regularly.</span></p>}
          </div>
        </motion.section>
      </AnimatePresence>
    </div>
    <footer className="intro-footer"><div className="intro-progress" aria-label={`Introduction step ${step + 1} of 5`}><span className="sr-only" role="status">Step {step + 1} of 5</span>{screens.map((item, index) => <button type="button" key={item.chapter} aria-label={`Go to introduction step ${index + 1}`} aria-current={index === step ? "step" : undefined} disabled={busy} onClick={() => void move(index)}><span /></button>)}</div>
      {error && <p role="alert" className="intro-error">{error}</p>}
      <div className="intro-navigation"><Button className="intro-back" variant="ghost" disabled={busy || step === 0} onClick={() => void move(step - 1)}><ArrowLeft size={17} />Back</Button><Button className="intro-next" disabled={busy} onClick={() => void (step === 4 ? finish() : move(step + 1))}>{busy ? "Saving…" : step === 0 ? "Begin Your Story" : step === 4 ? "Start Collecting Memories" : "Next"}<ArrowRight size={17} /></Button></div>
      <p className="intro-footnote">A private little home. No account needed.</p>
    </footer>
  </main>;
}
