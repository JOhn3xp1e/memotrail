import { Link } from "react-router-dom";
import { Film } from "lucide-react";
import { useRewindLibrary } from "@/hooks/use-rewind";
import { useLocalToday } from "@/hooks/use-local-today";
import { periodLabel, rewindPeriods } from "@/lib/rewind";

export function RewindPreview() {
  const data = useRewindLibrary();
  const year = useLocalToday().slice(0, 4);
  const periods = rewindPeriods(data?.memories ?? []);
  return <section className="rewind-home-preview"><Film size={30} /><div><span className="eyebrow">A LITTLE LOOK BACK</span><h2>Your story deserves an encore.</h2><p>{periods.years.includes(year) ? `Your ${year} rewind is waiting.` : `Your ${year} story is still unfolding.`}</p><div className="rewind-home-links">
    {periods.years.includes(year) && <Link className="text-link" to={`/rewind?period=${year}`}>{year} Yearly Rewind</Link>}
    {periods.months[0] && <Link className="text-link" to={`/rewind?period=${periods.months[0]}`}>{periodLabel(periods.months[0])} Rewind</Link>}
    <Link className="text-link" to="/rewind">Open Rewind</Link>
  </div></div></section>;
}
