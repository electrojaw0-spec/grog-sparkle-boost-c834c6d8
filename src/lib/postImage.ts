import { supabase } from "@/integrations/supabase/client";

const BUCKET = "chat-images";
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<Blob> {
  if (!ALLOWED.includes(file.type)) throw new Error("Only JPG, PNG or WEBP allowed");
  if (file.size > MAX_BYTES) throw new Error("Image must be under 8 MB");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const out: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/webp", quality));
  if (!out) throw new Error("Compression failed");
  return out;
}

export async function uploadPostImage(file: File, userId: string): Promise<string> {
  const blob = await compressImage(file);
  const key = `${userId}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from(BUCKET).upload(key, blob, {
    contentType: "image/webp",
    upsert: false,
  });
  if (error) throw error;
  return key;
}

export async function deletePostImage(path: string) {
  await supabase.storage.from(BUCKET).remove([path]);
}

const urlCache = new Map<string, { url: string; expires: number }>();

export async function signedPostImageUrl(path: string): Promise<string | null> {
  const now = Date.now();
  const cached = urlCache.get(path);
  if (cached && cached.expires > now + 30_000) return cached.url;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (!data?.signedUrl) return null;
  urlCache.set(path, { url: data.signedUrl, expires: now + 60 * 60 * 1000 });
  return data.signedUrl;
}
