import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_INPUT_BYTES = 15 * 1024 * 1024; // 15 MB source cap

export function isAcceptedImage(file: File): boolean {
  if (file.size > MAX_INPUT_BYTES) return false;
  return ACCEPTED.includes(file.type.toLowerCase()) || /\.(jpe?g|png|webp)$/i.test(file.name);
}

/** Downscale + JPEG re-encode to keep uploads snappy while preserving readability. */
export async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Compression failed"))), "image/jpeg", quality);
  });
}

export async function uploadChatImage(file: File, uid: string): Promise<string> {
  if (!isAcceptedImage(file)) throw new Error("Unsupported image (use JPG, PNG or WEBP up to 15 MB)");
  const blob = await compressImage(file);
  const path = `${uid}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from("chat-images").upload(path, blob, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function deleteChatImage(path: string) {
  await supabase.storage.from("chat-images").remove([path]);
}

// ── signed URL cache ────────────────────────────────────────────────
const urlCache = new Map<string, { url: string; exp: number }>();
const inflight = new Map<string, Promise<string | null>>();
const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

async function fetchSignedUrl(path: string): Promise<string | null> {
  const now = Date.now();
  const cached = urlCache.get(path);
  if (cached && cached.exp > now + 60_000) return cached.url;
  if (inflight.has(path)) return inflight.get(path)!;
  const p = supabase.storage
    .from("chat-images")
    .createSignedUrl(path, TTL_SECONDS)
    .then(({ data }) => {
      inflight.delete(path);
      if (!data?.signedUrl) return null;
      urlCache.set(path, { url: data.signedUrl, exp: now + (TTL_SECONDS - 60) * 1000 });
      return data.signedUrl;
    });
  inflight.set(path, p);
  return p;
}

export function useSignedImage(path?: string | null) {
  const [url, setUrl] = useState<string | null>(() => (path ? urlCache.get(path)?.url ?? null : null));
  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    fetchSignedUrl(path).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);
  return url;
}
