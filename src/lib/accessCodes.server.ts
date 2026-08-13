import { supabaseAdmin } from "@/integrations/supabase/client.server";

export function requireAdmin(passphrase: string) {
  const expected = process.env["ADMIN_PASSCODE"];
  if (!expected) throw new Error("Admin access is not configured");
  if (!passphrase || passphrase !== expected) throw new Error("Wrong passphrase");
}

export async function redeem(rawCode: string) {
  const code = (rawCode || "").trim().toUpperCase().slice(0, 32);
  if (!code) throw new Error("Invalid code");
  const { data } = await supabaseAdmin
    .from("access_codes")
    .select("id, plan, used")
    .eq("code", code)
    .maybeSingle();
  if (!data) throw new Error("Invalid code");
  if (data.used) throw new Error("This code has already been used");

  const ms = data.plan === "month" ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + ms).toISOString();
  const { error, data: updated } = await supabaseAdmin
    .from("access_codes")
    .update({ used: true, redeemed_at: new Date().toISOString(), expires_at: expiresAt })
    .eq("id", data.id)
    .eq("used", false)
    .select("id");
  if (error || !updated?.length) throw new Error("This code has already been used");
  return { untilMs: Date.now() + ms };
}

function randomCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let s = "SCHO-";
  for (const b of bytes) s += chars[b % chars.length];
  return s;
}

export async function listCodes(pass: string) {
  requireAdmin(pass);
  const { data, error } = await supabaseAdmin
    .from("access_codes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load codes");
  return data ?? [];
}

export async function generateCodes(pass: string, plan: "week" | "month", count: number) {
  requireAdmin(pass);
  const n = Math.max(1, Math.min(100, Math.floor(count || 1)));
  const rows = Array.from({ length: n }, () => ({ code: randomCode(), plan }));
  const { error } = await supabaseAdmin.from("access_codes").insert(rows);
  if (error) throw new Error("Could not generate codes");
  return { count: n };
}

export async function updateCode(
  pass: string,
  id: string,
  action: "deactivate" | "reactivate" | "regenerate",
) {
  requireAdmin(pass);
  const patch =
    action === "deactivate"
      ? { used: true, redeemed_at: new Date().toISOString() }
      : action === "reactivate"
        ? { used: false, redeemed_at: null, expires_at: null }
        : { code: randomCode(), used: false, redeemed_at: null, expires_at: null };
  const { error } = await supabaseAdmin.from("access_codes").update(patch).eq("id", id);
  if (error) throw new Error("Could not update code");
  return { ok: true };
}

export async function deleteCode(pass: string, id: string) {
  requireAdmin(pass);
  const { error } = await supabaseAdmin.from("access_codes").delete().eq("id", id);
  if (error) throw new Error("Could not delete code");
  return { ok: true };
}
