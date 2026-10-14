import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      className={cn("brand-mark", className)}
      src="/icons/icon-192.png"
      alt=""
      aria-hidden="true"
      width={38} height={38}
    />
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
