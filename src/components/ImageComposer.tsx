import { useRef, useState, useEffect } from "react";
import { Camera, ImageIcon, X, Loader2 } from "lucide-react";
import { isAcceptedImage } from "@/lib/chatImage";

interface Props {
  onPick: (file: File) => void;
  disabled?: boolean;
}

/** Two buttons: Camera (capture) + Gallery (select). Mobile browsers surface the OS picker. */
export function ImageAttachButtons({ onPick, disabled }: Props) {
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);

  const handle = (f?: File | null) => {
    if (!f) return;
    if (!isAcceptedImage(f)) {
      alert("Please choose a JPG, PNG or WEBP image (max 15 MB).");
      return;
    }
    onPick(f);
  };

  return (
    <>
      <input
        ref={camRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          handle(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={galRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          handle(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => camRef.current?.click()}
        aria-label="Take photo"
        className="h-11 w-11 shrink-0 rounded-2xl grid place-items-center bg-secondary hover:bg-secondary/70 disabled:opacity-50"
      >
        <Camera className="h-5 w-5" />
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => galRef.current?.click()}
        aria-label="Attach image from gallery"
        className="h-11 w-11 shrink-0 rounded-2xl grid place-items-center bg-secondary hover:bg-secondary/70 disabled:opacity-50"
      >
        <ImageIcon className="h-5 w-5" />
      </button>
    </>
  );
}

interface PreviewProps {
  file: File;
  onClear: () => void;
  uploading?: boolean;
}

export function ImagePreview({ file, onClear, uploading }: PreviewProps) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  if (!url) return null;
  return (
    <div className="relative inline-block mb-2 rounded-xl overflow-hidden border border-border bg-secondary">
      <img src={url} alt="Preview" className="max-h-40 w-auto object-contain" />
      <button
        type="button"
        onClick={onClear}
        disabled={uploading}
        className="absolute top-1 right-1 h-7 w-7 grid place-items-center rounded-full bg-black/70 text-white hover:bg-black disabled:opacity-50"
        aria-label="Remove image"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
      </button>
    </div>
  );
}
