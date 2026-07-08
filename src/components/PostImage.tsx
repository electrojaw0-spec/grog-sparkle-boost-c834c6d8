import { useEffect, useState } from "react";
import { signedPostImageUrl } from "@/lib/postImage";
import { Loader2, X } from "lucide-react";

export function PostImage({ path, alt }: { path: string; alt?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [full, setFull] = useState(false);

  useEffect(() => {
    let cancelled = false;
    signedPostImageUrl(path).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!url) {
    return (
      <div className="w-full aspect-video rounded-xl bg-secondary grid place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setFull(true)}
        className="block w-full overflow-hidden rounded-xl bg-black/20"
      >
        <img
          src={url}
          alt={alt ?? "Post image"}
          loading="lazy"
          className="w-full max-h-[520px] object-cover"
        />
      </button>
      {full && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 grid place-items-center p-4"
          onClick={() => setFull(false)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 grid place-items-center text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <img src={url} alt={alt ?? "Post image"} className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </>
  );
}
