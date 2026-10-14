import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useCapsules, useCapsuleClock, capsuleDate, countdown } from "@/hooks/use-capsules";
import { CapsuleEnvelope } from "@/components/capsule-envelope";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { ContextualHelp } from "@/components/contextual-help";

export function CapsulesPage() {
  const [retry, setRetry] = useState(0);
  const data = useCapsules(retry);
  const now = useCapsuleClock();
  const [filter, setFilter] = useState("All");
  const capsules = data?.capsules ?? [];
  const status = (capsule: typeof capsules[number]) => capsule.status === "opened" ? "Opened" : Date.parse(capsule.unlockAt) <= now ? "Ready to Open" : "Sealed";
  return <div className="capsules-page"><ContextualHelp guide="capsule-create">How time capsules work</ContextualHelp>
    <PageHeading eyebrow="A LITTLE LOVE, SENT FORWARD" title="Letters to Tomorrow" description="Some memories are meant to be opened later."><Button asChild><Link to="/capsules/new"><Plus size={16} />Create Capsule</Link></Button></PageHeading>
    <div className="capsule-stats">{[["Total Capsules", capsules.length], ["Sealed Capsules", capsules.filter((c) => c.status === "sealed").length], ["Opened Capsules", capsules.filter((c) => c.status === "opened").length], ["Upcoming Unlocks", capsules.filter((c) => c.status === "sealed" && Date.parse(c.unlockAt) > now).length]].map(([label, count]) => <div key={label}><strong>{count}</strong><span>{label}</span></div>)}</div>
    <div className="filter-chips capsule-filters" aria-label="Filter capsules">{["All", "Sealed", "Ready to Open", "Opened"].map((value) => <button className={`filter-chip ${filter === value ? "selected" : ""}`} aria-pressed={filter === value} key={value} onClick={() => setFilter(value)}>{value}</button>)}</div>
    {!data ? <p role="status">Opening your letters…</p> : data.error ? <div><p role="alert">{data.error}</p><Button onClick={() => setRetry((value) => value + 1)}>Try again</Button></div> : <div className="capsule-grid">
      {capsules.filter((capsule) => filter === "All" || status(capsule) === filter).map((capsule) => <Link className="capsule-card" key={capsule.id} to={`/capsules/${capsule.id}`}>
        <CapsuleEnvelope open={capsule.status === "opened"} /><span className="category-tag">{status(capsule)}</span><h2>{capsule.title}</h2><p>Created {capsuleDate(capsule.createdAt)}</p><p>Unlocks {capsuleDate(capsule.unlockAt)}</p><strong className="capsule-countdown">{capsule.status === "opened" ? "A letter, lovingly opened" : countdown(capsule.unlockAt, now)}</strong>
      </Link>)}
      {!capsules.some((capsule) => filter === "All" || status(capsule) === filter) && <div className="capsule-empty"><CapsuleEnvelope /><h2>A little room for tomorrow.</h2><p>{capsules.length ? "No capsules in this chapter yet. Try another filter." : "Write a letter to a future you. We’ll keep it here until its day arrives."}</p><Button asChild><Link to="/capsules/new">Create Capsule</Link></Button></div>}
    </div>}
    <p className="fine-print capsule-lock-note">Capsules stay on this device. Sealing hides contents until the device’s unlock time; it is not encryption or tamper-proof protection.</p>
  </div>;
}
