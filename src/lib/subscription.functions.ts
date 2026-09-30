import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Read-only check of a redeemed access code's entitlement. Does not modify codes.
export const checkSubscriptionFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ code: z.string().min(1).max(32) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = data.code.trim().toUpperCase();
    const { data: row } = await supabaseAdmin
      .from("access_codes")
      .select("used, expires_at")
      .eq("code", code)
      .maybeSingle();
    if (!row || !row.used || !row.expires_at) return { valid: false, untilMs: 0 };
    const untilMs = new Date(row.expires_at).getTime();
    return { valid: untilMs > Date.now(), untilMs };
  });
