import { useState } from "react";
import { useObjectUrl } from "@/hooks/use-object-urls";

export function LocalMediaImage({
  source,
  alt,
  className,
  fallbackClassName,
  loading = "lazy",
}: {
  source: Blob | string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  loading?: "eager" | "lazy";
}) {
  const url = useObjectUrl(source);
  const [failedSource, setFailedSource] = useState<Blob | string | null>(null);
  const failed = failedSource === source;

  if (!url || failed) {
    return (
      <span
        className={`memory-photo-empty ${fallbackClassName ?? ""}`}
        role="img"
        aria-label={`${alt} is unavailable`}
      />
    );
  }
  return (
    <img
      className={className}
      src={url}
      alt={alt}
      loading={loading}
      onError={() => setFailedSource(source)}
    />
  );
}
