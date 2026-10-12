import { ArrowLeft, Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
export function NotFoundPage() {
  return (
    <div className="not-found">
      <Compass size={40} strokeWidth={1} />
      <span className="eyebrow">A LITTLE DETOUR</span>
      <h1>This trail leads somewhere else.</h1>
      <p>Let’s find our way back to your beautiful moments.</p>
      <Button asChild>
        <Link to="/">
          <ArrowLeft size={16} />
          Back to your little world
        </Link>
      </Button>
    </div>
  );
}
