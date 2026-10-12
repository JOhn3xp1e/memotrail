import { useEffect, useState } from "react";

export function useObjectUrl(source: Blob | string | null | undefined) {
  const [url, setUrl] = useState<string | undefined>(
    typeof source === "string" ? source : undefined,
  );
  useEffect(() => {
    if (typeof source === "string") {
      setUrl(source);
      return;
    }
    if (!source || !(source instanceof Blob)) {
      setUrl(undefined);
      return;
    }
    const next = URL.createObjectURL(source);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [source]);
  return url;
}

export function useObjectUrls(files: File[]) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const next = files.map((file) => URL.createObjectURL(file));
    setUrls(next);
    return () => next.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);
  return urls;
}
