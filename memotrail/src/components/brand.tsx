import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      className={cn("brand-mark", className)}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <rect x="1" y="1" width="38" height="38" rx="13" fill="currentColor" />
      <path
        d="M11 27V13.5a1 1 0 0 1 1.7-.7L20 20l7.3-7.2a1 1 0 0 1 1.7.7V27M11 25l9-8 9 8"
        stroke="white"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 29h4"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function Brand() {
  return (
    <span className="brand">
      <BrandMark />
      <span>
        <span className="brand-name">
          MemoTrail<span className="brand-period">.</span>
        </span>
        <span className="brand-tagline">YOUR LIFE, YOUR STORIES</span>
      </span>
    </span>
  );
}
