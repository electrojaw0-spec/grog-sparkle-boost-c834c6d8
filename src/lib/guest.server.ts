import { supabaseAdmin } from "@/integrations/supabase/client.server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: string) {
  return UUID_RE.test(v);
}

export async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Registers a device id + secret if it is unclaimed, otherwise verifies it.
 * Returns true when the caller legitimately owns the device id.
 */
export async function ensureDevice(deviceId: string, secret: string): Promise<boolean> {
  if (!isUuid(deviceId) || secret.length < 20 || secret.length > 200) return false;
  const hash = await sha256(secret);
  const { data } = await supabaseAdmin
    .from("devices")
    .select("id, secret_hash")
    .eq("id", deviceId)
    .maybeSingle();
  if (data) return data.secret_hash === hash;
  const { error } = await supabaseAdmin.from("devices").insert({ id: deviceId, secret_hash: hash });
  if (error) {
    // Race: another request claimed it first — re-check.
    const { data: again } = await supabaseAdmin
      .from("devices")
      .select("secret_hash")
      .eq("id", deviceId)
      .maybeSingle();
    return !!again && again.secret_hash === hash;
  }
  return true;
}

export async function requireDevice(deviceId: string, secret: string): Promise<string> {
  const ok = await ensureDevice(deviceId, secret);
  if (!ok) throw new Error("Unauthorized device");
  return deviceId;
}
