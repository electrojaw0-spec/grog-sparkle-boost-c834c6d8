import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { trialStatus } from "./trial";

export { TRIAL_MS } from "./trial";

// Starts (on first call for a brand-new device) or reads the 30-day free trial.
// Trial start = server-recorded device registration time, so it survives refreshes
// and can't be extended by editing the device clock or saved values.
export const checkTrialFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ deviceId: z.string().min(1).max(64), secret: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { ensureDevice } = await import("./guest.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ok = await ensureDevice(data.deviceId, data.secret);
    if (!ok) return { active: false, untilMs: 0 };
    const { data: row } = await supabaseAdmin
      .from("devices")
      .select("created_at")
      .eq("id", data.deviceId)
      .maybeSingle();
    if (!row) return { active: false, untilMs: 0 };
    return trialStatus(row.created_at, Date.now());
  });
