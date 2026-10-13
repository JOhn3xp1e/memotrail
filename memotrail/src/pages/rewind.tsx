import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Film, Play } from "lucide-react";
import { useRewind, useRewindLibrary } from "@/hooks/use-rewind";
import { makeRewindSlides, periodLabel, rewindPeriods } from "@/lib/rewind";
import { RewindPlayer } from "@/components/rewind-player";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";

export function RewindPage() {
  const [retry, setRetry] = useState(0);
  const library = useRewindLibrary(retry);
  const [params, setParams] = useSearchParams();
  const period = params.get("period") ?? "";
  const [mode, setMode] = useState("monthly");
  const periods = rewindPeriods(library?.memories ?? []);
  return <div className="rewind-page"><PageHeading eyebrow="YOUR LIFE, IN LITTLE CHAPTERS" title="Relive Your Story" description="Every moment deserves another look." />
    {!library ? <p role="status">Gathering your story…</p> : library.error ? <><p role="alert">{library.error}</p><Button onClick={() => setRetry((value) => value + 1)}>Try again</Button></> : !periods.months.length ? <div className="rewind-empty"><Film size={40} /><h2>Your story is waiting to unfold.</h2><p>Save a memory, then return for a rewind made entirely from your own moments.</p><Button asChild><Link to="/add">Add a memory</Link></Button></div> : <>
      <div className="filter-chips rewind-tabs">{["monthly", "yearly"].map((value) => <button key={value} className={`filter-chip ${mode === value ? "selected" : ""}`} aria-pressed={mode === value} onClick={() => setMode(value)}>{value === "monthly" ? "Monthly Rewind" : "Yearly Rewind"}</button>)}</div>
      <p className="fine-print">Recaps follow your memory dates. Saved-during-period totals follow creation dates.</p>
      <div className="rewind-periods">{(mode === "monthly" ? periods.months : periods.years).map((value, index) => <button className={`rewind-period rewind-period-${index % 3}`} key={value} onClick={() => setParams({ period: value })}><Film size={26} /><span className="eyebrow">{mode === "monthly" ? "A MONTH TO KEEP" : "YOUR YEAR, REMEMBERED"}</span><h2>{periodLabel(value)}</h2><p>{library.memories.filter((memory) => memory.memoryDate.startsWith(value)).length} memories</p><span className="rewind-period-play"><Play size={16} />Play your rewind</span></button>)}</div>
    </>}
    {period && library && <RewindSession key={period} period={period} valid={[...periods.months, ...periods.years].includes(period)} onClose={() => setParams({})} />}
  </div>;
}
function RewindSession({ period, valid, onClose }: { period: string; valid: boolean; onClose: () => void }) {
  const [retry, setRetry] = useState(0);
  const data = useRewind(valid ? period : "invalid", retry);
  if (!valid) return <div role="status"><p>No saved memories for this period.</p><Button onClick={onClose}>Choose another period</Button></div>;
  if (!data) return <p role="status">Preparing your rewind…</p>;
  if (!data.stats || data.error) return <div><p role="alert">{data.error}</p><Button onClick={() => setRetry((value) => value + 1)}>Try again</Button></div>;
  if (!data.stats.memories.length) return <p>No memories remain in this period.</p>;
  return <RewindPlayer slides={makeRewindSlides(data.stats, data.photoCount ?? 0, data.photos ?? [], period)} period={period} onClose={onClose} />;
}
