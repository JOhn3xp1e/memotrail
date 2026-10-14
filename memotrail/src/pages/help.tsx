import { useEffect } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, ChevronDown, CircleHelp, Monitor, Search, ShieldCheck, Smartphone, Sparkles, X } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { HelpScreenshot } from "@/components/help-screenshot";
import { findHelpGuides, helpFaqs, helpGuides, helpTroubleshooting, type GuideMode } from "@/data/help";
import { useDraft } from "@/stores/draft";
import { useBackupOperation } from "@/stores/backup-operation";

export function HelpPage() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const mode: GuideMode = params.get("mode") === "desktop" ? "desktop" : params.get("mode") === "mobile" ? "mobile" : window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop";
  const query = params.get("q") ?? "";
  const matching = findHelpGuides(query, mode);
  const selected = params.get("guide") ?? (query ? "" : "home");
  const requestedGuide = params.get("guide");
  useEffect(() => {
    if (!requestedGuide || requestedGuide === "none") return;
    const frame = requestAnimationFrame(() => {
      const heading = document.getElementById(`help-toggle-${requestedGuide}`);
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView({ behavior: "instant", block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [requestedGuide]);
  const draft = useDraft((state) => state.draft);
  const unsaved = !!(draft.title || draft.story || draft.location || draft.collectionId || draft.photos.length);
  const backupBusy = useBackupOperation((state) => state.busy);
  function update(key: string, value: string) {
    setParams((previous) => { const next = new URLSearchParams(previous); if (value) next.set(key, value); else next.delete(key); return next; }, { replace: key === "q" });
  }
  function openGuide(id: string) {
    const guide = helpGuides.find((item) => item.id === id);
    const next = new URLSearchParams(params); next.delete("q"); next.set("guide", id); if (guide?.mode) next.set("mode", guide.mode);
    setParams(next);
  }
  const categories = [...new Set(matching.map((item) => item.category))];
  return <div className="help-center">
    <header className="help-heading">
      <Button variant="ghost" onClick={() => location.key !== "default" ? navigate(-1) : navigate("/settings")}><ArrowLeft size={16} />Back</Button>
      <span className="eyebrow">A LITTLE GUIDANCE, JUST FOR YOU</span><h1>How to Use MemoTrail</h1><p>Your little guide to keeping every moment that matters.</p>
      <div className="help-polaroids" aria-hidden="true"><img src="/photos/golden-hour.jpg" alt="" /><img src="/photos/mountain-air.jpg" alt="" /></div>
      <form className="help-search" role="search" onSubmit={(event) => event.preventDefault()}><Search size={18} /><input aria-label="Search guide topics" placeholder="Search guide topics..." value={query} onChange={(event) => update("q", event.target.value)} />{query && <button type="button" aria-label="Clear guide search" onClick={() => update("q", "")}><X size={18} /></button>}</form>
    </header>
    <div className="help-modes" role="tablist" aria-label="Choose your device guide">{(["mobile", "desktop"] as const).map((value) => <button key={value} id={`help-tab-${value}`} role="tab" aria-selected={mode === value} aria-controls="help-guide-content" tabIndex={mode === value ? 0 : -1} onKeyDown={(event) => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) { event.preventDefault(); const next = event.key === "Home" ? "mobile" : event.key === "End" ? "desktop" : value === "mobile" ? "desktop" : "mobile"; update("mode", next); document.getElementById(`help-tab-${next}`)?.focus(); } }} onClick={() => update("mode", value)}>{value === "mobile" ? <Smartphone size={21} /> : <Monitor size={21} />}<span><strong>{value === "mobile" ? "Mobile Guide" : "Web Guide"}</strong><small>{value === "mobile" ? "For phones, one tap at a time" : "For desktop and laptop"}</small></span></button>)}</div>
    <div id="help-guide-content" role="tabpanel" aria-labelledby={`help-tab-${mode}`}>
      {!query && <section className="help-quickstart" aria-labelledby="help-quickstart-title"><div><span className="eyebrow">START WITH A LITTLE MOMENT</span><h2 id="help-quickstart-title">Your first memory, made simple.</h2><p>Seven small steps. A moment you can keep.</p><ol>{["Open Add (+)", "Give it a title", "Add photos", "Write your story", "Choose a collection", "Save memory", "Revisit anytime"].map((text, index) => <li key={text}><b>{index + 1}</b><span>{text}</span>{index < 6 && <ArrowRight size={13} aria-hidden="true" />}</li>)}</ol><div className="help-quickstart-actions"><Button asChild><Link to="/add">Try Adding a Memory<ArrowRight size={16} /></Link></Button><Button variant="outline" disabled={unsaved || backupBusy} onClick={() => navigate("/", { state: { helpTour: true } })}><Sparkles size={16} />Take a guided tour</Button></div>{unsaved && <p className="help-care-note">Your editor has an unfinished draft. <Link to="/add">Return to your draft</Link> before taking the tour.</p>}{backupBusy && <p className="help-care-note">Finish your backup operation before starting a tour.</p>}</div><HelpScreenshot id="add-memory" mode={mode} title="Your first memory" /></section>}
      <div className="help-library-layout">
        <nav className="help-library-nav" aria-label="Guide topics"><h2><BookOpen size={17} />Your little guidebook</h2><a href="#help-tutorials" className="help-mobile-jump">Browse tutorials<ChevronDown size={15} /></a>{categories.map((category) => <div key={category}><span>{category}</span>{matching.filter((item) => item.category === category).map((item) => <button key={item.id} aria-current={selected === item.id ? "true" : undefined} onClick={() => openGuide(item.id)}>{item.title}</button>)}</div>)}<a href="#help-faq">Frequently asked questions</a><a href="#help-troubleshooting">Troubleshooting</a></nav>
        <section className="help-tutorials" id="help-tutorials" aria-label="Tutorial library"><p className="help-results" role="status">{matching.length} {matching.length === 1 ? "guide" : "guides"}{query ? ` for “${query}”` : " to make yourself at home"}</p>{!matching.length && <div className="help-empty"><CircleHelp size={30} /><h2>A different word might find it.</h2><p>Try “photos”, “backup”, “capsule”, or “offline”.</p><Button variant="outline" onClick={() => update("q", "")}>Show all guides</Button></div>}
          {matching.map((item, index) => { const expanded = selected === item.id; return <article className={`help-guide-card${expanded ? " is-open" : ""}`} key={item.id}>
            <h2><button id={`help-toggle-${item.id}`} className="help-guide-toggle" aria-expanded={expanded} aria-controls={`help-guide-${item.id}`} onClick={() => update("guide", expanded ? "none" : item.id)}><span className="help-guide-number">{index + 1}</span><span><strong>{item.title}</strong><small>{item.introduction}</small></span><ChevronDown size={18} /></button></h2>
            {expanded && <motion.div id={`help-guide-${item.id}`} className="help-guide-body" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .15 }}><div className="help-guide-meta"><span>{item.difficulty}</span><span>{item.steps.length} steps</span><span>{mode === "mobile" ? "Phone layout" : "Desktop layout"}</span></div><div className="help-guide-instructions"><HelpScreenshot id={item.screenshot} mode={mode} title={item.title} /><div><p className="help-device-tip">{mode === "mobile" ? item.mobileTip : item.desktopTip}</p><ol className="help-instructions">{item.steps.map((step, number) => <li key={step}><b>{number + 1}</b><p>{step}</p></li>)}</ol></div></div><div className="help-tips"><aside><strong>A little tip</strong><p>{item.tip}</p></aside><aside><strong>Easy to miss</strong><p>{item.mistake}</p></aside></div><div className="help-guide-actions">{item.action && <Button asChild><Link to={item.action.to}>{item.action.label}<ArrowRight size={15} /></Link></Button>}<span>Keep exploring</span>{item.related.map((id) => <button key={id} onClick={() => openGuide(id)}>{helpGuides.find((guide) => guide.id === id)?.title}</button>)}</div></motion.div>}
          </article>; })}
        </section>
      </div>
    </div>
    <section className="help-faq" id="help-faq"><span className="eyebrow">A FEW THINGS YOU MAY WONDER</span><h2>Frequently asked questions</h2>{helpFaqs.map(([question, answer, id]) => <details key={question}><summary>{question}<ChevronDown size={16} /></summary><p>{answer}</p><button onClick={() => openGuide(id)}>Read the guide<ArrowRight size={14} /></button></details>)}</section>
    <section className="help-troubleshooting" id="help-troubleshooting"><span className="eyebrow">WHEN SOMETHING NEEDS A LITTLE CARE</span><h2>Troubleshooting</h2><div>{helpTroubleshooting.map(([title, text, id]) => <article key={title}><h3>{title}</h3><p>{text}</p><button onClick={() => openGuide(id)}>Open related guide<ArrowRight size={14} /></button></article>)}</div></section>
    <aside className="help-privacy"><ShieldCheck size={24} /><div><h2>Your stories stay yours.</h2><p>Vercel hosts MemoTrail’s app files. Your journal stays in this browser’s IndexedDB. No account, AI, or automatic sync. Keep a ZIP backup outside the browser; clearing site data or uninstalling may remove local memories.</p><Link to="/settings">Go to Storage &amp; Backup<ArrowRight size={15} /></Link></div></aside>
  </div>;
}
