import { supabase } from "@/integrations/supabase/client";
import { createUploadTicketFn, deleteImageFn, signImageFn } from "@/lib/community.functions";
import { getGuestAuth } from "@/lib/guest";

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

export async function uploadPostImage(file: File): Promise<string> {
  const blob = await compressImage(file);
  const ticket = await createUploadTicketFn({ data: getGuestAuth() });
  const { error } = await supabase.storage
    .from(BUCKET)
    .uploadToSignedUrl(ticket.path, ticket.token, blob, { contentType: "image/webp" });
  if (error) throw error;
  return ticket.path;
}

export async function deletePostImage(path: string) {
  await deleteImageFn({ data: { ...getGuestAuth(), path } });
}

const urlCache = new Map<string, { url: string; expires: number }>();

export async function signedPostImageUrl(path: string): Promise<string | null> {
  const now = Date.now();
  const cached = urlCache.get(path);
  if (cached && cached.expires > now + 30_000) return cached.url;
  const { url } = await signImageFn({ data: { path } });
  if (!url) return null;
  urlCache.set(path, { url, expires: now + 60 * 60 * 1000 });
  return url;
}
