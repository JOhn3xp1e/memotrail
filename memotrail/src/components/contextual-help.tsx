import { CircleHelp } from "lucide-react";
import { Link } from "react-router-dom";
export function ContextualHelp({ guide, children = "Need help?" }: { guide: string; children?: string }) {
  return <Link className="contextual-help" to={`/help?guide=${encodeURIComponent(guide)}`}><CircleHelp size={15} aria-hidden="true" />{children}</Link>;
}
