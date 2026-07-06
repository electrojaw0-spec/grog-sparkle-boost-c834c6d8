import { useState } from "react";
import { Loader2, X, Trash2, Download } from "lucide-react";
import { useSignedImage } from "@/lib/chatImage";

interface Props {
  path: string;
  onDelete?: () => void;
  mine?: boolean;
}

export function ChatImage({ path, onDelete, mine }: Props) {
  const url = useSignedImage(path);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => url && setOpen(true)}
        className="block rounded-xl overflow-hidden bg-secondary/60 border border-border max-w-[240px]"
      >
        {url ? (
          <img src={url} alt="Shared image" className="block max-h-64 w-auto object-contain" loading="lazy" />
        ) : (
          <div className="h-40 w-40 grid place-items-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
      </button>

      {open && url && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div className="flex items-center justify-between p-3 text-white">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
              className="h-10 w-10 grid place-items-center rounded-full bg-white/10 hover:bg-white/20"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="h-10 w-10 grid place-items-center rounded-full bg-white/10 hover:bg-white/20"
                aria-label="Open in new tab"
              >
                <Download className="h-5 w-5" />
              </a>
              {mine && onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Delete this image?")) {
                      onDelete();
                      setOpen(false);
                    }
                  }}
                  className="h-10 w-10 grid place-items-center rounded-full bg-destructive/80 hover:bg-destructive"
                  aria-label="Delete image"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 grid place-items-center p-4" onClick={(e) => e.stopPropagation()}>
            <img src={url} alt="Full size" className="max-h-full max-w-full object-contain rounded-lg" />
          </div>
        </div>
      )}
    </>
  );
}
