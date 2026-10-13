import { Link } from "react-router-dom";
import { useCapsules, useCapsuleClock, countdown } from "@/hooks/use-capsules";
import { CapsuleEnvelope } from "./capsule-envelope";

export function CapsulePreview() {
  const data = useCapsules();
  const now = useCapsuleClock();
  const upcoming = data?.capsules.filter((capsule) => capsule.status === "sealed").sort((a, b) => a.unlockAt.localeCompare(b.unlockAt))[0];
  return <section className="capsule-home-preview">
    <CapsuleEnvelope />
    <div><span className="eyebrow">LETTERS TO TOMORROW</span><h2>{upcoming?.title ?? "A little something for your future self."}</h2>
      <p>{data?.error ? "Your capsules couldn’t be loaded. Open the collection to try again." : upcoming ? countdown(upcoming.unlockAt, now) : "Some memories are meant to be opened later."}</p>
      {upcoming && <Link className="text-link" to={`/capsules/${upcoming.id}`}>{Date.parse(upcoming.unlockAt) <= now ? "Ready to open" : "View upcoming capsule"}</Link>}
      <Link className="text-link" to="/capsules">View All Capsules</Link>
    </div>
  </section>;
}
