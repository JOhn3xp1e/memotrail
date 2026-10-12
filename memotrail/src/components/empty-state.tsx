import { ArrowRight, BookHeart, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePreferences } from "@/stores/preferences";

export function EmptyState({
  title = "A beautiful story starts here",
  description = "The everyday magic, the big adventures, the people you love. Make a little space for all of it.",
  compact = false,
}: {
  title?: string;
  description?: string;
  compact?: boolean;
}) {
  return (
    <div className={`empty-state ${compact ? "empty-compact" : ""}`}>
      <div className="empty-illustration" aria-hidden="true">
        <BookHeart />
        <Sparkles />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      <Button asChild>
        <Link to="/add">
          <span>Create your first memory</span>
          <ArrowRight size={16} />
        </Link>
      </Button>
      {!compact && (
        <button
          className="text-link"
          onClick={() => usePreferences.getState().setSampleMode(true)}
        >
          Take a peek at a sample scrapbook
        </button>
      )}
    </div>
  );
}
