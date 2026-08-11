const MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

/** Compress a picked/captured photo and return a base64 data URL for the AI. */
export async function fileToCompressedDataUrl(
  file: File,
  maxDim = 1400,
  quality = 0.8
): Promise<string> {
  if (!ALLOWED.includes(file.type)) throw new Error("Only JPG, PNG or WEBP images are supported");
  if (file.size > MAX_BYTES) throw new Error("Image must be under 12 MB");

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
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  if (!dataUrl.startsWith("data:image/")) throw new Error("Could not process image");
  return dataUrl;
}
